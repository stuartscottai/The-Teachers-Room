import { createHash } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import {
  ACTIVE_GEMINI_MODEL,
  ACTIVE_OPENAI_MODEL,
  type AiProvider,
  normalizeAiProvider,
} from '../utils/aiModelConfig.js';

type RuntimeOptions = {
  provider?: unknown;
  action?: string;
  userId?: string;
};

type AiRuntime = {
  provider: AiProvider;
  model: string;
  generateContent: (params: any) => Promise<any>;
  countTokens: (contents: any) => Promise<number>;
};

const stripInternalMetadata = (value: any): any => {
  if (Array.isArray(value)) return value.map(stripInternalMetadata);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !key.startsWith('_'))
      .map(([key, nested]) => [key, stripInternalMetadata(nested)])
  );
};

const normalizeSchemaType = (value: unknown) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'number' || normalized === 'integer' || normalized === 'boolean' || normalized === 'array' || normalized === 'object' || normalized === 'string' || normalized === 'null') {
    return normalized;
  }
  return undefined;
};

const makeNullable = (schema: any) => {
  if (schema?.anyOf?.some((entry: any) => entry?.type === 'null')) return schema;
  return { anyOf: [schema, { type: 'null' }] };
};

export const convertGeminiSchemaToOpenAI = (schema: any): any => {
  if (!schema || typeof schema !== 'object') return schema;

  const converted: any = {};
  const type = normalizeSchemaType(schema.type);
  if (type) converted.type = type;
  if (schema.description) converted.description = schema.description;
  if (Array.isArray(schema.enum)) converted.enum = schema.enum;
  if (Number.isFinite(schema.minItems)) converted.minItems = schema.minItems;
  if (Number.isFinite(schema.maxItems)) converted.maxItems = schema.maxItems;

  if (type === 'array' && schema.items) {
    converted.items = convertGeminiSchemaToOpenAI(schema.items);
  }

  if (type === 'object') {
    const sourceProperties = schema.properties || {};
    const originallyRequired = new Set(Array.isArray(schema.required) ? schema.required : []);
    converted.properties = Object.fromEntries(
      Object.entries(sourceProperties).map(([key, value]) => {
        const property = convertGeminiSchemaToOpenAI(value);
        return [key, originallyRequired.has(key) ? property : makeNullable(property)];
      })
    );
    // OpenAI strict schemas require all keys to be listed as required. Keys that
    // were optional in Gemini remain optional in meaning because they accept null.
    converted.required = Object.keys(sourceProperties);
    converted.additionalProperties = false;
  }

  return converted;
};

const getOpenAIReasoningEffort = (action = '') => {
  const configured = String(process.env.OPENAI_REASONING_EFFORT || '').trim().toLowerCase();
  if (['none', 'minimal', 'low', 'medium', 'high', 'xhigh'].includes(configured)) return configured;
  return action === 'game' ? 'medium' : 'low';
};

const toOpenAIContentPart = (part: any): any => {
  if (typeof part?.text === 'string') {
    return { type: 'input_text', text: part.text };
  }

  const inlineData = part?.inlineData;
  if (!inlineData?.data || !inlineData?.mimeType) return null;
  const dataUrl = `data:${inlineData.mimeType};base64,${inlineData.data}`;

  if (String(inlineData.mimeType).startsWith('image/')) {
    return { type: 'input_image', image_url: dataUrl, detail: 'auto' };
  }

  if (String(inlineData.mimeType).startsWith('audio/')) {
    throw new Error('Audio source files are not supported by the selected OpenAI Luna model. Use Gemini for requests with audio files.');
  }

  return {
    type: 'input_file',
    file_data: dataUrl,
    filename: part?._fileName || 'source-file',
  };
};

const partsToOpenAIContent = (parts: any[]) =>
  (Array.isArray(parts) ? parts : [])
    .map(toOpenAIContentPart)
    .filter(Boolean);

const toOpenAIInput = (contents: any): any => {
  if (typeof contents === 'string') return contents;

  if (Array.isArray(contents)) {
    return contents.map((entry) => ({
      role: entry?.role === 'model' || entry?.role === 'ai' ? 'assistant' : 'user',
      content: partsToOpenAIContent(entry?.parts || [{ text: entry?.text || '' }]),
    }));
  }

  if (Array.isArray(contents?.parts)) {
    return [{ role: 'user', content: partsToOpenAIContent(contents.parts) }];
  }

  return String(contents || '');
};

const findRefusal = (response: any) => {
  for (const output of response?.output || []) {
    for (const content of output?.content || []) {
      if (content?.type === 'refusal' && content?.refusal) return String(content.refusal);
    }
  }
  return '';
};

const createOpenAIRuntime = ({ action, userId }: RuntimeOptions): AiRuntime => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing. Add it to .env.local for local use and to the deployment environment for the live site.');
  }

  const model = String(process.env.OPENAI_MODEL || ACTIVE_OPENAI_MODEL).trim();
  const client = new OpenAI({ apiKey });
  const safetyIdentifier = userId
    ? createHash('sha256').update(`teachers-room:${userId}`).digest('hex')
    : undefined;

  return {
    provider: 'openai',
    model,
    countTokens: async () => 0,
    generateContent: async (params: any) => {
      const config = params?.config || {};
      const request: any = {
        model,
        input: toOpenAIInput(params?.contents),
        instructions: typeof config.systemInstruction === 'string' ? config.systemInstruction : undefined,
        reasoning: { effort: getOpenAIReasoningEffort(action) },
        max_output_tokens: Number.isFinite(config.maxOutputTokens) ? config.maxOutputTokens : undefined,
        store: false,
        safety_identifier: safetyIdentifier,
      };

      if (config.responseSchema) {
        request.text = {
          format: {
            type: 'json_schema',
            name: `teachers_room_${String(action || 'response').replace(/[^a-zA-Z0-9_-]/g, '_')}`,
            strict: true,
            schema: convertGeminiSchemaToOpenAI(config.responseSchema),
          },
        };
      } else if (config.responseMimeType === 'application/json') {
        request.text = { format: { type: 'json_object' } };
      }

      const response = await client.responses.create(request);
      const refusal = findRefusal(response);
      if (refusal) throw new Error(`OpenAI could not complete this request: ${refusal}`);

      const reasoningTokens = Number(response.usage?.output_tokens_details?.reasoning_tokens || 0);
      const cachedTokens = Number(response.usage?.input_tokens_details?.cached_tokens || 0);
      const cacheWriteTokens = Number(response.usage?.input_tokens_details?.cache_write_tokens || 0);

      return {
        text: response.output_text || '',
        usageMetadata: {
          promptTokenCount: Number(response.usage?.input_tokens || 0),
          candidatesTokenCount: Math.max(0, Number(response.usage?.output_tokens || 0) - reasoningTokens),
          thoughtsTokenCount: reasoningTokens,
          totalTokenCount: Number(response.usage?.total_tokens || 0),
          cachedContentTokenCount: cachedTokens,
          cacheWriteTokenCount: cacheWriteTokens,
        },
        responseId: response.id,
        modelVersion: response.model,
        status: response.status,
        incompleteReason: response.incomplete_details?.reason || null,
      };
    },
  };
};

const createGeminiRuntime = (): AiRuntime => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing. Add it to .env.local for local use and to the deployment environment for the live site.');
  }

  const model = String(process.env.GEMINI_MODEL || ACTIVE_GEMINI_MODEL).trim();
  const client = new GoogleGenAI({ apiKey });

  return {
    provider: 'gemini',
    model,
    generateContent: (params: any) => client.models.generateContent({
      ...stripInternalMetadata(params),
      model,
    }),
    countTokens: async (contents: any) => {
      try {
        const response = await client.models.countTokens({ model, contents: stripInternalMetadata(contents) });
        return Number.isFinite(response?.totalTokens) ? Number(response.totalTokens) : 0;
      } catch (error) {
        console.error('Count tokens failed:', error);
        return 0;
      }
    },
  };
};

export const createAiRuntime = (options: RuntimeOptions = {}): AiRuntime => {
  const provider = normalizeAiProvider(options.provider ?? process.env.AI_PROVIDER);
  return provider === 'openai' ? createOpenAIRuntime(options) : createGeminiRuntime();
};
