
import { Type, Schema } from "@google/genai";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import {
  ACTIVE_GEMINI_MODEL,
  ACTIVE_OPENAI_MODEL,
  getGameGenerationOutputTokenLimit,
  getGameGenerationThinkingConfig,
  getGeminiModelPricing,
  getOpenAIModelPricing,
  normalizeAiProvider,
} from "../utils/aiModelConfig.js";
import { createAiRuntime } from "./aiRuntime.js";

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xsefgwhywcuzfnawtyru.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzZWZnd2h5d2N1emZuYXd0eXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MzMxMDEsImV4cCI6MjA4MDEwOTEwMX0._ZxWGsoU-rN8Yuf_v_7zGrivk2GKgb6QHBbT3QgtrCk';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const MAX_EXTRACTED_TEXT_CHARS = 150_000;
const DOCX_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const DOC_MIME_TYPES = new Set([
  'application/msword',
]);
const WORD_MIME_TYPES = new Set([
  ...DOC_MIME_TYPES,
  ...DOCX_MIME_TYPES,
]);
const TEXT_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
  'application/xml',
  'text/xml',
]);
const wordExtractor = new WordExtractor();

const supabaseAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const supabaseAdminClient = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

const normalizeAccountType = (value: unknown): 'free' | 'teacher' | 'school' => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'teacher' || normalized === 'school') return normalized;
  return 'free';
};

const getHeaderValue = (value: unknown): string => {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return typeof value === 'string' ? value.trim() : '';
};

const getBearerToken = (req: any) => {
  const authHeader = getHeaderValue(req.headers.authorization);
  if (!authHeader) return '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return '';
  return token.trim();
};

const getFileMeta = (files: any[] | undefined) =>
  Array.isArray(files)
    ? files.slice(0, 10).map((file: any) => ({
        mimeType: typeof file?.mimeType === 'string' ? file.mimeType : null,
        approxBytes: typeof file?.data === 'string' ? Math.round((file.data.length * 3) / 4) : null
      }))
    : [];

const buildUsageMeta = (body: any) => {
  const action = String(body?.action || '');
  const config = body?.config || {};
  const files = Array.isArray(config?.files) ? config.files : [];
  const baseMeta = {
    hasFiles: files.length > 0,
    fileCount: files.length,
    files: getFileMeta(files)
  };

  if (action === 'game') {
    return {
      ...baseMeta,
      gameType: config?.type || null,
      questionCount: Number.isFinite(Number(config?.questionCount)) ? Number(config.questionCount) : null,
      questionType: config?.questionType || null,
      includeImages: Boolean(config?.includeImages)
    };
  }

  if (action === 'chat_wizard') {
    return {
      historyCount: Array.isArray(body?.history) ? body.history.length : 0,
      messageLength: String(body?.message || '').length
    };
  }

  if (action === 'stop-the-fire-categories') {
    return {
      ...baseMeta,
      gameType: config?.type || null,
      topicLength: String(config?.topic || '').length
    };
  }

  if (action === 'blog_post') {
    return {
      titleLength: String(body?.title || '').length,
      subtitleLength: String(body?.subtitle || '').length
    };
  }

  return baseMeta;
};

const hasAudioFiles = (config: any) =>
  Array.isArray(config?.files) && config.files.some((file: any) => typeof file?.mimeType === 'string' && file.mimeType.startsWith('audio/'));

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const stripGenericWizardWords = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b(game|games|exam|test|assessment|students?|class|classes|help|difficulty|difficulties|struggled|struggle|wrong|mistakes?|review|revise|revision|practice|create|make|set up|setup|quiz)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const hasSpecificLearningContent = (value: string): boolean => {
  const text = String(value || '').toLowerCase();
  if (/\b(uploaded|attached|pasted|questions?|content|paper|worksheet|notes?|text|passage|source material)\b/.test(text)) return true;
  if (/\b(on|about|covering|covered|topic|unit|chapter|lesson)\b.{3,}/.test(text)) return true;
  if (/\b(grammar|vocabulary|phonics|reading|writing|fractions?|algebra|geometry|biology|chemistry|physics|history|geography|literature|poetry|shakespeare|photosynthesis|equations?|tenses?|verbs?|nouns?)\b/.test(text)) return true;
  return stripGenericWizardWords(text).length >= 30;
};

const getUserHistoryText = (history: any[]) =>
  (Array.isArray(history) ? history : [])
    .filter((entry) => entry?.role !== 'ai')
    .map((entry) => String(entry?.text || ''))
    .join('\n');

const getWizardClarification = (message: string, history: any[] = []) => {
  const current = String(message || '').trim();
  const combined = `${getUserHistoryText(history)}\n${current}`.trim();
  const lower = current.toLowerCase();

  const asksForGameHelp = /\b(game|quiz|activity|assistant|recommend|choose|create|make|set up|setup|students?|class|lesson|exam|test|assessment|review|revision|practice|difficulties|struggled|mistakes?)\b/.test(lower);
  if (asksForGameHelp && !hasSpecificLearningContent(combined)) {
    return {
      needsInput: true,
      message: "What content should the game be based on? Tell me the topic, class level, and the exact questions, vocabulary, skills, or mistakes students need to practise."
    };
  }

  return null;
};

const resolveIncomingFileMimeType = (file: any) => {
  const explicit = asText(file?.mimeType);
  if (explicit) return explicit;

  const name = asText(file?.name).toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (name.endsWith('.doc')) return 'application/msword';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.txt')) return 'text/plain';
  if (name.endsWith('.md')) return 'text/markdown';
  if (name.endsWith('.csv')) return 'text/csv';
  if (name.endsWith('.html') || name.endsWith('.htm')) return 'text/html';
  if (name.endsWith('.xml')) return 'application/xml';
  return 'application/octet-stream';
};

const isTextMimeType = (mimeType: string) => TEXT_MIME_TYPES.has(mimeType);

const hasOnlyFallbackMimeType = (mimeType: string) => !mimeType || mimeType === 'application/octet-stream';

const isDocxMimeType = (mimeType: string, fileName?: string) =>
  DOCX_MIME_TYPES.has(mimeType) ||
  (hasOnlyFallbackMimeType(mimeType) && (fileName || '').toLowerCase().endsWith('.docx'));

const isLegacyWordMimeType = (mimeType: string, fileName?: string) =>
  DOC_MIME_TYPES.has(mimeType) ||
  (hasOnlyFallbackMimeType(mimeType) && (fileName || '').toLowerCase().endsWith('.doc'));

const isWordMimeType = (mimeType: string, fileName?: string) =>
  WORD_MIME_TYPES.has(mimeType) ||
  isDocxMimeType(mimeType, fileName) ||
  isLegacyWordMimeType(mimeType, fileName);

const decodeBase64ToBuffer = (data: string) => Buffer.from(data, 'base64');

const trimExtractedText = (value: string) => {
  const cleaned = String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return cleaned.length > MAX_EXTRACTED_TEXT_CHARS
    ? `${cleaned.slice(0, MAX_EXTRACTED_TEXT_CHARS).trim()}\n\n[Truncated]`
    : cleaned;
};

const extractTextFromSourceFile = async (file: any): Promise<string | null> => {
  const mimeType = resolveIncomingFileMimeType(file);
  const data = asText(file?.data);
  const fileName = asText(file?.name) || 'document';
  if (!data) return null;

  const buffer = decodeBase64ToBuffer(data);

  if (isDocxMimeType(mimeType, fileName)) {
    const extracted = await mammoth.extractRawText({ buffer });
    const text = trimExtractedText(extracted?.value || '');
    return text || null;
  }

  if (isLegacyWordMimeType(mimeType, fileName)) {
    const extracted = await wordExtractor.extract(buffer);
    const segments = [
      extracted.getHeaders?.({ includeFooters: false }) || '',
      extracted.getBody?.() || '',
      extracted.getFootnotes?.() || '',
      extracted.getEndnotes?.() || '',
      extracted.getFooters?.() || '',
      extracted.getTextboxes?.({ includeBody: true, includeHeadersAndFooters: true }) || '',
    ]
      .map((segment) => trimExtractedText(segment))
      .filter(Boolean);

    return segments.length ? trimExtractedText(segments.join('\n\n')) : null;
  }

  if (isTextMimeType(mimeType)) {
    return trimExtractedText(buffer.toString('utf8'));
  }

  return null;
};

const buildSourceFileParts = async (files: any[] | undefined) => {
  if (!Array.isArray(files) || !files.length) return [];

  const parts: any[] = [];

  for (const file of files) {
    const mimeType = resolveIncomingFileMimeType(file);
    const name = asText(file?.name) || 'document';
    const data = asText(file?.data);
    const isWordSource = isWordMimeType(mimeType, name);
    if (!data) continue;

    if (mimeType.startsWith('image/') || mimeType.startsWith('audio/') || mimeType === 'application/pdf') {
      parts.push({
        inlineData: {
          mimeType,
          data,
        },
        _fileName: name,
      });
      continue;
    }

    try {
      const extractedText = await extractTextFromSourceFile({ ...file, mimeType, name, data });
      if (extractedText) {
        parts.push({
          text: `Source document: ${name}\n\n${extractedText}`,
        });
        continue;
      }
    } catch (error) {
      if (isWordSource) {
        console.error(`Failed to extract text from Word source file "${name}".`, error);
        throw new Error(`The Word document "${name}" could not be read for AI context. Please save it as a standard .docx or PDF and try again.`);
      }
      console.warn(`Failed to extract text from source file "${name}", falling back to binary prompt part.`, error);
    }

    if (isWordSource) {
      throw new Error(`The Word document "${name}" did not contain readable text for AI context. Please save it as a standard .docx or PDF and try again.`);
    }

    parts.push({
      inlineData: {
        mimeType,
        data,
      },
      _fileName: name,
    });
  }

  return parts;
};

const SOURCE_MATERIAL_STYLE_RULES = `
When source files are provided, use them only as background knowledge.
Do NOT write phrases like "according to the text", "according to the notes", "the document states", "the passage says", "the provided material", or similar.
Do NOT mention attached files, notes, documents, passages, or source material in the student-facing output unless the user explicitly asked for that.
Write all questions, prompts, and explanations as standalone classroom content.
`;

const countTokensSafe = async (ai: { countTokens: (contents: any) => Promise<number> }, contents: any) => {
  try {
    return await ai.countTokens(contents);
  } catch (error) {
    console.error('Count tokens failed:', error);
    return 0;
  }
};

const estimateCostUsd = ({
  model,
  promptTokens,
  outputTokens,
  thoughtsTokens,
  cachedInputTokens,
  cacheWriteTokens,
  hasAudioInput
}: {
  model: string;
  promptTokens: number;
  outputTokens: number;
  thoughtsTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  hasAudioInput: boolean;
}) => {
  if (model.startsWith('gpt-')) {
    const pricing = getOpenAIModelPricing(model);
    const largePrompt = promptTokens > pricing.largePromptThreshold;
    const inputRate = largePrompt ? pricing.inputLarge : pricing.inputStandard;
    const cachedInputRate = largePrompt ? pricing.cachedInputLarge : pricing.cachedInputStandard;
    const cacheWriteRate = largePrompt ? pricing.cacheWriteLarge : pricing.cacheWriteStandard;
    const outputRate = largePrompt ? pricing.outputLarge : pricing.outputStandard;
    const uncachedInputTokens = Math.max(0, promptTokens - cachedInputTokens);
    return Number((
      (uncachedInputTokens / 1_000_000) * inputRate +
      (cachedInputTokens / 1_000_000) * cachedInputRate +
      (cacheWriteTokens / 1_000_000) * cacheWriteRate +
      ((outputTokens + thoughtsTokens) / 1_000_000) * outputRate
    ).toFixed(6));
  }

  const pricing = getGeminiModelPricing(model);
  const largePrompt = pricing.largePromptThreshold !== null && promptTokens > pricing.largePromptThreshold;
  const inputRate = hasAudioInput
    ? largePrompt
      ? pricing.audioInputLarge
      : pricing.audioInputStandard
    : largePrompt
      ? pricing.inputLarge
      : pricing.inputStandard;
  const outputRate = largePrompt ? pricing.outputLarge : pricing.outputStandard;
  const billableOutputTokens = outputTokens + thoughtsTokens;

  return Number(
    (
      (promptTokens / 1_000_000) * inputRate +
      (billableOutputTokens / 1_000_000) * outputRate
    ).toFixed(6)
  );
};

const buildUsageSnapshot = async ({
  ai,
  model,
  contents,
  response,
  config
}: {
  ai: { countTokens: (contents: any) => Promise<number> };
  model: string;
  contents: any;
  response: any;
  config?: any;
}) => {
  const usage = response?.usageMetadata;
  const responseText = typeof response?.text === 'string' ? response.text : '';
  const promptTokens = Number.isFinite(usage?.promptTokenCount)
    ? Number(usage.promptTokenCount)
    : await countTokensSafe(ai, contents);
  const outputTokens = Number.isFinite(usage?.candidatesTokenCount)
    ? Number(usage.candidatesTokenCount)
    : responseText
      ? await countTokensSafe(ai, responseText)
      : 0;
  const thoughtsTokens = Number.isFinite(usage?.thoughtsTokenCount) ? Number(usage.thoughtsTokenCount) : 0;
  const cachedInputTokens = Number.isFinite(usage?.cachedContentTokenCount) ? Number(usage.cachedContentTokenCount) : 0;
  const cacheWriteTokens = Number.isFinite(usage?.cacheWriteTokenCount) ? Number(usage.cacheWriteTokenCount) : 0;
  const totalTokens = Number.isFinite(usage?.totalTokenCount)
    ? Number(usage.totalTokenCount)
    : promptTokens + outputTokens + thoughtsTokens;

  return {
    model,
    promptTokens,
    outputTokens,
    thoughtsTokens,
    cachedInputTokens,
    cacheWriteTokens,
    totalTokens,
    estimatedCostUsd: estimateCostUsd({
      model,
      promptTokens,
      outputTokens,
      thoughtsTokens,
      cachedInputTokens,
      cacheWriteTokens,
      hasAudioInput: hasAudioFiles(config)
    }),
    responseId: typeof response?.responseId === 'string' ? response.responseId : null,
    modelVersion: typeof response?.modelVersion === 'string' ? response.modelVersion : null
  };
};

const authenticateRequestUser = async (req: any) => {
  const token = getBearerToken(req);
  if (!token) return null;

  const { data, error } = await supabaseAuthClient.auth.getUser(token);
  if (error || !data?.user) {
    console.error('Supabase auth failed:', error);
    return null;
  }

  return data.user;
};

const resolveAccountTypeForUser = async (user: any): Promise<'free' | 'teacher' | 'school'> => {
  const metadataType = normalizeAccountType(user?.user_metadata?.account_type);
  if (metadataType !== 'free') return metadataType;
  if (!supabaseAdminClient || !user?.id) return metadataType;

  let data: { account_type?: unknown } | null = null;
  try {
    const response = await supabaseAdminClient
      .from('profiles')
      .select('account_type')
      .eq('id', user.id)
      .maybeSingle();
    data = (response?.data as { account_type?: unknown } | null) || null;
  } catch {
    data = null;
  }

  return normalizeAccountType((data as any)?.account_type);
};

const recordUsageEvent = async (payload: Record<string, any>) => {
  if (!supabaseAdminClient) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY is missing. Skipping usage log insert.');
    return { status: 'skipped', reason: 'missing_service_role_key' } as const;
  }

  const { error } = await supabaseAdminClient.from('generation_usage').insert(payload);
  if (error) {
    console.error('Failed to insert generation usage log:', error);
    return { status: 'error', reason: error.code || 'insert_failed' } as const;
  }

  console.info('Generation usage log written.', {
    provider: payload?.meta?.aiProvider || null,
    model: payload?.model || null,
    clientEnv: payload?.client_env || null,
  });
  return { status: 'written', reason: '' } as const;
};

// Helper to clean JSON
const cleanJson = (text: string): string => {
  if (!text) return "{}";
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
  const firstOpen = cleaned.indexOf('{');
  const lastClose = cleaned.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose !== -1) {
    cleaned = cleaned.substring(firstOpen, lastClose + 1);
  }
  return cleaned.trim();
};

const stripOptionPrefix = (value: string) => (value || '').replace(/^[A-D]\)\s*/i, '').trim();
const normalizeOption = (value: string) => stripOptionPrefix(value).toLowerCase();
const normalizeOptionWithoutArticle = (value: string) => normalizeOption(value).replace(/^(a|an|the)\s+/i, '');
const QUESTION_TYPES_WITH_MCQ = new Set(['multiple-choice', 'mixed', 'ai-decide']);

const normalizeGameMcOptionCount = (value: any): 2 | 3 | 4 => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 4;
  return Math.min(4, Math.max(2, Math.round(parsed))) as 2 | 3 | 4;
};

const resolveGameMcOptionStrategy = (config: any): 'fixed' | 'vary' => {
  if (config?.type === 'Millionaire Maker') return 'fixed';
  if (config?.mcOptionStrategy === 'fixed' || config?.mcOptionStrategy === 'vary') {
    return config.mcOptionStrategy;
  }
  return config?.questionType === 'multiple-choice' ? 'fixed' : 'vary';
};

type GameMcOptionPolicy =
  | { mode: 'fixed'; count: 2 | 3 | 4 }
  | { mode: 'vary' };

const getGameMcOptionPolicy = (config: any): GameMcOptionPolicy | null => {
  if (config?.type === 'Millionaire Maker') {
    return { mode: 'fixed', count: 4 };
  }
  if (!QUESTION_TYPES_WITH_MCQ.has(String(config?.questionType || ''))) {
    return null;
  }
  return resolveGameMcOptionStrategy(config) === 'fixed'
    ? { mode: 'fixed', count: normalizeGameMcOptionCount(config?.mcOptionCount) }
    : { mode: 'vary' };
};

const applyToGameQuestions = (data: any, apply: (question: any) => void) => {
  if (!data) return;

  const visit = (questions?: any[]) => {
    if (!Array.isArray(questions)) return;
    questions.forEach(apply);
  };

  visit(data.questions);
  if (Array.isArray(data.pubQuizRounds)) {
    data.pubQuizRounds.forEach((round: any) => visit(round?.questions));
  }
  if (Array.isArray(data.jeopardyBoard)) {
    data.jeopardyBoard.forEach((category: any) => visit(category?.questions));
  }
};

const enforceAnswerMatchesOptions = (question: any) => {
  if (!question || typeof question.answer !== 'string' || !Array.isArray(question.options)) return;
  const options = question.options.filter((opt: any) => typeof opt === 'string');
  if (options.length === 0) return;
  if (options.includes(question.answer)) return;

  const normalizedAnswer = normalizeOption(question.answer);
  const normalizedArticleAnswer = normalizeOptionWithoutArticle(question.answer);

  const directMatch = options.find((opt: string) => normalizeOption(opt) === normalizedAnswer);
  if (directMatch) {
    question.answer = directMatch;
    return;
  }

  const articleMatches = options.filter((opt: string) => normalizeOptionWithoutArticle(opt) === normalizedArticleAnswer);
  if (articleMatches.length === 1) {
    question.answer = articleMatches[0];
  }
};

const enforceGameAnswerMatchesOptions = (data: any) => {
  applyToGameQuestions(data, enforceAnswerMatchesOptions);
};

const enforceQuestionOptionCount = (question: any, targetCount: number) => {
  if (!question || !Array.isArray(question.options)) return;

  const options = question.options
    .map((opt: any) => String(opt || '').trim())
    .filter(Boolean);

  if (options.length <= targetCount) {
    question.options = options;
    return;
  }

  const answer = String(question.answer || '').trim();
  const answerIndex = options.findIndex(
    (opt: string) =>
      opt === answer ||
      normalizeOption(opt) === normalizeOption(answer) ||
      normalizeOptionWithoutArticle(opt) === normalizeOptionWithoutArticle(answer)
  );

  if (answerIndex === -1 || answerIndex < targetCount) {
    question.options = options.slice(0, targetCount);
    return;
  }

  const trimmed = options.filter((_: string, index: number) => index !== answerIndex).slice(0, targetCount - 1);
  trimmed.push(options[answerIndex]);
  question.options = trimmed;
};

const enforceGameOptionCounts = (data: any, config: any) => {
  const policy = getGameMcOptionPolicy(config);
  if (!policy) return;

  const maxCount = policy.mode === 'fixed' ? policy.count : 4;
  applyToGameQuestions(data, (question: any) => enforceQuestionOptionCount(question, maxCount));
};

const getQuestionAnswerIndex = (question: any): number => {
  if (!question || !Array.isArray(question.options)) return -1;

  const options = question.options
    .map((opt: any) => String(opt || '').trim())
    .filter(Boolean);
  const answer = String(question.answer || '').trim();
  if (!answer || options.length < 2) return -1;

  return options.findIndex(
    (opt: string) =>
      opt === answer ||
      normalizeOption(opt) === normalizeOption(answer) ||
      normalizeOptionWithoutArticle(opt) === normalizeOptionWithoutArticle(answer)
  );
};

const moveCorrectOptionToIndex = (question: any, targetIndex: number) => {
  if (!question || !Array.isArray(question.options)) return;

  const options = question.options
    .map((opt: any) => String(opt || '').trim())
    .filter(Boolean);
  const answerIndex = getQuestionAnswerIndex({ ...question, options });

  if (
    answerIndex === -1 ||
    targetIndex < 0 ||
    targetIndex >= options.length ||
    answerIndex === targetIndex
  ) {
    question.options = options;
    return;
  }

  const answerOption = options[answerIndex];
  const distractors = options.filter((_: string, index: number) => index !== answerIndex);
  question.options = [
    ...distractors.slice(0, targetIndex),
    answerOption,
    ...distractors.slice(targetIndex),
  ];
  question.answer = answerOption;
};

const rebalanceQuestionAnswerPositions = (questions: any[]) => {
  const byOptionCount = new Map<number, Array<{ question: any; answerIndex: number }>>();

  (questions || []).forEach((question: any) => {
    const optionCount = Array.isArray(question?.options) ? question.options.length : 0;
    const answerIndex = getQuestionAnswerIndex(question);
    if (optionCount < 2 || optionCount > 4 || answerIndex < 0 || answerIndex >= optionCount) return;

    const existing = byOptionCount.get(optionCount) || [];
    existing.push({ question, answerIndex });
    byOptionCount.set(optionCount, existing);
  });

  byOptionCount.forEach((entries, optionCount) => {
    if (entries.length <= 1) return;

    const baseTarget = Math.floor(entries.length / optionCount);
    const targetCounts = Array(optionCount).fill(baseTarget);
    const currentCounts = Array(optionCount).fill(0);
    entries.forEach(({ answerIndex }) => {
      currentCounts[answerIndex] += 1;
    });

    const remainder = entries.length - (baseTarget * optionCount);
    const remainderOrder = Array.from({ length: optionCount }, (_, index) => index).sort((a, b) => {
      if (currentCounts[a] !== currentCounts[b]) return currentCounts[a] - currentCounts[b];
      return a - b;
    });
    for (let index = 0; index < remainder; index += 1) {
      targetCounts[remainderOrder[index % optionCount]] += 1;
    }

    const assignments = new Map<any, number>();
    for (let position = 0; position < optionCount; position += 1) {
      const inPlace = entries.filter((entry) => entry.answerIndex === position);
      const keepCount = Math.min(targetCounts[position], inPlace.length);
      for (let index = 0; index < keepCount; index += 1) {
        assignments.set(inPlace[index].question, position);
      }
      targetCounts[position] -= keepCount;
    }

    const remainingTargets: number[] = [];
    targetCounts.forEach((count, position) => {
      for (let index = 0; index < count; index += 1) {
        remainingTargets.push(position);
      }
    });

    entries.forEach((entry) => {
      if (assignments.has(entry.question)) return;
      let bestTargetIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      remainingTargets.forEach((position, index) => {
        const distance = Math.abs(position - entry.answerIndex);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestTargetIndex = index;
        }
      });

      const [targetPosition] = remainingTargets.splice(bestTargetIndex, 1);
      if (typeof targetPosition === 'number') {
        assignments.set(entry.question, targetPosition);
      }
    });

    entries.forEach(({ question }) => {
      const targetPosition = assignments.get(question);
      if (typeof targetPosition === 'number') {
        moveCorrectOptionToIndex(question, targetPosition);
      }
    });
  });
};

const rebalanceGameAnswerPositions = (data: any, config: any) => {
  if (!getGameMcOptionPolicy(config)) return;

  const questions: any[] = [];
  applyToGameQuestions(data, (question: any) => {
    questions.push(question);
  });
  rebalanceQuestionAnswerPositions(questions);
};

const getGameQuestionTypeInstruction = (config: any, aiDecideLabel: string) => {
  if (config?.questionType === 'ai-decide') {
    return aiDecideLabel;
  }
  return config?.questionType;
};

const getGameMcInstruction = (config: any) => {
  const policy = getGameMcOptionPolicy(config);
  if (!policy) return '';

  if (policy.mode === 'fixed') {
    return config?.questionType === 'multiple-choice'
      ? ` Each multiple choice question must have exactly ${policy.count} options.`
      : ` If you include multiple choice questions, each one must have exactly ${policy.count} options.`;
  }

  return config?.questionType === 'multiple-choice'
    ? ' Vary the number of options between 2, 3, and 4 across the questions based on what suits each question best. Do not default to 4 options.'
    : ' If you include multiple choice questions, vary the number of options between 2, 3, and 4 based on what suits each question best. Do not default to 4 options.';
};

const WORD_WHEEL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const WORD_WHEEL_CONTAINS_HARD = new Set(['Q', 'V', 'X', 'Y', 'Z']);

type WordWheelLetterRule = 'starts-with' | 'contains-hard';

const normalizeWordWheelAnswer = (value: any) =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');

const answerMatchesWordWheelRule = (
  answer: string,
  letter: string,
  rule: WordWheelLetterRule
) => {
  const cleanAnswer = normalizeWordWheelAnswer(answer);
  if (!cleanAnswer || !letter) return false;
  if (rule === 'contains-hard' && WORD_WHEEL_CONTAINS_HARD.has(letter)) {
    return cleanAnswer.includes(letter);
  }
  return cleanAnswer.startsWith(letter);
};

const normalizeWordWheelQuestions = (
  rawQuestions: any[],
  rule: WordWheelLetterRule = 'contains-hard'
) => {
  const byLetter = new Map<string, any>();

  const normalizeLetter = (value: any) => {
    const text = String(value || '').toUpperCase();
    return text.replace(/[^A-Z]/g, '').slice(0, 1);
  };

  const normalizeAliases = (aliases: any, answer: string) => {
    if (!Array.isArray(aliases)) return [];
    const answerNorm = answer.trim().toLowerCase();
    const unique = new Set<string>();
    for (const alias of aliases) {
      const value = String(alias || '').trim();
      if (!value) continue;
      if (value.toLowerCase() === answerNorm) continue;
      unique.add(value);
      if (unique.size >= 8) break;
    }
    return Array.from(unique);
  };

  (rawQuestions || []).forEach((q: any, index: number) => {
    if (!q) return;
    const answer = String(q.answer || '').trim();
    const fallbackLetter = normalizeLetter(answer);
    const letter = normalizeLetter(q.letter) || WORD_WHEEL_LETTERS[index] || fallbackLetter || '';
    if (!WORD_WHEEL_LETTERS.includes(letter)) return;
    if (byLetter.has(letter)) return;

    const answerFitsRule = answerMatchesWordWheelRule(answer, letter, rule);

    byLetter.set(letter, {
      id: typeof q.id === 'number' ? q.id : index,
      letter,
      question: answerFitsRule ? String(q.question || '').trim() : '',
      answer: answerFitsRule ? answer : '',
      answerAliases: answerFitsRule ? normalizeAliases(q.answerAliases, answer) : [],
      points: Number.isFinite(q.points) && Number(q.points) > 0 ? Number(q.points) : 10,
      isBonus: false,
      imageKeywords: Array.isArray(q.imageKeywords)
        ? q.imageKeywords.map((entry: any) => String(entry || '').trim()).filter(Boolean).slice(0, 6)
        : undefined,
      visualSearch: normalizeVisualSearch(q.visualSearch),
    });
  });

  return WORD_WHEEL_LETTERS.map((letter, index) => {
    const existing = byLetter.get(letter);
    if (existing) return { ...existing, id: index, letter };
    return {
      id: index,
      letter,
      question: '',
      answer: '',
      answerAliases: [],
      points: 10,
      isBonus: false
    };
  });
};

const normalizeVisualSearch = (value: any) => {
  if (!value || typeof value !== 'object') return undefined;
  const primaryQuery = String(value.primaryQuery || value.searchQuery || '').trim();
  const backupQuery = String(value.backupQuery || value.fallbackQuery || '').trim();
  const avoidTerms = Array.isArray(value.avoidTerms)
    ? value.avoidTerms.map((entry: any) => String(entry || '').trim()).filter(Boolean).slice(0, 8)
    : [];
  const answerRevealRisk = ['low', 'medium', 'high'].includes(String(value.answerRevealRisk || '').toLowerCase())
    ? String(value.answerRevealRisk).toLowerCase()
    : undefined;
  const imageIntent = String(value.imageIntent || '').trim();
  if (!primaryQuery && !backupQuery && !avoidTerms.length && !answerRevealRisk && !imageIntent) return undefined;
  return {
    ...(primaryQuery ? { primaryQuery } : {}),
    ...(backupQuery ? { backupQuery } : {}),
    ...(avoidTerms.length ? { avoidTerms } : {}),
    ...(answerRevealRisk ? { answerRevealRisk } : {}),
    ...(imageIntent ? { imageIntent } : {}),
  };
};

const normalizeBlockBeatersQuestions = (
  rawQuestions: any[],
  mode: 'letters' | 'numbers' = 'letters'
) => {
  const normalizeLetter = (value: any) =>
    String(value || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1);
  const isSingleLetterOnly = (value: any) =>
    /^[A-Z]$/i.test(String(value || '').trim());
  const normalizeAliases = (aliases: any) =>
    Array.isArray(aliases)
      ? aliases.map((value: any) => String(value || '').trim()).filter(Boolean).slice(0, 8)
      : [];
  const normalizeLabel = (value: string) =>
    value.trim().replace(/\s+/g, ' ').replace(/^./, (char) => char.toUpperCase());
  const formatLetterClue = (question: string, answer: string, letter: string) => {
    const clean = String(question || '')
      .trim()
      .replace(/\s+/g, ' ');
    if (!letter || !clean) return clean;
    const prefix = `Starts with ${letter}:`;
    const capitalize = (value: string) => value.replace(/^./, (char) => char.toUpperCase());
    const withPrefix = (value: string) => `${prefix} ${capitalize(value.trim())}`.trim();
    const existingStartsWith = clean.match(/^starts\s+with\s+[A-Z]\s*:\s*(.+)$/i);
    if (existingStartsWith) return withPrefix(existingStartsWith[1]);

    const leadingLabelMatch = clean.match(/^([A-Z][\w\s&/-]{1,40}):\s+(.+)$/i);
    if (leadingLabelMatch && !/^starts\s+with\b/i.test(leadingLabelMatch[1])) {
      return `${normalizeLabel(leadingLabelMatch[1])}: ${formatLetterClue(leadingLabelMatch[2], answer, letter)}`;
    }

    const embeddedLabelMatch = clean.match(new RegExp(`^what\\s+${letter}\\s+is\\s+([A-Z][\\w\\s&/-]{1,40}):\\s+(.+)$`, 'i'));
    if (embeddedLabelMatch) {
      return `${normalizeLabel(embeddedLabelMatch[1])}: ${formatLetterClue(embeddedLabelMatch[2], answer, letter)}`;
    }

    const oldClueMatch = clean.match(new RegExp(`^what\\s+${letter}\\s+is\\s+(?:the answer to this clue:\\s*)?(.+)$`, 'i'));
    if (oldClueMatch && /^(who|what|which|how|where|when|why)\b/i.test(oldClueMatch[1])) {
      return withPrefix(oldClueMatch[1]);
    }

    return withPrefix(clean);
  };

  return (rawQuestions || []).map((q: any, index: number) => {
    const answer = String(q?.answer || '').trim();
    const question = String(q?.question || '').trim();
    const answerLetter = normalizeLetter(answer);
    const savedLetter = normalizeLetter(q?.letter);
    const invalidLetterAnswer = mode === 'letters' && (
      !answerLetter ||
      !question ||
      isSingleLetterOnly(answer) ||
      isSingleLetterOnly(question)
    );
    const letter = mode === 'letters'
      ? (answerLetter || savedLetter || WORD_WHEEL_LETTERS[index % WORD_WHEEL_LETTERS.length])
      : undefined;

    if (invalidLetterAnswer) return null;

    return {
      ...q,
      id: index,
      letter,
      question: mode === 'letters' ? formatLetterClue(question, answer, letter || answerLetter) : question,
      answer,
      points: 10,
      isBonus: false,
      options: mode === 'letters' ? undefined : q?.options,
      answerAliases: normalizeAliases(q?.answerAliases),
      visualSearch: normalizeVisualSearch(q?.visualSearch),
    };
  }).filter(Boolean).map((question: any, index: number) => ({ ...question, id: index }));
};

export default async function handler(req: any, res: any) {
  // 1. Handle CORS manually for Vercel Node Functions
  // Allow requests from any Vercel preview URL or production domain
  const origin = req.headers.origin || '*';
  const requestStartedAt = Date.now();
  let clientEnv = getHeaderValue(req.headers['x-client-env']) || null;
  let requestBody: any = req.body || {};
  let requestAction = String(requestBody?.action || '');
  let authenticatedUser: any = null;
  let resolvedAccountType: 'free' | 'teacher' | 'school' = 'free';
  let usageSnapshot: any = null;
  let usageLogged = false;
  let usageLogResult: { status: 'written' | 'skipped' | 'error'; reason: string } | null = null;
  const selectedProvider = normalizeAiProvider(process.env.AI_PROVIDER);
  const selectedModel = selectedProvider === 'openai'
    ? String(process.env.OPENAI_MODEL || ACTIVE_OPENAI_MODEL)
    : String(process.env.GEMINI_MODEL || ACTIVE_GEMINI_MODEL);
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Client-Env'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const finalizeUsage = async (status: 'success' | 'error', errorMessage?: string) => {
    if (usageLogged || !usageSnapshot || !authenticatedUser || !requestAction) return;
    usageLogged = true;

    usageLogResult = await recordUsageEvent({
      user_id: authenticatedUser.id,
      user_email: authenticatedUser.email || null,
      action: requestAction,
      model: usageSnapshot.model || selectedModel,
      status,
      prompt_tokens: usageSnapshot.promptTokens || 0,
      output_tokens: usageSnapshot.outputTokens || 0,
      thoughts_tokens: usageSnapshot.thoughtsTokens || 0,
      total_tokens: usageSnapshot.totalTokens || 0,
      estimated_cost_usd: usageSnapshot.estimatedCostUsd || 0,
      latency_ms: Date.now() - requestStartedAt,
      client_env: clientEnv,
      request_origin: typeof origin === 'string' ? origin : null,
      response_id: usageSnapshot.responseId || null,
      model_version: usageSnapshot.modelVersion || null,
      error_message: errorMessage || null,
      meta: {
        ...buildUsageMeta(requestBody),
        accountType: resolvedAccountType,
        aiProvider: selectedProvider,
        cachedInputTokens: usageSnapshot.cachedInputTokens || 0,
        cacheWriteTokens: usageSnapshot.cacheWriteTokens || 0,
      }
    });
  };

  const sendJson = async (statusCode: number, payload: any) => {
    if (statusCode >= 200 && statusCode < 300) {
      await finalizeUsage('success');
    } else {
      const errorMessage = payload && typeof payload.error === 'string' ? payload.error : undefined;
      await finalizeUsage('error', errorMessage);
    }

    // These contain no credentials or prompt data. They make local provider and
    // usage-log verification possible from the browser Network panel.
    res.setHeader('X-AI-Provider', selectedProvider);
    res.setHeader('X-AI-Model', usageSnapshot?.model || selectedModel);
    res.setHeader('X-Generation-Usage-Log', usageLogResult?.status || 'not-attempted');
    if (usageLogResult?.reason) {
      res.setHeader('X-Generation-Usage-Reason', usageLogResult.reason);
    }

    return res.status(statusCode).json(payload);
  };

  try {
    requestBody = req.body || {};
    requestAction = String(requestBody?.action || '');
    if (typeof requestBody?.clientEnv === 'string' && requestBody.clientEnv.trim()) {
      clientEnv = requestBody.clientEnv.trim();
    }

    authenticatedUser = await authenticateRequestUser(req);
    if (!authenticatedUser) {
      return sendJson(401, { error: 'Please log in to use AI generation.' });
    }
    resolvedAccountType = await resolveAccountTypeForUser(authenticatedUser);
    if (resolvedAccountType === 'free') {
      usageSnapshot = {
        model: selectedModel,
        promptTokens: 0,
        outputTokens: 0,
        thoughtsTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        responseId: null,
        modelVersion: null
      };
      return sendJson(403, {
        error: 'AI generation is included with the Teacher Plan, which is currently free during early access. Activate Teacher Plan to continue.',
        code: 'AI_NOT_INCLUDED_IN_FREE',
        accountType: resolvedAccountType
      });
    }

    // 2. Select the server-side provider. API keys never enter the browser bundle.
    let ai: ReturnType<typeof createAiRuntime>;
    try {
      ai = createAiRuntime({
        provider: selectedProvider,
        action: requestAction,
        userId: authenticatedUser.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The selected AI provider is not configured.';
      console.error('Server AI configuration error:', message);
      return sendJson(500, { error: `Server Configuration Error: ${message}` });
    }

    const mergeUsageSnapshot = (previous: any, next: any) => {
      if (!previous) return { ...next, provider: ai.provider };
      return {
        ...next,
        provider: ai.provider,
        promptTokens: (previous.promptTokens || 0) + (next.promptTokens || 0),
        outputTokens: (previous.outputTokens || 0) + (next.outputTokens || 0),
        thoughtsTokens: (previous.thoughtsTokens || 0) + (next.thoughtsTokens || 0),
        cachedInputTokens: (previous.cachedInputTokens || 0) + (next.cachedInputTokens || 0),
        cacheWriteTokens: (previous.cacheWriteTokens || 0) + (next.cacheWriteTokens || 0),
        totalTokens: (previous.totalTokens || 0) + (next.totalTokens || 0),
        estimatedCostUsd: Number(((previous.estimatedCostUsd || 0) + (next.estimatedCostUsd || 0)).toFixed(6)),
      };
    };

    const generateTrackedContent = async (params: any, usageConfig?: any) => {
      const response = await ai.generateContent(params);
      const nextSnapshot = await buildUsageSnapshot({
        ai,
        model: ai.model,
        contents: params?.contents,
        response,
        config: usageConfig
      });
      usageSnapshot = mergeUsageSnapshot(usageSnapshot, nextSnapshot);
      return response;
    };

    // Vercel parses JSON body automatically for Node functions
    const { action, config, message, history, title, subtitle } = requestBody;

    console.log(`Processing action: ${action}`);

    if (action === 'stop-the-fire-categories') {
      const systemInstruction = `You are an expert classroom game designer.
Create a list of short, attainable categories for a Scattergories-style word game.
Categories must be easy for most people to answer without specialist knowledge.
Avoid niche trivia, advanced academic topics, or obscure references.
If files are provided, base the categories on the material in those files.
${SOURCE_MATERIAL_STYLE_RULES}

CRITICAL JSON RULES:
1. Return ONLY valid JSON.
2. STRICTLY escape all special characters in strings.
3. NO unescaped newlines, tabs, or control characters inside string values.
`;

      const desiredCount = 100;
      let prompt = `
Create exactly ${desiredCount} categories for a classroom word game.
Make them clear, short, and answerable.
If a topic is provided, align the categories to that topic.
Custom instructions: ${config?.customInstructions || "None"}.
Topic: ${config?.topic || "General"}.

Return JSON: { "categories": ["..."] }
`;

      const parts: any[] = await buildSourceFileParts(config?.files);
      if (parts.length > 0) {
        prompt = `IMPORTANT: Use the attached files as background knowledge for the categories. Do not mention the files, notes, text, document, or source material in the category wording.\n\n` + prompt;
      }

      parts.push({ text: prompt });

      const response = await generateTrackedContent({
        model: ai.model,
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              categories: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["categories"]
          }
        }
      }, config);

      const text = response.text;
      if (!text) {
        return sendJson(500, { error: 'No response from AI' });
      }

      const data = JSON.parse(cleanJson(text));
      const categories = Array.isArray(data?.categories)
        ? data.categories
            .map((category: any) => (typeof category === 'string' ? category.trim() : ''))
            .filter(Boolean)
        : [];

      return sendJson(200, { categories });
    }

    // 3. Handle GAME Generation
    if (action === 'game') {
      const isJeopardy = config.type === 'Jeopardy';
      const isPubQuiz = config.type === 'Pub Quiz';
      const isDarts = config.type === 'Darts';
      const isMillionaire = config.type === 'Millionaire Maker';
      const isTimeBomb = config.type === 'Time Bomb';
      const isSurvey = config.type === 'Survey Showdown';
      const isWordWheel = config.type === 'Word Wheel';
      const isBlockBeaters = config.type === 'Block Beaters';
      const isLiveQuiz = config.type === 'Live Quiz Challenge';
      const wordWheelLetterRule = config.wordWheelLetterRule || 'contains-hard';
      const gameTitle = config.title || `My ${config.type} Game`;
      
      const systemInstruction = `You are an expert educational content creator. 
      Create a structured game based on the following parameters.
      
      If the user provides source files (images/PDFs/Word docs), analyze them thoroughly and base ALL questions/content on that material.
      ${SOURCE_MATERIAL_STYLE_RULES}

      IMPORTANT: Questions must have a single, unambiguous correct answer. Avoid prompts where multiple answers could be valid (e.g. vague pronouns, subjective opinions, or fill-in-the-blank with multiple correct options). If a question could plausibly have more than one correct answer, rephrase it to be specific and uniquely answerable.
      CRITICAL: For multiple-choice questions, distribute the correct answer position evenly across the options. Do NOT overuse any single position. Use an equal balance across A/B/C/D (or however many options are used).
      CRITICAL: Only ONE option can be correct. Ensure the question is specific enough that only one option is unambiguously correct (e.g., add context or time reference for grammar questions).
      If a question includes options, the "answer" must EXACTLY match one of the option strings (including articles like "a/an/the", punctuation, and capitalization). Do not paraphrase or drop articles.
      
      CRITICAL JSON RULES:
      1. Return ONLY valid JSON.
      2. STRICTLY escape all special characters in strings. 
      3. NO unescaped newlines, tabs, or control characters inside string values. Use \\n for line breaks.
      
      Ensure questions are appropriate for a classroom setting.
      If images are requested, include imageKeywords as EXACTLY 2 concise visual keywords per question.
      Also include visualSearch for each question: { primaryQuery, backupQuery, avoidTerms, answerRevealRisk, imageIntent }.
      visualSearch.primaryQuery and backupQuery must be short stock-photo searches of 1-3 words.
      Choose visualSearch by asking: "What safe visual scene supports this question without giving away the answer?"
      Prefer indirect, classroom-useful photo subjects over copied question words.
      Examples: for "Who wrote To Kill a Mockingbird?" use primaryQuery "classic novel", backupQuery "books writing", avoidTerms ["Harper Lee", "mockingbird"], answerRevealRisk "high".
      For "What is the longest river in South America?" answer "Amazon River", use primaryQuery "river rainforest", backupQuery "south america river", answerRevealRisk "low".
      answerRevealRisk must be "low", "medium", or "high".
      These keywords are for stock image search (e.g., Pixabay), so prefer concrete visual nouns or proper nouns.
      Make keyword 1 the dominant visual subject (object/place/event). Keyword 2 can be supporting context.
      Ignore game-formatting text such as "Starts with A:" when choosing imageKeywords.
      Do NOT use the exact answer, close synonyms, or wording that makes the answer too obvious.
      Avoid adjectives, verbs, and abstract terms like "education", "concept", "background".
      Avoid weak utility words as standalone keywords, such as "service", "thing", "item", "person".
      Avoid role/action words like "person", "people", "call", "study", "learn" unless they are clearly the visual subject.
      If the direct term is too revealing, choose one level broader while staying relevant.
      If the prompt is generic (e.g., "Choose the correct sentence"), derive keywords from question/topic context, not the answer text.
      `;

      let prompt = '';
      
      // Define base question schema
      const questionSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          question: { type: Type.STRING },
          answer: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          points: { type: Type.INTEGER },
          isBonus: { type: Type.BOOLEAN },
          category: { type: Type.STRING },
          difficulty: { type: Type.STRING },
          bonusType: { type: Type.STRING },
          letter: { type: Type.STRING },
          answerAliases: { type: Type.ARRAY, items: { type: Type.STRING } },
          imageKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          visualSearch: {
            type: Type.OBJECT,
            properties: {
              primaryQuery: { type: Type.STRING },
              backupQuery: { type: Type.STRING },
              avoidTerms: { type: Type.ARRAY, items: { type: Type.STRING } },
              answerRevealRisk: { type: Type.STRING },
              imageIntent: { type: Type.STRING },
            },
          },
          surveyAnswers: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING },
                    score: { type: Type.INTEGER },
                    alts: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["text", "score"]
            }
          }
        },
        required: ["id", "question", "answer", "points"]
      };

      let responseSchema: Schema;

      if (isJeopardy) {
        const rows = config.jeopardyRows || 5;
        const categories = config.jeopardyCategoryNames || ["Cat 1", "Cat 2", "Cat 3", "Cat 4", "Cat 5"];
        const qTypeInstruction = getGameQuestionTypeInstruction(
            config,
            "Mix of question types suitable for the category (some open, some multiple choice, etc)"
        );
        const mcInstruction = getGameMcInstruction(config);

        prompt = `
          Create a Jeopardy game with the title "${gameTitle}".
          The game must have exactly ${categories.length} categories.
          The category names are: ${JSON.stringify(categories)}.
          For EACH category, create exactly ${rows} questions with increasing difficulty (e.g. 100, 200, 300, 400, 500).
          Question Style: ${qTypeInstruction}.${mcInstruction}
          Strict Mode: ${config.strictMode ? "Answers must be phrased as questions (What is...)" : "Standard answers"}.
          Custom Instructions: ${config.customInstructions || "None"}.
        `;
        
        responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                jeopardyBoard: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            questions: { type: Type.ARRAY, items: questionSchema }
                        },
                        required: ["name", "questions"]
                    }
                }
            },
            required: ["title", "jeopardyBoard"]
        };

      } else if (isPubQuiz) {
        const roundCount = config.pubQuizRoundsCount || 3;
        const questionsPerRound = config.pubQuizQuestionsPerRound || 5;
        const roundNames = config.pubQuizRoundNames || ["Round 1", "Round 2", "Round 3"];
        const qTypeInstruction = getGameQuestionTypeInstruction(config, "Varied formats");
        const mcInstruction = getGameMcInstruction(config);

        prompt = `
          Create a Pub Quiz game titled "${gameTitle}".
          The game must have exactly ${roundCount} rounds.
          The round names are: ${JSON.stringify(roundNames)}.
          For EACH round, create exactly ${questionsPerRound} questions.
          Question Style: ${qTypeInstruction}.${mcInstruction}
          Custom Instructions: ${config.customInstructions || "None"}.
        `;

        responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                pubQuizRounds: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            questions: { type: Type.ARRAY, items: questionSchema }
                        },
                        required: ["name", "questions"]
                    }
                }
            },
            required: ["title", "pubQuizRounds"]
        };

      } else if (isMillionaire) {
          prompt = `
          Create a "Who Wants to Be a Millionaire" style game titled "${gameTitle}" about "${config.topic}".
          Generate EXACTLY 15 questions.
          
          CRITICAL STRUCTURE RULES:
          1. SORT questions by difficulty:
             - Questions 1-5: Very Easy (General knowledge / Basic facts)
             - Questions 6-10: Medium (More specific / Application)
             - Questions 11-15: Hard/Expert (Obscure facts / Complex analysis)
          2. EACH question MUST have exactly 4 options.
          3. The 'answer' field must match one of the options exactly.
          
          Custom Instructions: ${config.customInstructions || "None"}.
          `;

          responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                questions: { type: Type.ARRAY, items: questionSchema }
            },
            required: ["title", "questions"]
          };

      } else if (isDarts) {
          const qTypeInstruction = getGameQuestionTypeInstruction(config, "Mixed formats");
          const mcInstruction = getGameMcInstruction(config);
          const requestedCount = (config.questionCount || 15) + 10;
          
          prompt = `
          Create a Darts game titled "${gameTitle}" about "${config.topic}".
          Generate a large pool of ${requestedCount} unique questions.
          CRITICAL: You MUST categorize them by difficulty.
          - 33% labeled 'easy'
          - 33% labeled 'medium'
          - 33% labeled 'hard'
          
          Question Style: ${qTypeInstruction}.${mcInstruction}
          Custom Instructions: ${config.customInstructions || "None"}.
          `;

          responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                questions: { type: Type.ARRAY, items: questionSchema }
            },
            required: ["title", "questions"]
          };

      } else if (isSurvey) {
          prompt = `
          Create a "Family Feud" style game titled "${gameTitle}" about "${config.topic}".
          Generate ${config.questionCount} rounds.
          
          FOR EACH QUESTION:
          1. Provide a "survey style" prompt.
          2. Provide EXACTLY 8 "surveyAnswers".
          3. Each answer must have a "text" and a "score".
          4. Include an "alts" array for fuzzy matching.
          
          Custom Instructions: ${config.customInstructions || "None"}.
          `;

          responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                questions: { type: Type.ARRAY, items: questionSchema }
            },
            required: ["title", "questions"]
          };

      } else if (isWordWheel) {
          const letterRuleInstruction =
              wordWheelLetterRule === 'contains-hard'
                  ? 'For letters Q, V, X, Y, Z: the answer may START with the letter OR CONTAIN it. Prefer CONTAINS only when it still gives a natural, age-appropriate word; STARTS WITH is fully valid. For all other letters: the answer must START with the letter.'
                  : 'For every letter A-Z: the answer must START with the letter.';

          prompt = `
          Create a classroom "Word Wheel" game titled "${gameTitle}" about "${config.topic}".
          Generate EXACTLY 26 clue entries, one for each English letter A-Z.

          CRITICAL RULES:
          1. Include a "letter" field for each entry using a single uppercase letter.
          2. Cover each letter exactly once from A through Z.
          3. "question" must be a concise clue (ideally <= 140 characters).
          4. "answer" must be a single canonical answer and obey this letter rule: ${letterRuleInstruction}
          5. Add "answerAliases" with 0-5 accepted alternatives/spellings where useful.
          6. Use points=10 for every entry.
          7. Do NOT include multiple-choice options for this game.

          Custom Instructions: ${config.customInstructions || "None"}.
          `;

          responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                questions: { type: Type.ARRAY, items: questionSchema }
            },
            required: ["title", "questions"]
          };

      } else if (isBlockBeaters) {
        const blockMode = config.blockBeatersMode || 'letters';
        const qTypeInstruction = blockMode === 'letters'
          ? 'Open-ended typed clues only'
          : getGameQuestionTypeInstruction(config, "Varied formats chosen by AI");
        const mcInstruction = blockMode === 'letters' ? '' : getGameMcInstruction(config);

        prompt = `
          Create a classroom "Block Beaters" game titled "${gameTitle}" about "${config.topic}".
          Generate exactly ${config.questionCount || 48} questions.

          GAME CONTENT MODE: ${blockMode === 'letters' ? 'Letters' : 'Numbers'}.
          Question Style: ${qTypeInstruction}.${mcInstruction}

          CRITICAL RULES:
          1. Use points=10 for every question.
          2. Do not create bonus questions; the board handles bonuses separately.
          3. Questions are drawn from a shared queue during play. Do not try to map questions to specific tile numbers.
          ${blockMode === 'letters' ? `
          4. Include a "letter" field for every question using one uppercase English letter.
          5. The answer must start with that exact letter. Do not assign letters alphabetically unless the answer truly starts with that letter.
          6. Every question must be a normal classroom question prefixed with the starting letter using this exact pattern: "Starts with [LETTER]: [normal question]".
             Good: answer "France", question "Starts with F: What country is Paris the capital of?"
             Good: answer "Neil Armstrong", question "Starts with N: Who was the first person to walk on the moon?"
             Good: answer "Homophone", question "Starts with H: What word sounds the same as another word but has a different meaning and spelling?"
          7. If custom instructions ask for a topic label, put it before the starts-with marker.
             Good: "History: Starts with N: Who was the first person to walk on the moon?"
          8. Do NOT use the old clue format "What [LETTER] is...".
          9. The "letter" field is only a helper marker. Never use the letter itself as the whole question or the whole answer.
          10. Do not use the phrase "the answer" in the question.
          11. NEVER use blanks, underscores, gap-fill wording, missing-word prompts, or sentence-completion prompts.
          12. Add "answerAliases" with 0-4 accepted alternatives/spellings where useful.
          13. Do NOT include multiple-choice options in letters mode.
          14. Spread letters across the alphabet as evenly as possible.
          15. Generate the requested number of questions exactly.
          16. Do not use numeric-only answers, dates, or answers that start with a digit. Rewrite those questions so the correct answer is a word beginning with the assigned letter.` : `
          4. Do not include a "letter" requirement.
          5. Multiple-choice questions must have one correct answer and the answer must exactly match one option.
          6. Keep questions short enough for a projected game card.`}

          Custom Instructions: ${config.customInstructions || "None"}.
        `;

        responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                questions: { type: Type.ARRAY, items: questionSchema }
            },
            required: ["title", "questions"]
        };

      } else {
        // Standard Game
        const qTypeInstruction = isLiveQuiz
          ? 'Multiple Choice only'
          : getGameQuestionTypeInstruction(config, "Varied formats chosen by AI");
        const mcInstruction = isLiveQuiz
          ? ' Each question must have exactly 4 concise options. The answer must exactly match one option.'
          : getGameMcInstruction(config);
        
        // Points Logic
        let pointsInstruction = "Assign 100 points to every question.";
        if (config.pointsMode === 'ai-random') {
            pointsInstruction = "Assign random point values between 5, 10, 15, 20, 25, 30, 35, 40, 45, 50 based on the difficulty of the question.";
        }

        prompt = `
          Create a ${config.type} game titled "${gameTitle}" about "${config.topic}".
          Number of questions: ${config.questionCount}.
          Question Type: ${qTypeInstruction}.${mcInstruction}
          Points Strategy: ${pointsInstruction}.
          Includes Bonus Questions: false.
          Custom Instructions: ${config.customInstructions || "None"}.
        `;
        
        if (isTimeBomb) {
            prompt += `
            STYLE: Generate questions that are short, snappy, and suitable for rapid-fire answers.
            Avoid long reading passages.
            `;
        }

        if (isLiveQuiz) {
            prompt += `
            LIVE QUIZ RULES:
            1. Every question must be short enough for a projected classroom screen.
            2. Every question must include exactly 4 answer options.
            3. Only one option can be correct.
            4. Set points to 1000 for every question.
            5. Avoid open-ended, gap-fill, subjective, or multi-answer prompts.
            `;
        }

        responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                questions: { type: Type.ARRAY, items: questionSchema }
            },
            required: ["title", "questions"]
        };
      }

      if (config.includeImages) {
        prompt += `
          IMPORTANT: Include imageKeywords as EXACTLY 2 concise visual keywords for EACH question.
          IMPORTANT: Also include visualSearch for EACH question with primaryQuery, backupQuery, avoidTerms, answerRevealRisk, and imageIntent.
          visualSearch.primaryQuery and backupQuery must be short 1-3 word stock-photo searches. They should describe a useful image scene, not merely repeat words from the question.
          Use indirect safe clues when the answer would be revealed by the image. Use answerRevealRisk "low", "medium", or "high".
          Example: "Who wrote To Kill a Mockingbird?" -> primaryQuery "classic novel", backupQuery "books writing", avoidTerms ["Harper Lee", "mockingbird"], answerRevealRisk "high".
          CRITICAL: Keywords must NOT be the exact answer, close synonyms, or reveal the answer too directly.
          Use stock-search-friendly concrete visual nouns/proper nouns, not adjectives/verbs.
          Make keyword 1 the dominant visual subject (object/place/event). Keyword 2 can be context.
          Ignore game-formatting text such as "Starts with A:" when choosing imageKeywords.
          Avoid weak utility words as standalone keywords, such as "service", "thing", "item", "person".
          Avoid role/action words like "person", "people", "call", "study", "learn" unless truly visual.
          Avoid abstract tags (e.g., "education", "concept", "background").
          If a direct keyword is too revealing, pick a broader but still relevant visual keyword.
          For generic prompts (e.g., "Choose the correct sentence"), derive keywords from question/topic context, not the answer text.
        `;
      }

      // Handle Files
      const parts: any[] = await buildSourceFileParts(config.files);
      if (parts.length > 0) {
          prompt = `IMPORTANT: Use the attached files as background knowledge for the game content. Do not mention the files, notes, document, passage, text, or source material in the wording of questions, answers, clues, or explanations unless the user explicitly asked for that style.\n\n` + prompt;
      }
      parts.push({ text: prompt });

      const expectedQuestionCount = isJeopardy
        ? (config.jeopardyCategories || 5) * (config.jeopardyRows || 5)
        : isPubQuiz
          ? (config.pubQuizRoundsCount || 3) * (config.pubQuizQuestionsPerRound || 5)
          : isMillionaire
            ? 15
            : isDarts
              ? (config.questionCount || 15) + 10
              : isWordWheel
                ? 26
                : Number(config.questionCount || 0);
      const countGeneratedQuestions = (value: any) => {
        if (Array.isArray(value?.questions)) return value.questions.length;
        if (Array.isArray(value?.jeopardyBoard)) {
          return value.jeopardyBoard.reduce(
            (sum: number, category: any) => sum + (Array.isArray(category?.questions) ? category.questions.length : 0),
            0
          );
        }
        if (Array.isArray(value?.pubQuizRounds)) {
          return value.pubQuizRounds.reduce(
            (sum: number, round: any) => sum + (Array.isArray(round?.questions) ? round.questions.length : 0),
            0
          );
        }
        return 0;
      };
      const maxGameOutputTokens = getGameGenerationOutputTokenLimit(
        expectedQuestionCount,
        Boolean(config.includeImages)
      );
      const buildGenerationParams = (attempt: number, previousCount = 0, retryReason = '') => {
        const attemptParts = parts.map((part, index) => {
          if (attempt === 0 || index !== parts.length - 1 || typeof part?.text !== 'string') return part;
          const retryInstruction = retryReason === 'invalid-json'
            ? 'The previous response was cut off or was not valid JSON. Return the complete game again as compact, valid JSON with every string correctly escaped. Do not include markdown or commentary.'
            : `The previous response returned only ${previousCount} of ${expectedQuestionCount} required questions. Return the complete game again, with every required question. Do not shorten or summarize the result.`;
          return {
            ...part,
            text: `${part.text}\n\nRETRY REQUIRED: ${retryInstruction}`,
          };
        });
        return {
          model: ai.model,
          contents: { parts: attemptParts },
          config: {
            systemInstruction,
            ...(ai.provider === 'gemini' && getGameGenerationThinkingConfig(ai.model)
              ? { thinkingConfig: getGameGenerationThinkingConfig(ai.model) }
              : {}),
            maxOutputTokens: maxGameOutputTokens,
            responseMimeType: "application/json",
            responseSchema: responseSchema
          }
        };
      };

      let data: any = null;
      let generatedCount = 0;
      let retryReason = '';
      let invalidJsonAttempts = 0;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await generateTrackedContent(buildGenerationParams(attempt, generatedCount, retryReason), config);
        let candidate: any;
        try {
          candidate = JSON.parse(cleanJson(response.text || "{}"));
        } catch (error) {
          invalidJsonAttempts += 1;
          retryReason = 'invalid-json';
          console.warn(`AI game response was incomplete or invalid JSON (attempt ${attempt + 1}/2).`, {
            provider: ai.provider,
            model: ai.model,
            responseStatus: response?.status || null,
            incompleteReason: response?.incompleteReason || null,
            responseLength: typeof response?.text === 'string' ? response.text.length : 0,
            error: error instanceof Error ? error.message : String(error),
          });
          continue;
        }
        const candidateCount = countGeneratedQuestions(candidate);
        if (!data || candidateCount > generatedCount) {
          data = candidate;
          generatedCount = candidateCount;
        }
        if (!expectedQuestionCount || candidateCount >= expectedQuestionCount) break;
        retryReason = 'incomplete-count';
      }

      if (!data && invalidJsonAttempts > 0) {
        return sendJson(502, {
          error: 'The AI response was cut off before the complete game arrived. The site retried automatically, but the second response was also incomplete. Please try again; no incomplete game was saved.',
          code: 'INVALID_AI_JSON',
        });
      }

      if (expectedQuestionCount && generatedCount < expectedQuestionCount) {
        return sendJson(502, {
          error: `The AI returned ${generatedCount} of ${expectedQuestionCount} questions after two attempts. Please try again; no incomplete game was saved.`,
          code: 'INCOMPLETE_GAME_GENERATION',
        });
      }

      enforceGameOptionCounts(data, config);
      enforceGameAnswerMatchesOptions(data);
      rebalanceGameAnswerPositions(data, config);
      if (isWordWheel) {
        data.questions = normalizeWordWheelQuestions(data.questions || [], wordWheelLetterRule as WordWheelLetterRule);
      } else if (isBlockBeaters) {
        data.questions = normalizeBlockBeatersQuestions(data.questions || [], config.blockBeatersMode || 'letters');
      }

      if ((isWordWheel || isBlockBeaters) && data.questions.length < expectedQuestionCount) {
        return sendJson(502, {
          error: `The AI produced ${data.questions.length} valid questions, but this game requires ${expectedQuestionCount}. Please try again; no incomplete game was saved.`,
          code: 'INCOMPLETE_GAME_GENERATION',
        });
      }
      
      // Ensure ID exists for database
      data.id = randomUUID();
      data.createdAt = new Date().toISOString();
      data.config = config; // Pass config back

      return sendJson(200, data);
    }

    if (action === 'chat_wizard') {
        const clarification = getWizardClarification(message, history);
        if (clarification) {
          return sendJson(200, clarification);
        }

        const systemInstruction = `You are "The Teachers' Room AI Assistant", a friendly expert game consultant.
        Your goal is to help teachers choose the best game format for their specific class needs (Topic, Age, Learning Goal).
        
        AVAILABLE GAME TYPES AND BEST LEARNING FIT:
        1. Jeopardy (category-based retrieval practice, revision across units, team reasoning)
        2. Trivia Quiz (quick knowledge checks, mixed recall, broad coverage)
        3. Pub Quiz (round-based progression, themed revision, cumulative practice)
        4. Snakes and Ladders (low-pressure repetition, younger learners, engagement-first recall)
        5. Darts (targeted challenge rounds, focused retrieval, motivation through competition)
        6. Millionaire Maker (progressive difficulty, multiple-choice reasoning, exam confidence)
        7. Time Bomb (rapid fluency drills, verbal recall, quick vocabulary/list retrieval)
        8. Survey Showdown (prediction, discussion, social reasoning and speaking)
        9. Word Wheel (A-Z clue race, excellent for definitions, glossary terms, key vocabulary and terminology recall)
        10. Live Quiz Challenge (whole-class live quiz, students join by QR/code, every learner answers on their own device, leaderboard reveal)

        BEHAVIOR:
        - If the user's request is vague (e.g. "I want a game"), ask 1-2 clarifying questions.
        - If the teacher has not provided the actual content for the game, ask for it first. Ask for the topic, class level, and the exact questions, vocabulary, skills, source text, or mistakes students need to practise.
        - Only return suggestions when you have enough lesson content to make the game relevant.
        - When you need more information, return {"needsInput": true, "message": "..."} and omit suggestion/suggestions.
        - If the user gives enough info, provide 2 or 3 ranked recommendations so the teacher can choose.
        - Put recommendations in 'suggestions' (array). Include a short 'reason' for each item.
        - Keep 'suggestion' as the single best option (same as suggestions[0]) for backward compatibility.
        - If the user asks for definitions, vocabulary, glossary, terminology, or key terms, prioritize Word Wheel in the top 1-2 options.
        - If the user asks for Kahoot-style play, live class play, QR joining, phones/devices, every student answering, or a leaderboard, prioritize Live Quiz Challenge.
        - Live Quiz Challenge should use questionType "multiple-choice" because it is auto-scored.
        - Default to at least 25 questions unless the game format caps it (e.g. Millionaire Maker is always 15) or the user explicitly asks for a different count.
        - Live Quiz Challenge is usually best with 10-20 multiple-choice questions unless the user asks for a different count.
        - For Jeopardy or Pub Quiz, set rows/rounds so the total questions are at least 25 unless the user explicitly asks for fewer.
        
        TONE: Professional, encouraging, concise.
        `;

        // Map history from client
        const contents = (Array.isArray(history) ? history : []).map((h: any) => ({
            role: h.role === 'ai' ? 'model' : 'user',
            parts: [{ text: h.text }]
        }));
        
        contents.push({
            role: 'user',
            parts: [{ text: message }]
        });

        const response = await generateTrackedContent({
            model: ai.model,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        message: { type: Type.STRING },
                        needsInput: { type: Type.BOOLEAN },
                        suggestion: {
                            type: Type.OBJECT,
                            nullable: true,
                            properties: {
                                type: { type: Type.STRING },
                                title: { type: Type.STRING },
                                topic: { type: Type.STRING },
                                questionCount: { type: Type.INTEGER },
                                questionType: { type: Type.STRING },
                                customInstructions: { type: Type.STRING },
                                reason: { type: Type.STRING },
                                jeopardyCategories: { type: Type.INTEGER },
                                jeopardyCategoryNames: { type: Type.ARRAY, items: { type: Type.STRING } },
                                pubQuizRoundsCount: { type: Type.INTEGER },
                                pubQuizRoundNames: { type: Type.ARRAY, items: { type: Type.STRING } },
                                wordWheelScoringMode: { type: Type.STRING },
                                wordWheelLetterRule: { type: Type.STRING }
                            },
                            required: ["type", "title", "topic"]
                        },
                        suggestions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    type: { type: Type.STRING },
                                    title: { type: Type.STRING },
                                    topic: { type: Type.STRING },
                                    questionCount: { type: Type.INTEGER },
                                    questionType: { type: Type.STRING },
                                    customInstructions: { type: Type.STRING },
                                    reason: { type: Type.STRING },
                                    jeopardyCategories: { type: Type.INTEGER },
                                    jeopardyCategoryNames: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    pubQuizRoundsCount: { type: Type.INTEGER },
                                    pubQuizRoundNames: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    wordWheelScoringMode: { type: Type.STRING },
                                    wordWheelLetterRule: { type: Type.STRING }
                                },
                                required: ["type", "title", "topic"]
                            }
                        }
                    },
                    required: ["message"]
                }
            }
        });

        const text = response.text;
        const data = JSON.parse(cleanJson(text || "{}"));
        return sendJson(200, data);
    }

    if (action === 'blog_post') {
        const prompt = `
        Write a comprehensive, engaging blog post for teachers.
        Title: "${title || ''}"
        Subtitle: "${subtitle || ''}"
        Target Audience: Teachers and Educators.
        Tone: Professional, inspiring, and helpful.
        Length: 500 words.
        Format: HTML (use <h2>, <p>, <ul>, <li>).
        IMPORTANT: Return ONLY the raw HTML content. Do not include markdown code blocks (like \`\`\`html). Do not include <html> or <body> tags.
      `;

        const response = await generateTrackedContent({
          model: ai.model,
          contents: prompt
        });

        const text = (response.text || '').replace(/```html/g, '').replace(/```/g, '');
        return sendJson(200, { html: text });
    }

    return sendJson(400, { error: 'Invalid action' });

  } catch (error: any) {
    console.error("Generate API Error:", error);
    return sendJson(500, { error: error.message || "Internal Server Error" });
  }
}
