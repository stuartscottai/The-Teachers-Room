export const ACTIVE_GEMINI_MODEL = 'gemini-2.5-flash';
export const ACTIVE_OPENAI_MODEL = 'gpt-5.6-luna';
export type AiProvider = 'gemini' | 'openai';
const FLASH_LITE_GAME_THINKING_BUDGET = 24_576;
const MIN_GAME_OUTPUT_TOKENS = 8_192;
const MAX_GAME_OUTPUT_TOKENS = 32_768;

type GeminiModelPricing = {
  largePromptThreshold: number | null;
  inputStandard: number;
  inputLarge?: number;
  audioInputStandard: number;
  audioInputLarge?: number;
  outputStandard: number;
  outputLarge?: number;
};

type OpenAIModelPricing = {
  largePromptThreshold: number;
  inputStandard: number;
  cachedInputStandard: number;
  cacheWriteStandard: number;
  outputStandard: number;
  inputLarge: number;
  cachedInputLarge: number;
  cacheWriteLarge: number;
  outputLarge: number;
};

const GEMINI_MODEL_PRICING: Record<string, GeminiModelPricing> = {
  'gemini-2.5-flash': {
    largePromptThreshold: 200_000,
    inputStandard: 0.3,
    inputLarge: 1.0,
    audioInputStandard: 1.0,
    audioInputLarge: 3.0,
    outputStandard: 2.5,
    outputLarge: 15.0,
  },
  'gemini-2.5-flash-lite': {
    largePromptThreshold: null,
    inputStandard: 0.1,
    audioInputStandard: 0.3,
    outputStandard: 0.4,
  },
};

// Standard API prices per 1M tokens from OpenAI's current pricing table.
const OPENAI_MODEL_PRICING: Record<string, OpenAIModelPricing> = {
  'gpt-5.6-luna': {
    largePromptThreshold: 272_000,
    inputStandard: 0.2,
    cachedInputStandard: 0.02,
    cacheWriteStandard: 0.25,
    outputStandard: 1.2,
    inputLarge: 0.4,
    cachedInputLarge: 0.04,
    cacheWriteLarge: 0.5,
    outputLarge: 1.8,
  },
};

export const normalizeAiProvider = (value: unknown): AiProvider =>
  String(value || '').trim().toLowerCase() === 'openai' ? 'openai' : 'gemini';

export const getGeminiModelPricing = (model: string): Required<GeminiModelPricing> => {
  const configured =
    GEMINI_MODEL_PRICING[model] ||
    GEMINI_MODEL_PRICING[ACTIVE_GEMINI_MODEL];

  if (!configured) {
    throw new Error(`No Gemini pricing configured for model "${model || ACTIVE_GEMINI_MODEL}".`);
  }

  return {
    largePromptThreshold: configured.largePromptThreshold,
    inputStandard: configured.inputStandard,
    inputLarge: configured.inputLarge ?? configured.inputStandard,
    audioInputStandard: configured.audioInputStandard,
    audioInputLarge: configured.audioInputLarge ?? configured.audioInputStandard,
    outputStandard: configured.outputStandard,
    outputLarge: configured.outputLarge ?? configured.outputStandard,
  };
};

export const getOpenAIModelPricing = (model: string): OpenAIModelPricing => {
  const configured = OPENAI_MODEL_PRICING[model] || OPENAI_MODEL_PRICING[ACTIVE_OPENAI_MODEL];
  if (!configured) {
    throw new Error(`No OpenAI pricing configured for model "${model || ACTIVE_OPENAI_MODEL}".`);
  }
  return configured;
};

export const getGameGenerationThinkingConfig = (model: string) => {
  const resolvedModel = model || ACTIVE_GEMINI_MODEL;
  if (resolvedModel !== 'gemini-2.5-flash-lite') return undefined;

  return {
    thinkingBudget: FLASH_LITE_GAME_THINKING_BUDGET,
  };
};

export const getGameGenerationOutputTokenLimit = (
  questionCount: number,
  includeImages: boolean
) => {
  const safeQuestionCount = Number.isFinite(questionCount)
    ? Math.max(1, Math.floor(questionCount))
    : 1;
  const estimatedTokens =
    safeQuestionCount * 600 +
    (includeImages ? safeQuestionCount * 120 : 0);

  return Math.min(
    MAX_GAME_OUTPUT_TOKENS,
    Math.max(MIN_GAME_OUTPUT_TOKENS, estimatedTokens)
  );
};
