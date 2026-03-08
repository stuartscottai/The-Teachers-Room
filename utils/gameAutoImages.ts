import { searchStockImages } from '../services/stockImageService';
import { extractPixabaySourceUrl } from './stockImageUrl';
import { GameConfig, GeneratedQuestion } from '../types';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'to', 'of', 'and', 'or', 'for', 'in', 'on', 'with', 'at', 'by', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'this', 'that', 'these', 'those', 'what', 'which', 'who',
  'whom', 'why', 'how', 'when', 'where', 'name', 'something', 'someone', 'somebody', 'before',
  'after', 'during', 'from', 'as', 'into', 'over', 'under', 'between', 'about', 'around',
  'i', 'me', 'my', 'mine', 'we', 'us', 'our', 'ours', 'you', 'your', 'yours', 'it', 'its',
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

const PRIMARY_DEPRIORITIZED_WORDS = new Set([
  'very', 'more', 'most', 'less', 'least', 'much', 'many', 'few', 'little',
  'good', 'bad', 'better', 'best', 'worse', 'worst', 'right', 'wrong',
  'careful', 'carefully', 'quick', 'quickly', 'slow', 'slowly',
  'famous', 'largest', 'longest', 'smallest', 'oldest', 'newest', 'first', 'last',
  'call', 'called', 'name', 'named', 'known', 'person', 'people', 'someone', 'somebody',
  'study', 'studies', 'learn', 'learns', 'using', 'used', 'make', 'made', 'type', 'kind',
  'like', 'original', 'service',
  'world',
]);

const GENERIC_IMAGE_TERMS = new Set([
  'abstract', 'background', 'wallpaper', 'texture', 'icon', 'logo', 'symbol', 'template', 'banner',
  'pattern', 'clipart', '3d', 'render', 'illustration'
]);

const MIN_CONFIDENCE_SCORE = 6;
const MIN_CONFIDENCE_MARGIN = 2;
const QUESTION_FALLBACK_QUERY = 'question';
const QUESTION_FALLBACK_CACHE_KEY = '__fallback_question_image__';
const QUESTION_FALLBACK_POSITIVE = new Set(['question', 'mark', 'quiz', 'help', 'faq', 'symbol', 'icon']);
const QUESTION_FALLBACK_NEGATIVE = new Set(['person', 'people', 'portrait', 'face', 'selfie', 'model']);

const PROPER_NOUN_PHRASE = /\b(?:[A-Z][a-z]{2,})(?:\s+[A-Z][a-z]{2,})*\b/g;
const VISUAL_ING_EXCEPTIONS = new Set(['streaming', 'painting', 'building', 'clothing', 'wedding']);

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
  const nounishNoVerbish = nounish.filter((token) =>
    VISUAL_ING_EXCEPTIONS.has(token) || !(token.endsWith('ed') || token.endsWith('ing'))
  );
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

const deriveVisualHintTokens = (value: string): string[] => {
  const normalized = normalizeText(value);
  const hints: string[] = [];
  if (/\bstreaming service\b/.test(normalized) || /\boriginal series\b/.test(normalized)) {
    hints.push('television');
  }
  return uniqueStrings(hints);
};

const BLANK_CONTEXT_RE = /(?:\b([A-Za-z][A-Za-z'-]{2,})\b\s*)?_{3,}(?:\s*\b([A-Za-z][A-Za-z'-]{2,})\b)?/gi;

const extractBlankContextTokens = (value: string): string[] => {
  const out: string[] = [];
  if (!value) return out;
  let match: RegExpExecArray | null = null;
  while ((match = BLANK_CONTEXT_RE.exec(value)) !== null) {
    const before = normalizeSearchToken(match[1] || '');
    const after = normalizeSearchToken(match[2] || '');
    // Prioritize the word after the blank (often the semantic anchor in cloze prompts).
    if (after && !isGenericKeyword(after)) out.push(after);
    if (before && !isGenericKeyword(before)) out.push(before);
  }
  return uniqueStrings(out);
};

export const getGameImageQuery = (question: GeneratedQuestion, config: GameConfig) => {
  const rawQuestion = question.question || '';
  const hasBlank = /_{3,}/.test(rawQuestion);
  const aiKeywords = (question.imageKeywords || []).map((item) => String(item || '').trim()).filter(Boolean);
  const questionKeywords = extractKeywords(rawQuestion);
  const answerKeywords = question.answer ? extractKeywords(question.answer) : { tokens: [], properPhrases: [] };
  const blankContext = hasBlank ? extractBlankContextTokens(rawQuestion) : [];
  const answerRoots = new Set(answerKeywords.tokens.map(toRootToken).filter(Boolean));

  const questionTokens = questionKeywords.tokens;
  const questionMeaningful = questionTokens.filter((token) => !CONTEXT_WORDS.has(token));
  const isContextPrompt = questionTokens.length > 0 && questionMeaningful.length === 0;
  const toSearchTokens = (values: string[]) =>
    uniqueStrings(values.map(normalizeSearchToken))
      .filter((token) => token && !isGenericKeyword(token) && !isPrimaryWeakKeyword(token))
      .filter((token) => !answerRoots.has(toRootToken(token)));

  const questionQueryTokens = toSearchTokens(questionMeaningful);
  const hintQueryTokens = toSearchTokens(deriveVisualHintTokens(rawQuestion));
  const questionRoots = new Set(questionQueryTokens.map(toRootToken).filter(Boolean));
  const aiQueryTokens = toSearchTokens(aiKeywords.flatMap(toTokens)).filter((token) => {
    const root = toRootToken(token);
    if (!root) return false;
    if (!questionRoots.size) return true;
    return questionRoots.has(root);
  });
  const blankQueryTokens = toSearchTokens(blankContext);

  const primaryConceptToken =
    hintQueryTokens[0] ||
    aiQueryTokens[0] ||
    questionQueryTokens[0] ||
    '';

  const contextPool = uniqueStrings([
    ...hintQueryTokens,
    ...aiQueryTokens,
    ...(hasBlank || isContextPrompt ? blankQueryTokens : []),
    ...questionQueryTokens,
  ]).filter((token) => token && token !== primaryConceptToken);

  const picked = uniqueStrings([
    primaryConceptToken,
    ...contextPool,
  ]).filter(Boolean).slice(0, 2);

  if (picked.length) return picked.join(' ');
  const topic = (config.topic || '').trim();
  if (topic) return topic;
  return QUESTION_FALLBACK_QUERY;
};

type ImageIntent = {
  query: string;
  queryTokens: string[];
  positiveTokens: string[];
  properPhrases: string[];
  blockedTokens: string[];
  mustMatchTokens: string[];
  secondaryQuery: string;
  anchorTokens: string[];
};

const toTokens = (value: string): string[] =>
  normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 2);

const toRootToken = (value: string): string => {
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

const normalizeSearchToken = (value: string): string => {
  const first = toTokens(value)[0] || '';
  return toRootToken(first);
};

const isGenericKeyword = (value: string): boolean => {
  const token = toRootToken(value);
  if (!token) return true;
  return (
    token.length < 3 ||
    STOP_WORDS.has(token) ||
    AUX_WORDS.has(token) ||
    TIME_WORDS.has(token) ||
    CONTEXT_WORDS.has(token)
  );
};

const isPrimaryWeakKeyword = (value: string): boolean => {
  const token = toRootToken(value);
  if (isGenericKeyword(token)) return true;
  if (token.endsWith('ly')) return true;
  return PRIMARY_DEPRIORITIZED_WORDS.has(token);
};

const uniqueStrings = (values: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  values.forEach((raw) => {
    const next = String(raw || '').trim().toLowerCase();
    if (!next || seen.has(next)) return;
    seen.add(next);
    out.push(next);
  });
  return out;
};

const buildImageIntent = (question: GeneratedQuestion, config: GameConfig): ImageIntent => {
  const query = getGameImageQuery(question, config);
  const queryTokens = uniqueStrings(toTokens(query));
  const aiKeywords = (question.imageKeywords || []).map((item) => String(item || '').trim()).filter(Boolean);
  const questionKeywords = extractKeywords(question.question || '');
  const answerKeywords = question.answer ? extractKeywords(question.answer) : { tokens: [], properPhrases: [] };
  const answerRoots = new Set(answerKeywords.tokens.map(toRootToken).filter(Boolean));

  const properPhrases = uniqueStrings([
    ...questionKeywords.properPhrases,
  ]).slice(0, 2);

  const querySearchTokens = uniqueStrings(queryTokens.map(normalizeSearchToken))
    .filter((token) => token && !isGenericKeyword(token) && !isPrimaryWeakKeyword(token));
  const questionSearchTokens = uniqueStrings(questionKeywords.tokens.map(normalizeSearchToken))
    .filter((token) => token && !isGenericKeyword(token) && !isPrimaryWeakKeyword(token))
    .filter((token) => !answerRoots.has(toRootToken(token)));

  const positiveTokens = uniqueStrings([
    ...querySearchTokens,
    ...questionSearchTokens.slice(0, 2),
    ...aiKeywords.flatMap((value) => toTokens(value).map(normalizeSearchToken)),
    ...(config.topic ? toTokens(config.topic).slice(0, 1) : []),
  ]).filter((token) => token && !CONTEXT_WORDS.has(token) && !isGenericKeyword(token) && !isPrimaryWeakKeyword(token));

  const blockedTokens = uniqueStrings([
    ...answerKeywords.tokens.map(normalizeSearchToken),
    ...answerKeywords.properPhrases.flatMap((phrase) => toTokens(phrase).map(normalizeSearchToken)),
  ]).filter((token) => token && !isGenericKeyword(token)).slice(0, 6);

  const mustMatchTokens = uniqueStrings([
    ...querySearchTokens,
    ...questionSearchTokens,
  ])
    .filter((token) => token && !isGenericKeyword(token) && !isPrimaryWeakKeyword(token))
    .slice(0, 2);

  const secondaryQuery = (() => {
    if (properPhrases.length) return properPhrases[0];
    return (config.topic || '').trim();
  })();

  return {
    query,
    queryTokens,
    positiveTokens,
    properPhrases,
    blockedTokens,
    mustMatchTokens,
    secondaryQuery,
    anchorTokens: queryTokens.map(normalizeSearchToken).filter((token) => !isGenericKeyword(token)).slice(0, 2),
  };
};

const getLandscapePreference = (widthRaw?: number, heightRaw?: number) => {
  const width = Number.isFinite(Number(widthRaw)) ? Math.max(0, Number(widthRaw)) : 0;
  const height = Number.isFinite(Number(heightRaw)) ? Math.max(0, Number(heightRaw)) : 0;
  if (width <= 0 || height <= 0) {
    return { aspectRatio: 0, orientationScore: 0 };
  }

  const aspectRatio = width / height;
  let orientationScore = 0;
  if (aspectRatio >= 1.6) orientationScore = 3;
  else if (aspectRatio >= 1.2) orientationScore = 2;
  else if (aspectRatio >= 1.0) orientationScore = 1;
  else if (aspectRatio >= 0.85) orientationScore = -1;
  else orientationScore = -3;

  return { aspectRatio, orientationScore };
};

const scoreImageCandidate = (
  candidate: { alt: string; tags?: string; kind?: string; url: string; thumbUrl?: string; width?: number; height?: number },
  intent: ImageIntent
) => {
  const haystack = `${candidate.alt || ''} ${candidate.tags || ''}`.toLowerCase();
  const normalizedHaystack = normalizeText(haystack);
  const words = new Set(normalizedHaystack.split(' ').filter(Boolean));
  const rootWords = new Set(Array.from(words).map((token) => toRootToken(token)).filter(Boolean));

  let score = 0;
  let tokenHits = 0;
  let blockedHits = 0;
  let properHits = 0;
  let anchorHits = 0;
  let mustMatchHits = 0;
  let phraseHit = 0;

  const inferWidthFromUrl = (value: string): number => {
    const source = extractPixabaySourceUrl(value || '') || String(value || '');
    const match = source.match(/_(\d+)\.(?:jpe?g|png|webp)(?:[?#].*)?$/i);
    const width = match ? Number(match[1]) : 0;
    return Number.isFinite(width) ? width : 0;
  };

  const inferredWidth = Math.max(
    inferWidthFromUrl(candidate.url || ''),
    inferWidthFromUrl(candidate.thumbUrl || '')
  );
  const { aspectRatio, orientationScore } = getLandscapePreference(candidate.width, candidate.height);

  for (const phrase of intent.properPhrases) {
    if (phrase && haystack.includes(phrase.toLowerCase())) {
      score += 6;
      properHits += 1;
    }
  }

  for (const token of intent.positiveTokens) {
    if (!token) continue;
    const tokenRoot = toRootToken(token);
    if ((tokenRoot && rootWords.has(tokenRoot)) || words.has(token)) {
      score += 3;
      tokenHits += 1;
      continue;
    }
    if (normalizedHaystack.includes(token)) {
      score += 1;
      tokenHits += 1;
    }
  }

  for (const token of intent.blockedTokens) {
    if (!token) continue;
    const tokenRoot = toRootToken(token);
    if ((tokenRoot && rootWords.has(tokenRoot)) || words.has(token)) {
      score -= 3;
      blockedHits += 1;
      continue;
    }
    if (normalizedHaystack.includes(token)) {
      score -= 1;
      blockedHits += 1;
    }
  }

  for (const token of intent.anchorTokens) {
    if (!token) continue;
    const tokenRoot = toRootToken(token);
    if ((tokenRoot && rootWords.has(tokenRoot)) || words.has(token)) {
      score += 4;
      anchorHits += 1;
      continue;
    }
    if (normalizedHaystack.includes(token)) {
      score += 2;
      anchorHits += 1;
    }
  }

  for (const token of intent.mustMatchTokens) {
    if (!token) continue;
    const tokenRoot = toRootToken(token);
    if ((tokenRoot && rootWords.has(tokenRoot)) || words.has(token)) {
      mustMatchHits += 1;
      continue;
    }
    if (normalizedHaystack.includes(token)) {
      mustMatchHits += 1;
    }
  }

  const normalizedQuery = normalizeText(intent.query || '');
  if (normalizedQuery && normalizedQuery.length > 4 && normalizedQuery.includes(' ') && normalizedHaystack.includes(normalizedQuery)) {
    score += 8;
    phraseHit = 1;
  }

  const genericPenalty = Array.from(GENERIC_IMAGE_TERMS).reduce((acc, token) => {
    if (words.has(token) || normalizedHaystack.includes(token)) return acc + 1;
    return acc;
  }, 0);
  score -= genericPenalty;

  if (candidate.kind === 'photo') score += 1;
  if (candidate.kind === 'vector') score -= 1;

  let resolutionScore = 0;
  if (inferredWidth >= 1280) resolutionScore = 3;
  else if (inferredWidth >= 960) resolutionScore = 2;
  else if (inferredWidth >= 640) resolutionScore = 1;
  else if (inferredWidth > 0 && inferredWidth < 480) resolutionScore = -3;
  score += resolutionScore;
  score += orientationScore;

  return {
    score,
    tokenHits,
    blockedHits,
    properHits,
    anchorHits,
    mustMatchHits,
    phraseHit,
    inferredWidth,
    resolutionScore,
    aspectRatio,
    orientationScore,
    genericPenalty,
  };
};

const pickBestImageCandidate = (
  candidates: Array<{ id: string; url: string; thumbUrl: string; alt: string; kind?: 'photo' | 'illustration' | 'vector'; tags?: string; width?: number; height?: number }>,
  intent: ImageIntent,
  opts?: { relaxed?: boolean }
) => {
  if (!candidates.length) return null;

  const ranked = candidates
    .map((candidate) => ({ candidate, metrics: scoreImageCandidate(candidate, intent) }))
    .sort((a, b) => b.metrics.score - a.metrics.score);

  const best = ranked[0];
  if (!best) return null;
  const second = ranked[1];
  const margin = second ? best.metrics.score - second.metrics.score : best.metrics.score;
  const needsProperPhrase = intent.properPhrases.length > 0;
  const properSatisfied = !needsProperPhrase || best.metrics.properHits > 0;
  const hasSubstantiveMatch = best.metrics.tokenHits > 0;
  const requiredAnchorHits = Math.min(2, intent.anchorTokens.length);
  const anchorSatisfied = requiredAnchorHits === 0 || best.metrics.anchorHits >= requiredAnchorHits;
  const requiredMustMatchHits = Math.min(2, intent.mustMatchTokens.length);
  const mustMatchSatisfied = requiredMustMatchHits === 0 || best.metrics.mustMatchHits >= requiredMustMatchHits;
  const hasStrongQueryMatch = anchorSatisfied && mustMatchSatisfied;
  const blockedSatisfied =
    best.metrics.blockedHits === 0 ||
    best.metrics.phraseHit > 0 ||
    (hasStrongQueryMatch && best.metrics.blockedHits <= 1);
  const resolutionSatisfied =
    best.metrics.inferredWidth === 0 ||
    best.metrics.inferredWidth >= 640 ||
    best.metrics.phraseHit > 0;

  const confident =
    best.metrics.score >= MIN_CONFIDENCE_SCORE &&
    margin >= MIN_CONFIDENCE_MARGIN &&
    properSatisfied &&
    hasSubstantiveMatch &&
    anchorSatisfied &&
    mustMatchSatisfied &&
    blockedSatisfied &&
    resolutionSatisfied;

  if (confident) return best.candidate;
  if (!opts?.relaxed) return null;

  // Relaxed fallback: prefer something semantically connected over returning no image.
  const hasAnySemanticHit = best.metrics.properHits > 0 || best.metrics.tokenHits > 0;
  const notOverlyGeneric = best.metrics.genericPenalty <= 1;
  const acceptableScore = best.metrics.score >= 2 || hasAnySemanticHit;
  const hasAnchorSignal = intent.anchorTokens.length === 0 || best.metrics.anchorHits > 0;
  const hasRequiredTokenSignal = intent.mustMatchTokens.length === 0 || best.metrics.mustMatchHits > 0;
  const relaxedStrongQueryMatch = (requiredAnchorHits === 0 || best.metrics.anchorHits >= 1) && hasRequiredTokenSignal;

  if (!acceptableScore) return null;
  if (!hasAnchorSignal) return null;
  if (!hasRequiredTokenSignal) return null;
  if (best.metrics.blockedHits > 1 && !relaxedStrongQueryMatch && best.metrics.phraseHit === 0) return null;
  if (best.metrics.inferredWidth > 0 && best.metrics.inferredWidth < 480 && best.metrics.phraseHit === 0) return null;
  if (!hasAnySemanticHit && !notOverlyGeneric) return null;

  return best.candidate;
};

const buildStagedSearchQueries = (question: GeneratedQuestion, intent: ImageIntent, config: GameConfig): string[] => {
  const planned: string[] = [];
  if (intent.query && intent.query.trim()) planned.push(intent.query.trim());
  const topic = (config.topic || '').trim();
  if (!planned.length && topic) planned.push(topic);

  const seen = new Set<string>();
  const uniquePlanned: string[] = [];
  for (const raw of planned) {
    const normalized = String(raw || '').trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    uniquePlanned.push(String(raw).trim());
  }
  return uniquePlanned;
};

const scoreQuestionFallbackCandidate = (
  candidate: { alt: string; tags?: string; kind?: string }
) => {
  const normalized = normalizeText(`${candidate.alt || ''} ${candidate.tags || ''}`);
  const words = new Set(normalized.split(' ').filter(Boolean));
  let score = 0;
  for (const token of QUESTION_FALLBACK_POSITIVE) {
    if (words.has(token) || normalized.includes(token)) score += token === 'question' ? 5 : 2;
  }
  if (normalized.includes('question mark') || (words.has('question') && words.has('mark'))) {
    score += 4;
  }
  for (const token of QUESTION_FALLBACK_NEGATIVE) {
    if (words.has(token) || normalized.includes(token)) score -= 2;
  }
  if (candidate.kind === 'vector' || candidate.kind === 'illustration') score += 1;
  if (candidate.kind === 'photo') score -= 1;
  return score;
};

const getQuestionFallbackImage = async (
  imageCache: Map<string, GeneratedQuestion['image'] | null>
): Promise<GeneratedQuestion['image'] | null> => {
  if (imageCache.has(QUESTION_FALLBACK_CACHE_KEY)) {
    return imageCache.get(QUESTION_FALLBACK_CACHE_KEY) || null;
  }

  try {
    const result = await searchStockImages(QUESTION_FALLBACK_QUERY, { page: 1, perPage: 24, strict: false });
    const candidates = Array.isArray(result.items) ? result.items : [];
    if (!candidates.length) {
      imageCache.set(QUESTION_FALLBACK_CACHE_KEY, null);
      return null;
    }

    const pickedCandidate = [...candidates].sort(
      (a, b) => scoreQuestionFallbackCandidate(b) - scoreQuestionFallbackCandidate(a)
    )[0];
    if (!pickedCandidate) {
      imageCache.set(QUESTION_FALLBACK_CACHE_KEY, null);
      return null;
    }

    const picked = {
      url: pickedCandidate.url,
      thumbUrl: pickedCandidate.thumbUrl,
      source: 'stock' as const,
      alt: QUESTION_FALLBACK_QUERY,
    };
    imageCache.set(QUESTION_FALLBACK_CACHE_KEY, picked);
    return picked;
  } catch {
    imageCache.set(QUESTION_FALLBACK_CACHE_KEY, null);
    return null;
  }
};

export const autoPickImagesForQuestions = async (
  questions: GeneratedQuestion[],
  config: GameConfig,
  cache?: Map<string, GeneratedQuestion['image'] | null>
) => {
  const imageCache = cache ?? new Map<string, GeneratedQuestion['image'] | null>();
  const nextQuestions: GeneratedQuestion[] = [];

  for (const question of questions) {
    if (question.image?.url) {
      nextQuestions.push(question);
      continue;
    }

    const intent = buildImageIntent(question, config);
    const query = intent.query || (config.topic || '').trim();
    const searchPlan = buildStagedSearchQueries(question, intent, config);
    const key = (query || searchPlan[0] || '').toLowerCase();
    if (!searchPlan.length) {
      const fallbackImage = await getQuestionFallbackImage(imageCache);
      if (fallbackImage) {
        nextQuestions.push({ ...question, image: fallbackImage });
      } else {
        nextQuestions.push(question);
      }
      continue;
    }

    if (imageCache.has(key)) {
      const cached = imageCache.get(key);
      if (cached) {
        nextQuestions.push({ ...question, image: cached });
      } else {
        const fallbackImage = await getQuestionFallbackImage(imageCache);
        nextQuestions.push(fallbackImage ? { ...question, image: fallbackImage } : question);
      }
      continue;
    }

    try {
      let pickedCandidate: ReturnType<typeof pickBestImageCandidate> = null;
      let relaxedFallback: ReturnType<typeof pickBestImageCandidate> = null;
      let pickedQuery = query || searchPlan[0] || '';

      for (let idx = 0; idx < searchPlan.length; idx += 1) {
        const currentQuery = searchPlan[idx];
        const currentQueryTokens = uniqueStrings(toTokens(currentQuery).map(normalizeSearchToken))
          .filter((token) => token && !isGenericKeyword(token) && !isPrimaryWeakKeyword(token));
        const primaryAnchor = normalizeSearchToken(searchPlan[0] || currentQuery);
        const anchorTokens = currentQueryTokens.slice(0, 2);
        if (!anchorTokens.length && primaryAnchor && !isGenericKeyword(primaryAnchor)) {
          anchorTokens.push(primaryAnchor);
        }
        const queryIntentBase: ImageIntent = {
          ...intent,
          query: currentQuery,
          queryTokens: uniqueStrings(toTokens(currentQuery)),
          anchorTokens,
          mustMatchTokens: currentQueryTokens.slice(0, 2),
        };

        const strictResult = await searchStockImages(currentQuery, { page: 1, perPage: 24, strict: true });
        const strictPool = Array.isArray(strictResult.items) ? strictResult.items : [];
        const allowRelaxed = searchPlan.length === 1 || idx > 0;

        if (strictPool.length) {
          const strictPick = pickBestImageCandidate(strictPool, queryIntentBase);
          if (strictPick) {
            pickedCandidate = strictPick;
            pickedQuery = currentQuery;
          } else if (allowRelaxed) {
            const relaxedPick = pickBestImageCandidate(strictPool, queryIntentBase, { relaxed: true });
            if (relaxedPick && !relaxedFallback) {
              relaxedFallback = relaxedPick;
              pickedQuery = currentQuery;
            }
          }
        } else {
          const broadResult = await searchStockImages(currentQuery, { page: 1, perPage: 24, strict: false });
          const broadPool = Array.isArray(broadResult.items) ? broadResult.items : [];
          if (broadPool.length) {
            const strictPick = pickBestImageCandidate(broadPool, queryIntentBase);
            if (strictPick) {
              pickedCandidate = strictPick;
              pickedQuery = currentQuery;
            } else if (allowRelaxed) {
              const relaxedPick = pickBestImageCandidate(broadPool, queryIntentBase, { relaxed: true });
              if (relaxedPick && !relaxedFallback) {
                relaxedFallback = relaxedPick;
                pickedQuery = currentQuery;
              }
            }
          }
        }

        if (pickedCandidate) break;
      }

      if (!pickedCandidate && relaxedFallback) {
        pickedCandidate = relaxedFallback;
      }

      if (pickedCandidate) {
        const picked = {
          url: pickedCandidate.url,
          thumbUrl: pickedCandidate.thumbUrl,
          source: 'stock' as const,
          alt: (pickedQuery || query || pickedCandidate.alt || QUESTION_FALLBACK_QUERY).trim(),
        };
        imageCache.set(key, picked);
        nextQuestions.push({ ...question, image: picked });
      } else {
        const fallbackImage = await getQuestionFallbackImage(imageCache);
        if (fallbackImage) {
          imageCache.set(key, fallbackImage);
          nextQuestions.push({ ...question, image: fallbackImage });
        } else {
          imageCache.set(key, null);
          nextQuestions.push(question);
        }
      }
    } catch (err) {
      console.warn('Game image auto-pick failed for query:', query, err);
      const fallbackImage = await getQuestionFallbackImage(imageCache);
      if (fallbackImage) {
        imageCache.set(key, fallbackImage);
        nextQuestions.push({ ...question, image: fallbackImage });
      } else {
        imageCache.set(key, null);
        nextQuestions.push(question);
      }
    }
  }

  return nextQuestions;
};
