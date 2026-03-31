export const ACTIVE_GEMINI_MODEL = 'gemini-2.5-flash';
const FLASH_LITE_GAME_THINKING_BUDGET = 24_576;

type GeminiModelPricing = {
  largePromptThreshold: number | null;
  inputStandard: number;
  inputLarge?: number;
  audioInputStandard: number;
  audioInputLarge?: number;
  outputStandard: number;
  outputLarge?: number;
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

export const getGameGenerationThinkingConfig = (model: string) => {
  const resolvedModel = model || ACTIVE_GEMINI_MODEL;
  if (resolvedModel !== 'gemini-2.5-flash-lite') return undefined;

  return {
    thinkingBudget: FLASH_LITE_GAME_THINKING_BUDGET,
  };
};
