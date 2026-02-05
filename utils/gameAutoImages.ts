import { searchStockImages } from '../services/stockImageService';
import { GameConfig, GeneratedQuestion } from '../types';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'to', 'of', 'and', 'or', 'for', 'in', 'on', 'with', 'at', 'by', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'this', 'that', 'these', 'those', 'what', 'which', 'who',
  'whom', 'why', 'how', 'when', 'where', 'name', 'something', 'someone', 'somebody', 'before',
  'after', 'during', 'from', 'as', 'into', 'over', 'under', 'between', 'about', 'around',
  'i', 'me', 'my', 'mine', 'we', 'us', 'our', 'ours', 'you', 'your', 'yours',
  'he', 'him', 'his', 'she', 'her', 'hers', 'they', 'them', 'their', 'theirs',
]);

const AUX_WORDS = new Set([
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
  'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must',
]);

const TIME_WORDS = new Set([
  'ever', 'never', 'always', 'often', 'sometimes', 'usually', 'today', 'yesterday',
  'tomorrow', 'year', 'years', 'month', 'months', 'week', 'weeks', 'day', 'days',
  'time', 'times', 'moment', 'moments', 'ago', 'already', 'yet', 'since', 'recently',
  'many', 'much', 'few', 'several', 'some', 'any', 'each', 'every',
]);

const CONTEXT_WORDS = new Set([
  'sentence', 'sentences', 'grammar', 'grammatical', 'correct', 'incorrect', 'word', 'words',
  'question', 'questions', 'answer', 'answers', 'blank', 'choose', 'select', 'statement', 'phrase',
]);

const PROPER_NOUN_PHRASE = /\b(?:[A-Z][a-z]{2,})(?:\s+[A-Z][a-z]{2,})*\b/g;

const extractProperNounPhrases = (value: string) =>
  (value.match(PROPER_NOUN_PHRASE) || [])
    .map((phrase) => phrase.trim())
    .filter((phrase) => {
      const lower = phrase.toLowerCase();
      return !STOP_WORDS.has(lower);
    });

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[_/\\-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractKeywords = (value: string) => {
  const properNouns = new Set(
    (value.match(/\b[A-Z][a-z]{2,}\b/g) || []).map((token) => token.toLowerCase())
  );
  const properPhrases = extractProperNounPhrases(value);
  const tokens = normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token) && !AUX_WORDS.has(token) && !TIME_WORDS.has(token));

  const nounish = tokens.filter((token) => !token.endsWith('ly'));
  const nounishNoVerbish = nounish.filter((token) => !(token.endsWith('ed') || token.endsWith('ing')));
  const baseTokens = nounishNoVerbish.length ? nounishNoVerbish : nounish;
  const finalTokens = baseTokens.length ? baseTokens : tokens;
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const token of finalTokens) {
    if (!seen.has(token)) {
      seen.add(token);
      unique.push(token);
    }
  }
  return {
    tokens: unique,
    properPhrases,
  };
};

export const getGameImageQuery = (question: GeneratedQuestion, config: GameConfig) => {
  const aiKeywords = (question.imageKeywords || []).map((item) => String(item || '').trim()).filter(Boolean);
  if (aiKeywords.length) {
    return aiKeywords.slice(0, 2).join(' ');
  }
  const questionKeywords = extractKeywords(question.question || '');
  const answerKeywords = question.answer ? extractKeywords(question.answer) : { tokens: [], properPhrases: [] };
  const optionsText = Array.isArray(question.options) ? question.options.join(' ') : '';
  const optionKeywords = optionsText ? extractKeywords(optionsText) : { tokens: [], properPhrases: [] };
  const hasBlank = /_{3,}/.test(question.question || '');

  const questionTokens = questionKeywords.tokens;
  const questionMeaningful = questionTokens.filter((token) => !CONTEXT_WORDS.has(token));
  const isContextPrompt = questionTokens.length > 0 && questionMeaningful.length === 0;

  const sourceTokens = (() => {
    if (hasBlank || isContextPrompt) {
      const combined = [
        ...answerKeywords.tokens,
        ...optionKeywords.tokens,
      ];
      return combined.filter((token, idx, arr) => arr.indexOf(token) === idx);
    }
    if (questionTokens.length) return questionTokens;
    return answerKeywords.tokens.length ? answerKeywords.tokens : optionKeywords.tokens;
  })();

  const proper = (() => {
    if (answerKeywords.properPhrases.length) return answerKeywords.properPhrases;
    if (optionKeywords.properPhrases.length) return optionKeywords.properPhrases;
    if (!isContextPrompt && questionKeywords.properPhrases.length) return questionKeywords.properPhrases;
    return [];
  })();

  const meaningful = sourceTokens.filter((token) => !CONTEXT_WORDS.has(token));
  const trimmed = meaningful.length ? meaningful.slice(0, 2) : sourceTokens.slice(0, 2);

  if (proper.length) {
    return trimmed.length ? `${proper[0]} ${trimmed[0] || ''}`.trim() : proper[0];
  }
  if (trimmed.length) return trimmed.join(' ');
  const topic = (config.topic || '').trim();
  if (topic) return topic;
  return question.answer || '';
};

export const autoPickImagesForQuestions = async (
  questions: GeneratedQuestion[],
  config: GameConfig,
  cache?: Map<string, GeneratedQuestion['image'] | null>
) => {
  if (!import.meta.env.VITE_PIXABAY_API_KEY) {
    return questions;
  }
  const imageCache = cache ?? new Map<string, GeneratedQuestion['image'] | null>();
  const nextQuestions: GeneratedQuestion[] = [];

  for (const question of questions) {
    if (question.image?.url) {
      nextQuestions.push(question);
      continue;
    }

    const query = getGameImageQuery(question, config);
    const key = query.toLowerCase();
    if (!query) {
      nextQuestions.push(question);
      continue;
    }

    if (imageCache.has(key)) {
      const cached = imageCache.get(key);
      nextQuestions.push(cached ? { ...question, image: cached } : question);
      continue;
    }

    try {
      const data = await searchStockImages(query, { page: 1, perPage: 6, strict: true });
      const first = data.items[0];
      if (first) {
        const picked = {
          url: first.url,
          thumbUrl: first.thumbUrl,
          source: 'stock' as const,
          alt: first.alt || query,
        };
        imageCache.set(key, picked);
        nextQuestions.push({ ...question, image: picked });
      } else {
        imageCache.set(key, null);
        nextQuestions.push(question);
      }
    } catch (err) {
      console.warn('Game image auto-pick failed for query:', query, err);
      imageCache.set(key, null);
      nextQuestions.push(question);
    }
  }

  return nextQuestions;
};
