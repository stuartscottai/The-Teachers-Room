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

const PRIMARY_DEPRIORITIZED_WORDS = new Set([
  'very', 'more', 'most', 'less', 'least', 'much', 'many', 'few', 'little',
  'good', 'bad', 'better', 'best', 'worse', 'worst', 'right', 'wrong',
  'careful', 'carefully', 'quick', 'quickly', 'slow', 'slowly',
]);

const GENERIC_IMAGE_TERMS = new Set([
  'abstract', 'background', 'wallpaper', 'texture', 'icon', 'logo', 'symbol', 'template', 'banner',
  'pattern', 'clipart', '3d', 'render', 'illustration'
]);

const MIN_CONFIDENCE_SCORE = 6;
const MIN_CONFIDENCE_MARGIN = 2;

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
  const optionsText = Array.isArray(question.options) ? question.options.join(' ') : '';
  const optionKeywords = optionsText ? extractKeywords(optionsText) : { tokens: [], properPhrases: [] };
  const blankContext = hasBlank ? extractBlankContextTokens(rawQuestion) : [];

  if (!hasBlank && aiKeywords.length) {
    return aiKeywords.slice(0, 2).join(' ');
  }

  const questionTokens = questionKeywords.tokens;
  const questionMeaningful = questionTokens.filter((token) => !CONTEXT_WORDS.has(token));
  const isContextPrompt = questionTokens.length > 0 && questionMeaningful.length === 0;

  const sourceTokens = (() => {
    if (hasBlank || isContextPrompt) {
      const combined = [
        ...blankContext,
        ...questionMeaningful,
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

type ImageIntent = {
  query: string;
  queryTokens: string[];
  positiveTokens: string[];
  properPhrases: string[];
  answerTokens: string[];
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
  const optionKeywords = Array.isArray(question.options)
    ? extractKeywords(question.options.join(' '))
    : { tokens: [], properPhrases: [] };

  const properPhrases = uniqueStrings([
    ...answerKeywords.properPhrases,
    ...questionKeywords.properPhrases,
    ...optionKeywords.properPhrases,
  ]).slice(0, 2);

  const positiveTokens = uniqueStrings([
    ...aiKeywords.flatMap(toTokens),
    ...answerKeywords.tokens.slice(0, 3),
    ...questionKeywords.tokens.slice(0, 2),
    ...optionKeywords.tokens.slice(0, 2),
  ]).filter((token) => !CONTEXT_WORDS.has(token));

  const answerTokens = uniqueStrings(answerKeywords.tokens).slice(0, 3);
  const secondaryQuery = (() => {
    if (properPhrases.length) return properPhrases[0];
    if (answerTokens.length) return answerTokens.slice(0, 2).join(' ');
    return (config.topic || '').trim();
  })();

  return {
    query,
    queryTokens,
    positiveTokens,
    properPhrases,
    answerTokens,
    secondaryQuery,
    anchorTokens: queryTokens.map(normalizeSearchToken).filter((token) => !isGenericKeyword(token)).slice(0, 2),
  };
};

const scoreImageCandidate = (
  candidate: { alt: string; tags?: string; kind?: string; url: string },
  intent: ImageIntent
) => {
  const haystack = `${candidate.alt || ''} ${candidate.tags || ''}`.toLowerCase();
  const normalizedHaystack = normalizeText(haystack);
  const words = new Set(normalizedHaystack.split(' ').filter(Boolean));

  let score = 0;
  let tokenHits = 0;
  let answerHits = 0;
  let properHits = 0;
  let anchorHits = 0;

  for (const phrase of intent.properPhrases) {
    if (phrase && haystack.includes(phrase.toLowerCase())) {
      score += 6;
      properHits += 1;
    }
  }

  for (const token of intent.positiveTokens) {
    if (!token) continue;
    if (words.has(token)) {
      score += 3;
      tokenHits += 1;
      continue;
    }
    if (normalizedHaystack.includes(token)) {
      score += 1;
      tokenHits += 1;
    }
  }

  for (const token of intent.answerTokens) {
    if (!token) continue;
    if (words.has(token)) {
      score += 3;
      answerHits += 1;
      continue;
    }
    if (normalizedHaystack.includes(token)) {
      score += 1;
      answerHits += 1;
    }
  }

  for (const token of intent.anchorTokens) {
    if (!token) continue;
    if (words.has(token)) {
      score += 4;
      anchorHits += 1;
      continue;
    }
    if (normalizedHaystack.includes(token)) {
      score += 2;
      anchorHits += 1;
    }
  }

  const genericPenalty = Array.from(GENERIC_IMAGE_TERMS).reduce((acc, token) => {
    if (words.has(token) || normalizedHaystack.includes(token)) return acc + 1;
    return acc;
  }, 0);
  score -= genericPenalty;

  if (candidate.kind === 'photo') score += 1;
  if (candidate.kind === 'vector') score -= 1;

  return {
    score,
    tokenHits,
    answerHits,
    properHits,
    anchorHits,
    genericPenalty,
  };
};

const pickBestImageCandidate = (
  candidates: Array<{ id: string; url: string; thumbUrl: string; alt: string; kind?: 'photo' | 'illustration' | 'vector'; tags?: string }>,
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
  const hasSubstantiveMatch = best.metrics.tokenHits + best.metrics.answerHits > 0;
  const anchorSatisfied = intent.anchorTokens.length === 0 || best.metrics.anchorHits > 0;

  const confident =
    best.metrics.score >= MIN_CONFIDENCE_SCORE &&
    margin >= MIN_CONFIDENCE_MARGIN &&
    properSatisfied &&
    hasSubstantiveMatch &&
    anchorSatisfied;

  if (confident) return best.candidate;
  if (!opts?.relaxed) return null;

  // Relaxed fallback: prefer something semantically connected over returning no image.
  const hasAnySemanticHit = best.metrics.properHits > 0 || best.metrics.tokenHits > 0 || best.metrics.answerHits > 0;
  const notOverlyGeneric = best.metrics.genericPenalty <= 1;
  const acceptableScore = best.metrics.score >= 2 || hasAnySemanticHit;
  const hasAnchorSignal = intent.anchorTokens.length === 0 || best.metrics.anchorHits > 0;

  if (!acceptableScore) return null;
  if (!hasAnchorSignal) return null;
  if (!hasAnySemanticHit && !notOverlyGeneric) return null;

  return best.candidate;
};

const buildStagedSearchQueries = (question: GeneratedQuestion, intent: ImageIntent, config: GameConfig): string[] => {
  const questionTokens = extractKeywords(question.question || '').tokens;
  const queryTokens = intent.queryTokens;
  const queryRoots = new Set(queryTokens.map(toRootToken).filter(Boolean));

  const prioritizedQuestion = questionTokens
    .map(normalizeSearchToken)
    .filter((token) => token && !isPrimaryWeakKeyword(token));

  const prioritizedQuery = queryTokens
    .map(normalizeSearchToken)
    .filter((token) => token && !isPrimaryWeakKeyword(token));

  const matchedQuestionToken = prioritizedQuestion.find((token) => queryRoots.has(toRootToken(token)));
  const primaryKeyword =
    matchedQuestionToken ||
    prioritizedQuery[0] ||
    prioritizedQuestion[0] ||
    queryTokens.map(normalizeSearchToken).find((token) => token && !isGenericKeyword(token)) ||
    '';

  const secondaryPool = uniqueStrings([
    ...queryTokens.map(normalizeSearchToken),
    ...questionTokens.map(normalizeSearchToken),
    ...intent.answerTokens.map(normalizeSearchToken),
  ]).filter((token) => token && !isGenericKeyword(token) && toRootToken(token) !== toRootToken(primaryKeyword));
  const secondaryKeyword = secondaryPool[0] || '';

  const planned: string[] = [];
  if (primaryKeyword) planned.push(primaryKeyword);
  if (primaryKeyword && secondaryKeyword) planned.push(`${primaryKeyword} ${secondaryKeyword}`);
  if (intent.query) planned.push(intent.query);
  if (intent.secondaryQuery) planned.push(intent.secondaryQuery);
  const topic = (config.topic || '').trim();
  if (topic) planned.push(topic);

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
      nextQuestions.push(question);
      continue;
    }

    if (imageCache.has(key)) {
      const cached = imageCache.get(key);
      nextQuestions.push(cached ? { ...question, image: cached } : question);
      continue;
    }

    try {
      let pickedCandidate: ReturnType<typeof pickBestImageCandidate> = null;
      let relaxedFallback: ReturnType<typeof pickBestImageCandidate> = null;

      for (let idx = 0; idx < searchPlan.length; idx += 1) {
        const currentQuery = searchPlan[idx];
        const result = await searchStockImages(currentQuery, { page: 1, perPage: idx === 0 ? 24 : 20, strict: false });
        const candidatePool = Array.isArray(result.items) ? result.items : [];
        if (!candidatePool.length) continue;
        const primaryAnchor = normalizeSearchToken(searchPlan[0] || currentQuery);

        const queryIntent: ImageIntent = {
          ...intent,
          query: currentQuery,
          queryTokens: uniqueStrings(toTokens(currentQuery)),
          anchorTokens: primaryAnchor && !isGenericKeyword(primaryAnchor)
            ? [primaryAnchor]
            : uniqueStrings(toTokens(currentQuery).map(normalizeSearchToken)).filter((token) => !isGenericKeyword(token)),
        };

        const strictPick = pickBestImageCandidate(candidatePool, queryIntent);
        if (strictPick) {
          pickedCandidate = strictPick;
          break;
        }

        // Enforce user-requested flow: single keyword must fail before expanding to multi-word.
        if (idx === 0) continue;

        const relaxedPick = pickBestImageCandidate(candidatePool, queryIntent, { relaxed: true });
        if (relaxedPick && !relaxedFallback) {
          relaxedFallback = relaxedPick;
        }
      }

      if (!pickedCandidate && relaxedFallback) {
        pickedCandidate = relaxedFallback;
      }

      if (pickedCandidate) {
        const picked = {
          url: pickedCandidate.url,
          thumbUrl: pickedCandidate.thumbUrl,
          source: 'stock' as const,
          alt: pickedCandidate.alt || query,
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
