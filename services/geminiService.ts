
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GameConfig, GeneratedGame, WorksheetAiParts, WorksheetConfig, GameType, GeneratedQuestion } from "../types";
import { ACTIVE_GEMINI_MODEL, getGameGenerationThinkingConfig } from "../utils/aiModelConfig.js";
import { autoPickImagesForQuestions } from "../utils/gameAutoImages";
import { supabase } from "./supabase";
import { getMyEntitlements } from "./accountAccess";

export type WizardSuggestion = Partial<GameConfig> & {
  type: GameType;
  title: string;
  topic: string;
  reason?: string;
};

export interface ChatWizardResponse {
  message: string;
  suggestion?: WizardSuggestion;
  suggestions?: WizardSuggestion[];
}

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const DEFAULT_MODEL = ACTIVE_GEMINI_MODEL;
// Always use current origin for API calls to avoid CORS issues with Vercel preview deployments
const DEFAULT_EXTERNAL_API = '/api/generate';
const externalApiUrl = import.meta.env.VITE_EXTERNAL_API_URL;
const LOCAL_DEV_EXTERNAL_API = 'https://www.theteachersroom.app/api/generate';

const getGenerationApiUrl = () => {
  if (externalApiUrl) return externalApiUrl;
  if (import.meta.env.DEV) {
    throw new Error(
      `Set VITE_EXTERNAL_API_URL=${LOCAL_DEV_EXTERNAL_API} in .env.local so local generations use the hosted API.`
    );
  }
  return DEFAULT_EXTERNAL_API;
};

const getRequiredAccessToken = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error('Please log in to use AI generation.');
  }

  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error('Please log in to use AI generation.');
  }

  const userId = data.session?.user?.id;
  if (userId) {
    const entitlements = await getMyEntitlements(userId);
    if (!entitlements.canUseAi) {
      throw new Error('AI generation is not included in the Free plan. Upgrade to Teacher or School.');
    }
  }

  return accessToken;
};

const getClientEnv = () => {
  if (import.meta.env.DEV) return 'local-dev';
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')) {
    return 'vercel';
  }
  return 'browser';
};

const tryExternalApi = async <T>(body: Record<string, any>): Promise<T> => {
  const apiUrl = getGenerationApiUrl();
  const accessToken = await getRequiredAccessToken();

  try {
      const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            ...body,
            clientEnv: getClientEnv()
          })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
          const message =
            payload && typeof payload.error === 'string'
              ? payload.error
              : `External API Error: ${response.status} ${response.statusText}`;
          throw new Error(message);
      }

      return payload as T;
  } catch (error) {
      console.error("External API request failed", error);
      if (error instanceof Error) throw error;
      throw new Error("Unable to reach the generation service.");
  }
};

// Helper to initialize client safely
const getClient = () => {
  if (!apiKey) {
    console.error("API Key is missing in client environment");
    throw new Error("API Key is missing. If you are using the External API, check your Profile settings.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to clean JSON string from Markdown code blocks
const cleanJson = (text: string): string => {
  if (!text) return "{}";
  // Remove markdown code blocks like ```json ... ```
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
  // Extract the JSON object if there is extra text around it
  const firstOpen = cleaned.indexOf('{');
  const lastClose = cleaned.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose !== -1) {
    cleaned = cleaned.substring(firstOpen, lastClose + 1);
  }
  return cleaned.trim();
};

const WIZARD_REASON_BY_TYPE: Record<GameType, string> = {
  [GameType.JEOPARDY]: 'Best for structured retrieval practice across curriculum categories and exam-style revision.',
  [GameType.TRIVIA]: 'Great for fast mixed recall checks and broad topic coverage in one session.',
  [GameType.PUB_QUIZ]: 'Useful for themed rounds and sequenced review across subtopics or units.',
  [GameType.SNAKES_LADDERS]: 'Best for younger learners who need playful repetition and low-pressure recall.',
  [GameType.DARTS]: 'Works well for focused challenge rounds where accuracy and quick recall are both rewarded.',
  [GameType.MILLIONAIRE]: 'Strong for deliberate reasoning with multiple-choice progression and whole-class discussion.',
  [GameType.TIME_BOMB]: 'Ideal for fluency, speed retrieval, and oral recall under light time pressure.',
  [GameType.SURVEY_SHOWDOWN]: 'Best for prediction, speaking, and collaborative discussion around likely answers.',
  [GameType.STOP_THE_FIRE]: 'Great for rapid lexical retrieval across categories with strong pace and engagement.',
  [GameType.WORD_WHEEL]: 'Ideal for definitions, glossary terms, key vocabulary, and precise term recall.',
  [GameType.LIVE_QUIZ_CHALLENGE]: 'Best for whole-class live checks where every learner answers each question on their device.'
};

const WIZARD_TITLE_BY_TYPE: Record<GameType, string> = {
  [GameType.JEOPARDY]: 'Category Review Challenge',
  [GameType.TRIVIA]: 'Quick Knowledge Check',
  [GameType.PUB_QUIZ]: 'Round-by-Round Revision',
  [GameType.SNAKES_LADDERS]: 'Playful Recall Journey',
  [GameType.DARTS]: 'Targeted Knowledge Throwdown',
  [GameType.MILLIONAIRE]: 'High-Stakes Reasoning Run',
  [GameType.TIME_BOMB]: 'Rapid Recall Relay',
  [GameType.SURVEY_SHOWDOWN]: 'Prediction and Discussion Showdown',
  [GameType.STOP_THE_FIRE]: 'Category Sprint Challenge',
  [GameType.WORD_WHEEL]: 'A-Z Vocabulary Wheel',
  [GameType.LIVE_QUIZ_CHALLENGE]: 'Live Quiz Challenge'
};

const QUESTION_TYPES: NonNullable<GameConfig['questionType']>[] = ['multiple-choice', 'gap-fill', 'open', 'mixed', 'ai-decide'];

const normalizeGameType = (value: unknown): GameType | null => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  return Object.values(GameType).find((type) => type.toLowerCase() === raw) || null;
};

const coerceTopicFromMessage = (message: string) => {
  const cleaned = String(message || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Classroom practice';
  return cleaned.length > 90 ? `${cleaned.slice(0, 90).trim()}...` : cleaned;
};

const getKeywordRecommendationOrder = (message: string): GameType[] => {
  const text = String(message || '').toLowerCase();

  if (/\b(definition|definitions|define|vocab|vocabulary|glossary|terminology|key terms?)\b/.test(text)) {
    return [GameType.WORD_WHEEL, GameType.TIME_BOMB, GameType.TRIVIA, GameType.JEOPARDY];
  }
  if (/\b(revision|review|exam|test prep|assessment|retrieval practice)\b/.test(text)) {
    return [GameType.JEOPARDY, GameType.PUB_QUIZ, GameType.TRIVIA, GameType.WORD_WHEEL];
  }
  if (/\b(speaking|oral|fluency|quickfire|fast|speed)\b/.test(text)) {
    return [GameType.TIME_BOMB, GameType.WORD_WHEEL, GameType.PUB_QUIZ, GameType.TRIVIA];
  }
  if (/\b(opinion|survey|popular|guess|family feud)\b/.test(text)) {
    return [GameType.SURVEY_SHOWDOWN, GameType.PUB_QUIZ, GameType.TRIVIA];
  }
  if (/\b(younger|kids|primary|elementary|fun)\b/.test(text)) {
    return [GameType.SNAKES_LADDERS, GameType.TRIVIA, GameType.WORD_WHEEL];
  }

  return [GameType.TRIVIA, GameType.JEOPARDY, GameType.WORD_WHEEL, GameType.PUB_QUIZ];
};

const normalizeQuestionType = (value: unknown): GameConfig['questionType'] | undefined => {
  const asString = String(value || '').trim() as GameConfig['questionType'];
  return QUESTION_TYPES.includes(asString) ? asString : undefined;
};

const normalizeWizardSuggestion = (raw: any, topicFallback: string): WizardSuggestion | null => {
  const type = normalizeGameType(raw?.type);
  if (!type) return null;

  const topic = String(raw?.topic || topicFallback || '').trim() || topicFallback;
  const title = String(raw?.title || WIZARD_TITLE_BY_TYPE[type]).trim() || WIZARD_TITLE_BY_TYPE[type];
  const reason = String(raw?.reason || '').trim() || WIZARD_REASON_BY_TYPE[type];
  const questionType = normalizeQuestionType(raw?.questionType);

  const scoringMode =
    raw?.wordWheelScoringMode === 'speed-bonus' || raw?.wordWheelScoringMode === 'classic'
      ? raw.wordWheelScoringMode
      : undefined;
  const letterRule =
    raw?.wordWheelLetterRule === 'starts-with' || raw?.wordWheelLetterRule === 'contains-hard'
      ? raw.wordWheelLetterRule
      : undefined;

  return {
    type,
    title,
    topic,
    reason,
    questionCount: Number.isFinite(Number(raw?.questionCount)) ? Math.max(1, Number(raw.questionCount)) : undefined,
    questionType,
    customInstructions: typeof raw?.customInstructions === 'string' ? raw.customInstructions : undefined,
    jeopardyCategories: Number.isFinite(Number(raw?.jeopardyCategories)) ? Number(raw.jeopardyCategories) : undefined,
    jeopardyCategoryNames: Array.isArray(raw?.jeopardyCategoryNames) ? raw.jeopardyCategoryNames : undefined,
    pubQuizRoundsCount: Number.isFinite(Number(raw?.pubQuizRoundsCount)) ? Number(raw.pubQuizRoundsCount) : undefined,
    pubQuizRoundNames: Array.isArray(raw?.pubQuizRoundNames) ? raw.pubQuizRoundNames : undefined,
    wordWheelScoringMode: scoringMode,
    wordWheelLetterRule: letterRule
  };
};

const fallbackSuggestionForType = (type: GameType, topic: string): WizardSuggestion => {
  const isWordWheel = type === GameType.WORD_WHEEL;
  const isMillionaire = type === GameType.MILLIONAIRE;
  return {
    type,
    title: WIZARD_TITLE_BY_TYPE[type],
    topic,
    reason: WIZARD_REASON_BY_TYPE[type],
    questionCount: isWordWheel ? 26 : isMillionaire ? 15 : 25,
    questionType: isWordWheel ? 'open' : isMillionaire ? 'multiple-choice' : 'mixed',
    ...(isWordWheel
      ? {
          wordWheelLetterRule: 'contains-hard' as const,
          wordWheelScoringMode: 'classic' as const
        }
      : {})
  };
};

const normalizeWizardResponse = (raw: any, userMessage: string): ChatWizardResponse => {
  const fallbackTopic = coerceTopicFromMessage(userMessage);
  const candidates: any[] = [];
  if (raw?.suggestion) candidates.push(raw.suggestion);
  if (Array.isArray(raw?.suggestions)) candidates.push(...raw.suggestions);

  const suggestions: WizardSuggestion[] = [];
  const seenTypes = new Set<GameType>();

  for (const candidate of candidates) {
    const normalized = normalizeWizardSuggestion(candidate, fallbackTopic);
    if (!normalized) continue;
    if (seenTypes.has(normalized.type)) continue;
    suggestions.push(normalized);
    seenTypes.add(normalized.type);
    if (suggestions.length >= 3) break;
  }

  const keywordOrder = getKeywordRecommendationOrder(userMessage);
  for (const type of keywordOrder) {
    if (suggestions.length >= 3) break;
    if (seenTypes.has(type)) continue;
    suggestions.push(fallbackSuggestionForType(type, fallbackTopic));
    seenTypes.add(type);
  }

  const universalFallback: GameType[] = [GameType.WORD_WHEEL, GameType.TRIVIA, GameType.JEOPARDY, GameType.PUB_QUIZ];
  for (const type of universalFallback) {
    if (suggestions.length >= 3) break;
    if (seenTypes.has(type)) continue;
    suggestions.push(fallbackSuggestionForType(type, fallbackTopic));
    seenTypes.add(type);
  }

  const safeMessage =
    typeof raw?.message === 'string' && raw.message.trim().length
      ? raw.message.trim()
      : 'Here are a few game formats that fit your goal. Pick one and I can generate it immediately.';

  return {
    message: safeMessage,
    suggestion: suggestions[0],
    suggestions: suggestions.slice(0, 3)
  };
};

const stripOptionPrefix = (value: string) => (value || '').replace(/^[A-D]\)\s*/i, '').trim();
const normalizeOption = (value: string) => stripOptionPrefix(value).toLowerCase();
const normalizeOptionWithoutArticle = (value: string) => normalizeOption(value).replace(/^(a|an|the)\s+/i, '');

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

const QUESTION_TYPES_WITH_MCQ = new Set(['multiple-choice', 'mixed', 'ai-decide']);

const normalizeGameMcOptionCount = (value: any): 2 | 3 | 4 => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 4;
  return Math.min(4, Math.max(2, Math.round(parsed))) as 2 | 3 | 4;
};

const resolveGameMcOptionStrategy = (config: GameConfig): 'fixed' | 'vary' => {
  if (config.type === GameType.MILLIONAIRE) return 'fixed';
  if (config.mcOptionStrategy === 'fixed' || config.mcOptionStrategy === 'vary') {
    return config.mcOptionStrategy;
  }
  return config.questionType === 'multiple-choice' ? 'fixed' : 'vary';
};

type GameMcOptionPolicy =
  | { mode: 'fixed'; count: 2 | 3 | 4 }
  | { mode: 'vary' };

const getGameMcOptionPolicy = (config: GameConfig): GameMcOptionPolicy | null => {
  if (config.type === GameType.MILLIONAIRE) {
    return { mode: 'fixed', count: 4 };
  }
  if (!QUESTION_TYPES_WITH_MCQ.has(String(config.questionType || ''))) {
    return null;
  }
  return resolveGameMcOptionStrategy(config) === 'fixed'
    ? { mode: 'fixed', count: normalizeGameMcOptionCount(config.mcOptionCount) }
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

const enforceGameOptionCounts = (data: any, config: GameConfig) => {
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

const rebalanceGameAnswerPositions = (data: any, config: GameConfig) => {
  if (!getGameMcOptionPolicy(config)) return;

  const questions: any[] = [];
  applyToGameQuestions(data, (question: any) => {
    questions.push(question);
  });
  rebalanceQuestionAnswerPositions(questions);
};

const getGameQuestionTypeInstruction = (config: GameConfig, aiDecideLabel: string) => {
  if (config.questionType === 'ai-decide') {
    return aiDecideLabel;
  }
  return config.questionType;
};

const getGameMcInstruction = (config: GameConfig) => {
  const policy = getGameMcOptionPolicy(config);
  if (!policy) return '';

  if (policy.mode === 'fixed') {
    return config.questionType === 'multiple-choice'
      ? ` Each multiple choice question must have exactly ${policy.count} options.`
      : ` If you include multiple choice questions, each one must have exactly ${policy.count} options.`;
  }

  return config.questionType === 'multiple-choice'
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
): GeneratedQuestion[] => {
  const byLetter = new Map<string, GeneratedQuestion>();

  const normalizeLetter = (value: any): string => {
    const text = String(value || '').toUpperCase();
    const first = text.replace(/[^A-Z]/g, '').slice(0, 1);
    return first;
  };

  const normalizeAliases = (aliases: any, answer: string): string[] => {
    if (!Array.isArray(aliases)) return [];
    const answerNorm = answer.trim().toLowerCase();
    const deduped = new Set<string>();
    for (const entry of aliases) {
      const value = String(entry || '').trim();
      if (!value) continue;
      if (value.toLowerCase() === answerNorm) continue;
      deduped.add(value);
      if (deduped.size >= 8) break;
    }
    return Array.from(deduped);
  };

  (rawQuestions || []).forEach((q: any, index) => {
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
        ? q.imageKeywords.map((value: any) => String(value || '').trim()).filter(Boolean).slice(0, 6)
        : undefined,
    });
  });

  return WORD_WHEEL_LETTERS.map((letter, index) => {
    const existing = byLetter.get(letter);
    if (existing) {
      return { ...existing, id: index, letter };
    }
    return {
      id: index,
      letter,
      question: '',
      answer: '',
      answerAliases: [],
      points: 10,
      isBonus: false,
    };
  });
};

export const generateStopTheFireCategories = async (config: GameConfig): Promise<string[]> => {
  const external = await tryExternalApi<{ categories: string[] }>({ action: 'stop-the-fire-categories', config });
  if (external?.categories) return external.categories;

  const ai = getClient();

  const systemInstruction = `You are an expert classroom game designer.
Create a list of short, attainable categories for a Scattergories-style word game.
Categories must be easy for most people to answer without specialist knowledge.
Avoid niche trivia, advanced academic topics, or obscure references.
If files are provided, base the categories on the material in those files.

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
Custom instructions: ${config.customInstructions || "None"}.
Topic: ${config.topic || "General"}.

Return JSON: { "categories": ["..."] }
`;

  try {
    const parts: any[] = [];
    if (config.files && config.files.length > 0) {
      config.files.forEach(file => {
        parts.push({
          inlineData: {
            mimeType: file.mimeType,
            data: file.data
          }
        });
      });
      prompt = `IMPORTANT: Analyze the attached files and create categories based on their content.\n\n` + prompt;
    }

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            categories: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["categories"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(cleanJson(text));
    if (!data?.categories || !Array.isArray(data.categories)) return [];

    return data.categories
      .map((c: any) => (typeof c === 'string' ? c.trim() : ''))
      .filter(Boolean);
  } catch (error) {
    console.error("Error generating Stop the Fire categories:", error);
    throw error;
  }
};

const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // UUID v4 Polyfill
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const IMAGE_KEYWORD_BATCH_SIZE = 20;
const IMAGE_KEYWORD_WEAK_TERMS = new Set([
  'service', 'services', 'thing', 'things', 'item', 'items', 'person', 'people',
  'someone', 'somebody', 'its', 'it', 'their', 'them', 'his', 'her', 'like',
  'known', 'original', 'question', 'answer', 'choose', 'select', 'correct',
]);

const rootKeywordToken = (value: string): string => {
  let token = String(value || '').trim().toLowerCase();
  if (!token) return '';
  if (token.endsWith('ing') && token.length > 5) {
    token = token.slice(0, -3);
    if (token.endsWith('v')) token += 'e';
    return token;
  }
  if (token.endsWith('ied') && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith('ed') && token.length > 4) {
    token = token.slice(0, -2);
    if (token.endsWith('v')) token += 'e';
    return token;
  }
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith('s') && token.length > 4) return token.slice(0, -1);
  return token;
};

const tokenizeForKeywordRoots = (value: string): string[] =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);

const sanitizeKeywordCandidate = (value: string): string => {
  const token = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, ' ')
    .trim()
    .split(/\s+/)[0] || '';
  if (!token || token.length < 3) return '';
  return token;
};

const uniqueKeywords = (values: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const token = sanitizeKeywordCandidate(raw);
    if (!token || seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
};

const sanitizeImageKeywordsForQuestion = (
  question: GeneratedQuestion,
  rawKeywords: string[],
): string[] => {
  const answerRoots = new Set([
    ...tokenizeForKeywordRoots(question.answer || '').map(rootKeywordToken),
    ...(Array.isArray(question.options)
      ? tokenizeForKeywordRoots(question.options.join(' ')).map(rootKeywordToken)
      : []),
  ].filter(Boolean));

  const extracted = uniqueKeywords(rawKeywords)
    .filter((token) => !IMAGE_KEYWORD_WEAK_TERMS.has(token))
    .filter((token) => !answerRoots.has(rootKeywordToken(token)));

  const fallback = uniqueKeywords(Array.isArray(question.imageKeywords) ? question.imageKeywords : [])
    .filter((token) => !IMAGE_KEYWORD_WEAK_TERMS.has(token))
    .filter((token) => !answerRoots.has(rootKeywordToken(token)));

  const merged = uniqueKeywords([...extracted, ...fallback]);
  return merged.slice(0, 2);
};

const extractAiImageKeywordsBatch = async (
  ai: GoogleGenAI,
  batch: Array<{ localId: number; question: GeneratedQuestion }>,
  config: GameConfig
): Promise<Map<number, string[]>> => {
  const requestPayload = batch.map((item) => ({
    id: item.localId,
    question: item.question.question || '',
    answer: item.question.answer || '',
    options: Array.isArray(item.question.options) ? item.question.options : [],
    topic: config.topic || '',
  }));

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            imageKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['id', 'imageKeywords'],
        },
      },
    },
    required: ['items'],
  };

  const prompt = `
You are an image keyword extractor for quiz questions.
Return JSON only.

Rules:
- Return exactly 2 keywords per item in "imageKeywords".
- Each keyword must be a single word.
- Keyword 1 must be the strongest visual subject.
- Keywords must not be the answer or close variants of the answer/options.
- Prefer concrete visual nouns or proper nouns that work in stock image search.
- Avoid weak utility words (service, thing, item, person), pronouns, and filler words.
- Avoid verbs/adjectives unless they are clearly visual and necessary.

Input:
${JSON.stringify(requestPayload)}
`;

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });

  const parsed = JSON.parse(cleanJson(response.text || '{}'));
  const items = Array.isArray(parsed?.items) ? parsed.items : [];
  const out = new Map<number, string[]>();

  for (const entry of items) {
    const id = Number(entry?.id);
    if (!Number.isInteger(id)) continue;
    const question = batch.find((item) => item.localId === id)?.question;
    if (!question) continue;
    const raw = Array.isArray(entry?.imageKeywords) ? entry.imageKeywords.map((v: any) => String(v || '')) : [];
    const sanitized = sanitizeImageKeywordsForQuestion(question, raw);
    if (!sanitized.length) continue;
    out.set(id, sanitized);
  }

  return out;
};

const withAiImageKeywords = async (
  questions: GeneratedQuestion[],
  config: GameConfig,
  ai?: GoogleGenAI | null
): Promise<GeneratedQuestion[]> => {
  if (!ai || !Array.isArray(questions) || !questions.length) return questions;

  const next = [...questions];
  for (let start = 0; start < next.length; start += IMAGE_KEYWORD_BATCH_SIZE) {
    const slice = next.slice(start, start + IMAGE_KEYWORD_BATCH_SIZE);
    const batch = slice.map((question, idx) => ({ localId: idx, question }));

    try {
      const extracted = await extractAiImageKeywordsBatch(ai, batch, config);
      batch.forEach((item, idx) => {
        const picked = extracted.get(item.localId);
        if (!picked || !picked.length) return;
        const targetIndex = start + idx;
        next[targetIndex] = {
          ...next[targetIndex],
          imageKeywords: picked,
        };
      });
    } catch (err) {
      console.warn('AI keyword extraction batch failed:', err);
    }
  }

  return next;
};

const hydrateGameAutoImages = async (
  game: Pick<GeneratedGame, 'questions' | 'jeopardyBoard' | 'pubQuizRounds'>,
  config: GameConfig,
  ai?: GoogleGenAI | null
) => {
  const shouldAutoPickImages = Boolean(config.includeImages && config.imageMode === 'auto');
  if (!shouldAutoPickImages) {
    return {
      questions: game.questions || [],
      jeopardyBoard: game.jeopardyBoard,
      pubQuizRounds: game.pubQuizRounds,
    };
  }

  const imageCache = new Map<string, GeneratedQuestion['image'] | null>();
  let questions = game.questions || [];
  let jeopardyBoard = game.jeopardyBoard;
  let pubQuizRounds = game.pubQuizRounds;

  if (Array.isArray(questions) && questions.length) {
    questions = await withAiImageKeywords(questions, config, ai);
    questions = await autoPickImagesForQuestions(questions, config, imageCache);
  }
  if (Array.isArray(jeopardyBoard)) {
    const nextBoard = [];
    for (const category of jeopardyBoard) {
      const catQuestions = Array.isArray(category?.questions) ? category.questions : [];
      const preparedQuestions = catQuestions.length
        ? await withAiImageKeywords(catQuestions, config, ai)
        : catQuestions;
      const updatedQuestions = preparedQuestions.length
        ? await autoPickImagesForQuestions(preparedQuestions, config, imageCache)
        : catQuestions;
      nextBoard.push({ ...category, questions: updatedQuestions });
    }
    jeopardyBoard = nextBoard;
  }
  if (Array.isArray(pubQuizRounds)) {
    const nextRounds = [];
    for (const round of pubQuizRounds) {
      const roundQuestions = Array.isArray(round?.questions) ? round.questions : [];
      const preparedQuestions = roundQuestions.length
        ? await withAiImageKeywords(roundQuestions, config, ai)
        : roundQuestions;
      const updatedQuestions = preparedQuestions.length
        ? await autoPickImagesForQuestions(preparedQuestions, config, imageCache)
        : roundQuestions;
      nextRounds.push({ ...round, questions: updatedQuestions });
    }
    pubQuizRounds = nextRounds;
  }

  return { questions, jeopardyBoard, pubQuizRounds };
};

export const generateGameContent = async (config: GameConfig): Promise<GeneratedGame> => {
  const external = await tryExternalApi<GeneratedGame>({ action: 'game', config });
  if (external) {
    enforceGameOptionCounts(external, config);
    enforceGameAnswerMatchesOptions(external);
    rebalanceGameAnswerPositions(external, config);
    const normalizedExternalQuestions =
      config.type === GameType.WORD_WHEEL
        ? normalizeWordWheelQuestions(
            external.questions || [],
            (config.wordWheelLetterRule || 'contains-hard') as WordWheelLetterRule
          )
        : (external.questions || []);
    const hydrated = await hydrateGameAutoImages(
      {
        questions: normalizedExternalQuestions,
        jeopardyBoard: external.jeopardyBoard,
        pubQuizRounds: external.pubQuizRounds,
      },
      config,
      apiKey ? getClient() : null
    );
    return {
      ...external,
      questions: hydrated.questions,
      jeopardyBoard: hydrated.jeopardyBoard,
      pubQuizRounds: hydrated.pubQuizRounds,
    };
  }

  // --- INTERNAL GOOGLE SDK PATH ---
  const ai = getClient();
  
  const isJeopardy = config.type === GameType.JEOPARDY;
  const isPubQuiz = config.type === GameType.PUB_QUIZ;
  const isDarts = config.type === GameType.DARTS;
  const isMillionaire = config.type === GameType.MILLIONAIRE;
  const isTimeBomb = config.type === GameType.TIME_BOMB;
  const isSurvey = config.type === GameType.SURVEY_SHOWDOWN;
  const isWordWheel = config.type === GameType.WORD_WHEEL;
  const isLiveQuiz = config.type === GameType.LIVE_QUIZ_CHALLENGE;
  const wordWheelLetterRule = config.wordWheelLetterRule || 'contains-hard';

  const systemInstruction = `You are an expert educational content creator. 
  Create a structured game based on the following parameters.
  
  If the user provides source files (images/PDFs), analyze them thoroughly and base ALL questions/content on that material.

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
  These keywords are for stock image search (e.g., Pixabay), so prefer concrete visual nouns or proper nouns.
  Make keyword 1 the dominant visual subject (object/place/event). Keyword 2 can be supporting context.
  Do NOT use the exact answer, close synonyms, or wording that makes the answer too obvious.
  Avoid adjectives, verbs, and abstract terms like "education", "concept", "background".
  Avoid weak utility words as standalone keywords, such as "service", "thing", "item", "person".
  Avoid role/action words like "person", "people", "call", "study", "learn" unless they are clearly the visual subject.
  If the direct term is too revealing, choose one level broader while staying relevant.
  If the prompt is generic (e.g., "Choose the correct sentence"), derive keywords from question/topic context, not the answer text.
  `;

  let prompt = '';
  
  // Determine Title
  const gameTitle = config.title || `My ${config.type} Game`;

  // Define Schema Parts
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
      // Survey specific
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
    const categories = config.jeopardyCategoryNames || ["Category 1", "Category 2", "Category 3", "Category 4", "Category 5"];
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
    const roundNames = config.pubQuizRoundNames || ["General Knowledge", "Music", "Science"];
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
      // Add reserve buffer (+10) to ensure rounds can complete if repeats are needed
      const requestedCount = (config.questionCount || 15) + 10;

      prompt = `
      Create a Darts game titled "${gameTitle}" about "${config.topic}".
      Generate a large pool of ${requestedCount} unique questions.
      CRITICAL: You MUST categorize them by difficulty.
      - 33% labeled 'easy' (Simple facts/vocab)
      - 33% labeled 'medium' (Application/sentences)
      - 33% labeled 'hard' (Complex/Analysis)

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
      Create a "Family Feud" / "Family Fortunes" style game titled "${gameTitle}" about "${config.topic}".
      Generate ${config.questionCount} rounds (questions).
      
      FOR EACH QUESTION:
      1. Provide a "survey style" prompt (e.g. "Name something you find in a kitchen", "Name a reason people are late").
      2. Provide EXACTLY 8 "surveyAnswers".
      3. Each answer must have a "text" and a "score".
      4. CRITICAL: Include an "alts" array for each answer containing 3-5 synonyms or acceptable variations (e.g. for "Money", alts=["Cash", "Coins", "Dosh"]).
      5. Rank the answers by score (highest to lowest).
      6. Scores should roughly sum to 100.
      
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
      Points Strategy: ${pointsInstruction}
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
    CRITICAL: Keywords must NOT be the exact answer, close synonyms, or reveal the answer too directly.
    Use stock-search-friendly concrete visual nouns/proper nouns, not adjectives/verbs.
    Make keyword 1 the dominant visual subject (object/place/event). Keyword 2 can be context.
    Avoid weak utility words as standalone keywords, such as "service", "thing", "item", "person".
    Avoid role/action words like "person", "people", "call", "study", "learn" unless truly visual.
    Avoid abstract tags (e.g., "education", "concept", "background").
    If a direct keyword is too revealing, pick a broader but still relevant visual keyword.
    For generic prompts (e.g., "Choose the correct sentence"), derive keywords from question/topic context, not the answer text.
    `;
  }

  try {
    // Construct payload with potential file attachments
    const parts: any[] = [];
    
    if (config.files && config.files.length > 0) {
        config.files.forEach(file => {
            parts.push({
                inlineData: {
                    mimeType: file.mimeType,
                    data: file.data
                }
            });
        });
        // Add specific instruction to focus on files
        prompt = `IMPORTANT: Analyze the attached files thoroughly. Create the game content based specifically on the information found in these documents.\n\n` + prompt;
    }
    
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        ...(getGameGenerationThinkingConfig(DEFAULT_MODEL)
          ? { thinkingConfig: getGameGenerationThinkingConfig(DEFAULT_MODEL) }
          : {}),
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const data = JSON.parse(cleanJson(text));

    enforceGameOptionCounts(data, config);
    enforceGameAnswerMatchesOptions(data);
    rebalanceGameAnswerPositions(data, config);

    const normalizedQuestions = isWordWheel
      ? normalizeWordWheelQuestions(
          data.questions || [],
          (config.wordWheelLetterRule || 'contains-hard') as WordWheelLetterRule
        )
      : (data.questions || []);

    const hydrated = await hydrateGameAutoImages(
      {
        questions: normalizedQuestions,
        jeopardyBoard: data.jeopardyBoard,
        pubQuizRounds: data.pubQuizRounds,
      },
      config,
      ai
    );
    
    return {
      id: generateUUID(),
      createdAt: new Date().toISOString(),
      title: data.title || config.title,
      config: config,
      questions: hydrated.questions,
      jeopardyBoard: hydrated.jeopardyBoard,
      pubQuizRounds: hydrated.pubQuizRounds
    };
  } catch (error) {
    console.error("Error generating game:", error);
    throw error;
  }
};

export const generateWorksheetContent = async (config: WorksheetConfig): Promise<WorksheetAiParts> => {
  const external = await tryExternalApi<WorksheetAiParts>({ action: 'worksheet', config });
  if (external) return external;

  const ai = getClient();
  
  const systemInstruction = `You are an expert teacher generating worksheet PARTS for a drag-and-drop worksheet designer.

Return ONLY valid JSON that matches the provided schema (no markdown).

RULES:
1. Only include fields for the requested blocks. Omit all other fields.
2. storyHtml must be safe, simple HTML (use <p>, <strong>, <em>, <u>, <ul>, <ol>, <li>, <br>, <h3>).
3. No <html>, <head>, <body>, <script>, <style>, or inline CSS styles.
4. All non-HTML text fields must be plain text only (no HTML tags or entities).
5. mcq must contain clear questions and answer options appropriate for the grade level.
6. wordSearch items use { grid, words } where grid is rows x cols of single letters and words lists the target words.
7. matching items use { left, right } pairs. If matching is requested, also include matchingMeta (one per matching activity) with { title, instructions? }.
8. gapFill items use { sentence, answer } where sentence includes a "_____" blank.
9. sentenceTransform items use { prompt, keyword?, answer? }.
10. wordFormation items use { base, sentence, answer } where sentence includes a "_____" blank.
11. openEnded items use { question, sampleAnswer? }.
12. custom items use { text, html? } where html (if provided) is safe, simple HTML (same rules as storyHtml).
13. answerKeyHtml (if requested) must be safe, simple HTML (use <div>, <h3>, <p>, <ol>, <ul>, <li>, <strong>, <em>, <br>).
14. table should match the requested activity types and fit on an A4 page when possible.
15. infoSections items use { title, bodyHtml } with safe HTML in bodyHtml (use <p>, <strong>, <em>, <u>, <ul>, <ol>, <li>, <br>, <h3>).
16. If Information Sheet Notes are provided in the prompt, follow them strictly for infoSections.
17. If gap-fill is embedded in storyHtml, spread blanks across the full story (across paragraphs/sentences); do not cluster most blanks at the beginning.
`;

  const activities = config.activities || [];
  const mcqActivities = activities.filter((a) => a.type === 'multiple-choice');
  const wordSearchActivities = activities.filter((a) => a.type === 'wordsearch');
  const matchingActivities = activities.filter((a) => a.type === 'matching');
  const gapFillActivities = activities.filter((a) => a.type === 'gap-fill');
  const sentenceTransformActivities = activities.filter((a) => a.type === 'sentence-transform');
  const wordFormationActivities = activities.filter((a) => a.type === 'word-formation');
  const openEndedActivities = activities.filter((a) => a.type === 'open-ended');
  const infoSheetActivities = activities.filter((a) => a.type === 'information-sheet');
  const customActivities = activities.filter((a) => a.type === 'custom');
  const tableActivities = activities.filter((a) => a.type === 'table');
  const wantsStory = activities.some(
    (a) =>
      ['gap-fill', 'word-formation', 'multiple-choice', 'open-ended'].includes(a.type) && a.contextType === 'text'
  );
  const wantsMcq = mcqActivities.length > 0;
  const wantsWordSearch = wordSearchActivities.length > 0;
  const wantsMatching = matchingActivities.length > 0;
  const wantsGapFill = gapFillActivities.length > 0;
  const wantsSentenceTransform = sentenceTransformActivities.length > 0;
  const wantsWordFormation = wordFormationActivities.length > 0;
  const wantsOpenEnded = openEndedActivities.length > 0;
  const wantsInfoSheet = infoSheetActivities.length > 0;
  const wantsCustom = customActivities.length > 0;
  const wantsTable = tableActivities.length > 0;
  const wantsAnswerKey = Boolean(config.generateAnswerKey) && activities.some((a) => a.type !== 'information-sheet');
  const multipleTablesRequested = tableActivities.length > 1;

  const mcqCount = mcqActivities.reduce((sum, a) => sum + (a.count || 0), 0);
  const wordSearchCount = wordSearchActivities.length;
  const matchingCount = matchingActivities.reduce((sum, a) => sum + (a.count || 0), 0);
  const gapFillCount = gapFillActivities.reduce((sum, a) => sum + (a.count || 0), 0);
  const sentenceTransformCount = sentenceTransformActivities.reduce((sum, a) => sum + (a.count || 0), 0);
  const wordFormationCount = wordFormationActivities.reduce((sum, a) => sum + (a.count || 0), 0);
  const openEndedCount = openEndedActivities.reduce((sum, a) => sum + (a.count || 0), 0);
  const infoSectionCount = infoSheetActivities.reduce((sum, a) => sum + (a.count || 0), 0);
  const customCount = customActivities.length;
  const gapFillEmbedInStory = gapFillActivities.some((a) => a.contextType === 'text' && a.options?.embedInStory);
  const wordFormationEmbedInStory = wordFormationActivities.some(
    (a) => a.contextType === 'text' && (a.options?.embedInStory ?? true)
  );
  const formatActivityNotes = (note?: string) => {
    const trimmed = (note || '').trim();
    return trimmed ? ` notes: ${trimmed}` : '';
  };
  const infoSheetNotes = infoSheetActivities
    .map((a) => (a.customInstructions || '').trim())
    .filter((note) => note.length > 0);
  const clampMcCount = (value?: number) => {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) return 4;
    return Math.min(4, Math.max(2, Math.round(parsed)));
  };

  const getGridSpec = (activity: any, fallback: { rows: number; cols: number }) => {
    const rows = Math.max(2, Math.floor(activity?.options?.rows ?? fallback.rows));
    const cols = Math.max(2, Math.floor(activity?.options?.cols ?? fallback.cols));
    return { rows, cols };
  };

  const getImageBankLabels = (activity: any): string[] => {
    if (!activity?.options?.useImages) return [];
    const items = Array.isArray(activity?.options?.imageBank?.items)
      ? activity.options.imageBank.items
      : [];
    return items.map((item: any) => String(item?.label || '').trim()).filter(Boolean);
  };

  const formatImageBankNote = (activity: any): string => {
    const labels = getImageBankLabels(activity);
    if (labels.length === 0) return '';
    return `, image labels: ${JSON.stringify(labels)}`;
  };

  const tableActivitySummary = tableActivities
    .map((a) => {
      const spec = getGridSpec(a, { rows: 4, cols: 3 });
      return `${a.type} (${spec.rows}x${spec.cols})${formatActivityNotes(a.customInstructions)}`;
    })
    .join('; ');

  const orderedActivities = activities.filter((a) =>
    [
      'multiple-choice',
      'wordsearch',
      'matching',
      'gap-fill',
      'sentence-transform',
      'word-formation',
      'open-ended',
      'information-sheet',
      'custom',
      'table',
    ].includes(a.type)
  );

  const activityOrder = orderedActivities
    .map((a, idx) => {
      const activityCount = a.type === 'custom' ? 1 : a.count || 0;
      const countSuffix = a.type === 'information-sheet' ? ' sections' : '';
      let contextNote = '';
      if (['gap-fill', 'word-formation'].includes(a.type)) {
        const context = a.contextType === 'text' ? 'story' : 'sentences';
        contextNote = `, context: ${context}`;
      } else if (a.type === 'multiple-choice' && a.contextType === 'text') {
        contextNote = ', context: story';
      } else if (a.type === 'open-ended' && a.contextType === 'text') {
        contextNote = ', context: story';
      }
      const optionsNote = a.type === 'multiple-choice' ? `, options: ${clampMcCount(a.options?.mcCount)}` : '';
      const gridNote =
        a.type === 'wordsearch' || a.type === 'table'
          ? (() => {
              const spec = getGridSpec(a, a.type === 'wordsearch' ? { rows: 10, cols: 10 } : { rows: 4, cols: 3 });
              const diagonalNote = a.type === 'wordsearch' ? `, diagonals: ${a.options?.allowDiagonals ? 'yes' : 'no'}` : '';
              return `, size: ${spec.rows}x${spec.cols}${diagonalNote}`;
            })()
          : '';
      const imageNote = ['wordsearch', 'matching'].includes(a.type) ? formatImageBankNote(a) : '';
      return `${idx + 1}. ${a.type} (${activityCount}${countSuffix}${contextNote}${optionsNote}${gridNote}${imageNote})${formatActivityNotes(
        a.customInstructions
      )}`;
    })
    .join('\n');

  const exactTitle = config.title || `Worksheet: ${config.topic || 'Untitled'}`;

  const requestedBlocks: string[] = [];
  if (wantsStory) {
    requestedBlocks.push(
      '- storyHtml: a short reading passage or lesson text suitable for the grade level (2-6 short paragraphs).'
    );
  }
  if (wantsMcq) {
    requestedBlocks.push(
      `- mcq: ${mcqCount} multiple-choice questions based on the story/topic. Keep question groups in the same order as listed below.`
    );
    if (mcqActivities.length > 0) {
      requestedBlocks.push(
        '  MCQ groups (count + options per question):\n' +
          mcqActivities
            .map(
              (a) =>
                `  - ${a.count || 0} questions with ${clampMcCount(a.options?.mcCount)} options${formatActivityNotes(
                  a.customInstructions
                )}`
            )
            .join('\n')
      );
    }
  }
  if (wantsWordSearch) {
    requestedBlocks.push(
      `- wordSearch: ${wordSearchCount} wordsearch puzzle(s). Provide one puzzle per wordsearch activity in the same order.`
    );
    requestedBlocks.push(
      '  Wordsearch specs (rows x cols, word count, notes):\n' +
        wordSearchActivities
          .map((a) => {
            const spec = getGridSpec(a, { rows: 10, cols: 10 });
            const diagonalNote = a.options?.allowDiagonals ? 'allow diagonals' : 'no diagonals';
            const imageNote = formatImageBankNote(a);
            return `  - ${spec.rows}x${spec.cols}, ${a.count || 0} words, ${diagonalNote}${imageNote}${formatActivityNotes(
              a.customInstructions
            )}`;
          })
          .join('\n')
    );
    requestedBlocks.push('  If notes include a word list, use it. Otherwise, generate words to match the requested count.');
    requestedBlocks.push('  If image labels are provided for a wordsearch, use those labels as the word list exactly (no extra words, no edits).');
  }
  if (wantsMatching) {
    requestedBlocks.push(
      `- matching: ${matchingCount} matching pairs. Keep items grouped and in the same order as listed below.`
    );
    requestedBlocks.push(
      '  Matching groups (count + notes):\n' +
        matchingActivities
          .map((a) => `  - ${a.count || 0} pairs${formatImageBankNote(a)}${formatActivityNotes(a.customInstructions)}`)
          .join('\n')
    );
    requestedBlocks.push('  Matching is rendered as a 3-column table (left item, blank middle, right item). Provide left/right pairs only.');
    requestedBlocks.push('  Also provide matchingMeta: one short title + 1-line instruction per matching group, in the same order.');
    requestedBlocks.push('  If image labels are provided for matching, use those labels as the LEFT items exactly (no edits).');
  }
  if (wantsGapFill) {
    requestedBlocks.push(
      `- gapFill: ${gapFillCount} gap-fill items. Keep items grouped and in the same order as listed below.`
    );
    requestedBlocks.push(
      '  Gap Fill groups (count + context):\n' +
        gapFillActivities
          .map((a) => {
            const context = a.contextType === 'text' ? 'story' : 'sentences';
            const wordBankNote = a.options?.wordBank ? ', include word bank' : '';
            const embedNote = a.options?.embedInStory ? ', embed gaps in storyHtml' : '';
            return `  - ${a.count || 0} items (${context})${wordBankNote}${embedNote}${formatActivityNotes(
              a.customInstructions
            )}`;
          })
          .join('\n')
    );
    requestedBlocks.push(
      '  If context is story with embed enabled, distribute blanks across the entire story (multiple paragraphs/sentences), not mostly in the first paragraph.'
    );
  }
  if (wantsSentenceTransform) {
    requestedBlocks.push(
      `- sentenceTransform: ${sentenceTransformCount} sentence transformation prompts. Keep items grouped and in the same order as listed below.`
    );
    requestedBlocks.push(
      '  Sentence Transform groups (count + notes):\n' +
        sentenceTransformActivities
          .map((a) => `  - ${a.count || 0} prompts${formatActivityNotes(a.customInstructions)}`)
          .join('\n')
    );
  }
  if (wantsWordFormation) {
    requestedBlocks.push(
      `- wordFormation: ${wordFormationCount} word-formation items. Keep items grouped and in the same order as listed below.`
    );
    requestedBlocks.push(
      '  Word Formation groups (count + context):\n' +
        wordFormationActivities
          .map((a) => {
            const context = a.contextType === 'text' ? 'story' : 'sentences';
            const embedNote =
              a.contextType === 'text' && (a.options?.embedInStory ?? true)
                ? ', embed gaps in storyHtml with base words in brackets'
                : '';
            return `  - ${a.count || 0} items (${context})${embedNote}${formatActivityNotes(a.customInstructions)}`;
          })
          .join('\n')
    );
  }
  if (wantsOpenEnded) {
    requestedBlocks.push(
      `- openEnded: ${openEndedCount} open-ended questions. Keep items grouped and in the same order as listed below.`
    );
    requestedBlocks.push(
      '  Open Ended groups (count + notes):\n' +
        openEndedActivities
          .map((a) => {
            const context = a.contextType === 'text' ? 'story' : 'questions';
            const contextNote = a.contextType ? ` (${context})` : '';
            return `  - ${a.count || 0} questions${contextNote}${formatActivityNotes(a.customInstructions)}`;
          })
          .join('\n')
    );
  }
  if (wantsInfoSheet) {
    requestedBlocks.push(
      `- infoSections: ${infoSectionCount} information-only sections (no questions). Provide one section per requested count in the same order as listed below.`
    );
    requestedBlocks.push(
      '  Information Sheet groups (sections + notes):\n' +
        infoSheetActivities
          .map((a) => `  - ${a.count || 0} sections${formatActivityNotes(a.customInstructions)}`)
          .join('\n')
    );
    requestedBlocks.push('  Each section must include a short title and a concise bodyHtml (1-3 short paragraphs or bullet list).');
  }
  if (wantsCustom) {
    requestedBlocks.push(
      `- custom: ${customCount} custom text outputs. Provide one text output per custom activity in the same order.`
    );
    requestedBlocks.push(
      '  Custom groups (notes only):\n' +
        customActivities
          .map((a) => {
            const notes = (a.customInstructions || '').trim();
            return notes ? `  - notes: ${notes}` : '  - notes: none';
          })
          .join('\n')
    );
    requestedBlocks.push('  For custom outputs, use multiple short paragraphs or bullets. If formatting is needed, return custom.html with safe HTML.');
  }
  if (wantsTable) {
    if (multipleTablesRequested) {
      requestedBlocks.push(
        `- tables: Create ${tableActivities.length} tables (one per table activity) in the same order as listed above.`
      );
      requestedBlocks.push(
        '  Table specs (rows x cols, notes):\n' +
          tableActivities
            .map((a) => {
              const spec = getGridSpec(a, { rows: 4, cols: 3 });
              return `  - ${spec.rows}x${spec.cols}${formatActivityNotes(a.customInstructions)}`;
            })
            .join('\n')
      );
    } else {
      const activityLine = tableActivitySummary
        ? `- table: Create a table with the specified size(s): ${tableActivitySummary}.`
        : '- table: Create a table with the requested rows/columns.';
      requestedBlocks.push(activityLine);
      if (tableActivities[0]) {
        const spec = getGridSpec(tableActivities[0], { rows: 4, cols: 3 });
        requestedBlocks.push(`  Use exactly ${spec.rows} body rows and ${spec.cols} columns (headers length must equal columns).`);
      }
    }
  }
  if (wantsAnswerKey) {
    requestedBlocks.push(
      '- answerKeyHtml: A complete answer key for all requested activities (include answers for MCQ, wordsearch, matching, gap-fill, sentence-transform, word-formation, and sample answers for open-ended/custom).'
    );
  }
  if (requestedBlocks.length === 0) {
    requestedBlocks.push('- No activity blocks requested. Return only the title.');
  }

  let prompt = `
Use this exact title: ${exactTitle}

Topic: ${config.topic || 'N/A'}
Grade Level: ${config.gradeLevel || 'N/A'}
Difficulty: ${config.difficultyLevel || 'medium'}
Additional Instructions: ${config.customInstructions || 'None'}

${wantsInfoSheet && infoSheetNotes.length > 0 ? `Information Sheet Notes (apply only to infoSections):\n${infoSheetNotes
  .map((note) => `- ${note}`)
  .join('\n')}\n` : ''}
${activityOrder ? `Activities (in order):\n${activityOrder}\n` : ''}
Requested Blocks:
${requestedBlocks.join('\n')}

${gapFillEmbedInStory
  ? 'Gap Fill embedded-story mode: storyHtml must include the gap-fill blanks (use "_____"), with blanks distributed across the full story rather than front-loaded in paragraph one. Still return gapFill items for answer keys, but do not repeat the questions inside the story.\n'
  : ''}
${wordFormationEmbedInStory
  ? 'Word Formation embedded-story mode: storyHtml must include blanks with base words in brackets after each blank, e.g., "The _____ (decide)..." Still return wordFormation items for answer keys.\n'
  : ''}
${wordFormationActivities.length > 0
  ? 'Word Formation variety: include a mix of nouns, verbs, adjectives, and adverbs unless instructions specify otherwise.\n'
  : ''}
${sentenceTransformActivities.length > 0
  ? 'Sentence Transform format: include a single KEYWORD for each prompt (1-2 words, uppercase) to guide the transformation.\n'
  : ''}
Only include fields for the requested blocks. Do not include extra fields.

If source files are attached, base requested content on those documents instead of inventing unrelated facts.
`;

  try {
    // Construct payload with potential file attachments
    const parts: any[] = [];
    
    if (config.files && config.files.length > 0) {
        config.files.forEach(file => {
            parts.push({
                inlineData: {
                    mimeType: file.mimeType,
                    data: file.data
                }
            });
        });
        prompt = `IMPORTANT: Analyze the attached files thoroughly. Create the worksheet content based specifically on the information found in these documents.\n\n` + prompt;
    }
    
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            ...(wantsStory ? { storyHtml: { type: Type.STRING } } : {}),
            ...(wantsMcq
              ? {
                  mcq: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        q: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } }
                      },
                      required: ["q", "options"]
                    }
                  }
                }
              : {}),
            ...(wantsWordSearch
              ? {
                  wordSearch: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        grid: {
                          type: Type.ARRAY,
                          items: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        words: { type: Type.ARRAY, items: { type: Type.STRING } }
                      },
                      required: ["grid", "words"]
                    }
                  }
                }
              : {}),
            ...(wantsMatching
              ? {
                  matching: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        left: { type: Type.STRING },
                        right: { type: Type.STRING }
                      },
                      required: ["left", "right"]
                    }
                  },
                  matchingMeta: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        instructions: { type: Type.STRING }
                      },
                      required: ["title"]
                    }
                  }
                }
              : {}),
            ...(wantsGapFill
              ? {
                  gapFill: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        sentence: { type: Type.STRING },
                        answer: { type: Type.STRING }
                      },
                      required: ["sentence", "answer"]
                    }
                  }
                }
              : {}),
            ...(wantsSentenceTransform
              ? {
                  sentenceTransform: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        prompt: { type: Type.STRING },
                        keyword: { type: Type.STRING },
                        answer: { type: Type.STRING }
                      },
                      required: ["prompt"]
                    }
                  }
                }
              : {}),
            ...(wantsWordFormation
              ? {
                  wordFormation: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        base: { type: Type.STRING },
                        sentence: { type: Type.STRING },
                        answer: { type: Type.STRING }
                      },
                      required: ["base", "sentence", "answer"]
                    }
                  }
                }
              : {}),
            ...(wantsOpenEnded
              ? {
                  openEnded: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        question: { type: Type.STRING },
                        sampleAnswer: { type: Type.STRING }
                      },
                      required: ["question"]
                    }
                  }
                }
              : {}),
            ...(wantsInfoSheet
              ? {
                  infoSections: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        bodyHtml: { type: Type.STRING }
                      },
                      required: ["title", "bodyHtml"]
                    }
                  }
                }
              : {}),
            ...(wantsCustom
              ? {
                  custom: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        text: { type: Type.STRING },
                        html: { type: Type.STRING }
                      },
                      required: []
                    }
                  }
                }
              : {}),
            ...(wantsTable
              ? multipleTablesRequested
                ? {
                    tables: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          headers: { type: Type.ARRAY, items: { type: Type.STRING } },
                          rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
                        },
                        required: ["headers", "rows"]
                      }
                    }
                  }
                : {
                    table: {
                      type: Type.OBJECT,
                      properties: {
                        headers: { type: Type.ARRAY, items: { type: Type.STRING } },
                        rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
                      },
                      required: ["headers", "rows"]
                    }
                  }
              : {}),
            ...(wantsAnswerKey ? { answerKeyHtml: { type: Type.STRING } } : {})
          },
          required: [
            "title",
            ...(wantsStory ? ["storyHtml"] : []),
            ...(wantsMcq ? ["mcq"] : []),
            ...(wantsWordSearch ? ["wordSearch"] : []),
            ...(wantsMatching ? ["matching"] : []),
            ...(wantsGapFill ? ["gapFill"] : []),
            ...(wantsSentenceTransform ? ["sentenceTransform"] : []),
            ...(wantsWordFormation ? ["wordFormation"] : []),
            ...(wantsOpenEnded ? ["openEnded"] : []),
            ...(wantsInfoSheet ? ["infoSections"] : []),
            ...(wantsCustom ? ["custom"] : []),
            ...(wantsTable ? (multipleTablesRequested ? ["tables"] : ["table"]) : []),
            ...(wantsAnswerKey ? ["answerKeyHtml"] : [])
          ]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    // Clean and parse
    const result = JSON.parse(cleanJson(text)) as WorksheetAiParts;

    const coerceArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const fallbackInfoHtml = (textValue: string) => {
      const trimmed = (textValue || "").trim();
      if (!trimmed) return "<p>Information to be added.</p>";
      return `<p>${escapeHtml(trimmed).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
    };

    if (wantsStory && typeof (result as any).storyHtml !== "string") {
      const storyNotes = activities.map((a) => a.customInstructions).filter(Boolean).join("\n");
      (result as any).storyHtml = fallbackInfoHtml(storyNotes);
    }

    if (wantsMcq) {
      (result as any).mcq = coerceArray((result as any).mcq);
      if ((result as any).mcq.length === 0 && mcqCount > 0) {
        const optionCount = clampMcCount(mcqActivities[0]?.options?.mcCount);
        (result as any).mcq = Array.from({ length: mcqCount }, (_, idx) => ({
          q: `Question ${idx + 1}`,
          options: ["Option A", "Option B", "Option C", "Option D"].slice(0, optionCount)
        }));
      }
    }

    if (wantsGapFill) {
      (result as any).gapFill = coerceArray((result as any).gapFill);
      if ((result as any).gapFill.length === 0 && gapFillCount > 0) {
        (result as any).gapFill = Array.from({ length: gapFillCount }, () => ({
          sentence: "_____",
          answer: ""
        }));
      }
    }

    if (wantsInfoSheet) {
      (result as any).infoSections = coerceArray((result as any).infoSections);
      if ((result as any).infoSections.length === 0 && infoSectionCount > 0) {
        const infoNotes = infoSheetActivities
          .map((a) => (a.customInstructions || "").trim())
          .filter(Boolean)
          .join("\n");
        (result as any).infoSections = [
          {
            title: "Information",
            bodyHtml: fallbackInfoHtml(infoNotes)
          }
        ];
      }
    }

    if (wantsWordSearch) {
      (result as any).wordSearch = coerceArray((result as any).wordSearch);
    }
    if (wantsMatching) {
      (result as any).matching = coerceArray((result as any).matching);
    }
    if (wantsSentenceTransform) {
      (result as any).sentenceTransform = coerceArray((result as any).sentenceTransform);
    }
    if (wantsWordFormation) {
      (result as any).wordFormation = coerceArray((result as any).wordFormation);
    }
    if (wantsOpenEnded) {
      (result as any).openEnded = coerceArray((result as any).openEnded);
    }
    if (wantsCustom) {
      (result as any).custom = coerceArray((result as any).custom);
    }

    return result;
  } catch (error) {
    console.error("Error generating worksheet:", error);
    throw error;
  }
};

export const chatWithGameWizard = async (message: string, history: {role: string, text: string}[]): Promise<ChatWizardResponse> => {
    const external = await tryExternalApi<ChatWizardResponse>({
        action: 'chat_wizard',
        message,
        history
    });
    if (external) return normalizeWizardResponse(external, message);

    // --- INTERNAL LOCAL PATH ---
    const ai = getClient();
    
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

    BEHAVIOR:
    - If the user's request is vague (e.g. "I want a game"), ask 1-2 clarifying questions (e.g. "What topic? What grade? Do they like competition?").
    - If the user gives enough info, provide 2 or 3 ranked recommendations so the teacher can choose.
    - Put recommendations in 'suggestions' (array). Include a short 'reason' for each item.
    - Keep 'suggestion' as the single best option (same as suggestions[0]) for backward compatibility.
    - If the user asks for definitions, vocabulary, glossary, terminology, or key terms, prioritize Word Wheel in the top 1-2 options.
    - Default to at least 25 questions unless the game format caps it (e.g. Millionaire Maker is always 15) or the user explicitly asks for a different count.
    - For Jeopardy or Pub Quiz, set rows/rounds so the total questions are at least 25 unless the user explicitly asks for fewer.
    
    TONE: Professional, encouraging, concise.
    `;

    // Map internal history format to Gemini SDK format
    const contents = history.map(h => ({
        role: h.role === 'ai' ? 'model' : 'user',
        parts: [{ text: h.text }]
    }));
    
    // Add current message
    contents.push({
        role: 'user',
        parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    message: { type: Type.STRING },
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
                            // Add extra config fields as optional
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
    if (!text) {
      return normalizeWizardResponse(
        { message: "I'm having trouble connecting. Please try again." },
        message
      );
    }
    
    return normalizeWizardResponse(JSON.parse(cleanJson(text)), message);
};

export const chatWithAI = async (message: string, history: string[]): Promise<string> => {
    // Legacy chat function - kept for compatibility if used elsewhere
    // In a real refactor, this might be removed or merged
    return "This feature is being upgraded.";
};

export const generateBlogPost = async (title: string, subtitle: string): Promise<string> => {
  try {
      const external = await tryExternalApi<{ html: string }>({
        action: 'blog_post',
        title,
        subtitle
      });
      return typeof external?.html === 'string' ? external.html : '';
  } catch (error) {
      console.error("Error generating blog post:", error);
      return "<p>Unable to generate article content. Please check that you are logged in and the hosted generation API is available.</p>";
  }
};
