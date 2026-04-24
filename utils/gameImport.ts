import { jsonrepair } from 'jsonrepair';
import { GameConfig, GameType, GeneratedGame, GeneratedQuestion, JeopardyCategory, SurveyAnswer } from '../types';

const WORD_WHEEL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const WORD_WHEEL_CONTAINS_HARD = new Set(['Q', 'V', 'X', 'Y', 'Z']);

export const MANUAL_GAME_IMPORT_ACCEPT = '.json,.txt,.md';

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const isRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const roundNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
};

const clampPositiveInteger = (value: unknown, fallback: number, minimum = 1) =>
  Math.max(minimum, roundNumber(value, fallback));

const dedupeStrings = (values: string[], maxItems = Number.POSITIVE_INFINITY) => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of values) {
    const text = raw.trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= maxItems) break;
  }

  return result;
};

const normalizeStringArray = (value: unknown, maxItems = Number.POSITIVE_INFINITY) => {
  if (!Array.isArray(value)) return [];

  const mapped = value
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      if (isRecord(entry)) {
        return asText(entry.text ?? entry.value ?? entry.label ?? entry.name ?? '');
      }
      return '';
    })
    .filter(Boolean);

  return dedupeStrings(mapped, maxItems);
};

const normalizeDifficulty = (value: unknown): GeneratedQuestion['difficulty'] | undefined => {
  const text = asText(value).toLowerCase();
  if (text === 'easy' || text === 'medium' || text === 'hard') return text;
  return undefined;
};

const normalizeBonusType = (value: unknown): GeneratedQuestion['bonusType'] | undefined => {
  const text = asText(value).toLowerCase();
  if (text === 'none' || text === 'double' || text === 'bust' || text === 'steal') return text;
  return undefined;
};

const normalizeLetter = (value: unknown) =>
  asText(value)
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 1);

const getDefaultQuestionPoints = (config: GameConfig, index: number, scope: 'standard' | 'jeopardy' | 'pubquiz') => {
  if (scope === 'jeopardy') return (index + 1) * 100;
  if (scope === 'pubquiz') return 1;
  if (config.type === GameType.WORD_WHEEL) return 10;
  return 100;
};

const normalizeSurveyAnswers = (value: unknown): SurveyAnswer[] => {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const answers: SurveyAnswer[] = [];

  for (const raw of value) {
    if (answers.length >= 8) break;

    const text =
      typeof raw === 'string'
        ? raw.trim()
        : isRecord(raw)
          ? asText(raw.text ?? raw.answer ?? raw.value ?? raw.name)
          : '';

    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const scoreSource = isRecord(raw) ? raw.score : undefined;
    const score = Math.max(0, roundNumber(scoreSource, Math.max(5, 100 - answers.length * 10)));
    const alts = isRecord(raw)
      ? normalizeStringArray(raw.alts ?? raw.aliases ?? raw.acceptedAnswers, 5)
      : [];

    answers.push(alts.length ? { text, score, alts } : { text, score });
  }

  return answers;
};

const normalizeQuestionOptions = (value: unknown) => normalizeStringArray(value, 8);

const normalizeQuestionImageKeywords = (value: unknown) => normalizeStringArray(value, 2);

const normalizeQuestion = (
  raw: unknown,
  config: GameConfig,
  index: number,
  scope: 'standard' | 'jeopardy' | 'pubquiz',
  groupName?: string
): GeneratedQuestion => {
  const record = isRecord(raw) ? raw : {};
  const surveyAnswers =
    config.type === GameType.SURVEY_SHOWDOWN
      ? normalizeSurveyAnswers(record.surveyAnswers ?? record.answers ?? record.responses)
      : [];
  const options = normalizeQuestionOptions(record.options ?? record.choices ?? record.choiceOptions);
  const answer =
    asText(record.answer ?? record.correctAnswer ?? record.solution ?? record.correct) ||
    (surveyAnswers.length ? surveyAnswers[0].text : '');
  const question = asText(record.question ?? record.prompt ?? record.clue ?? record.text);
  const imageKeywords = normalizeQuestionImageKeywords(record.imageKeywords);
  const answerAliases =
    config.type === GameType.WORD_WHEEL
      ? normalizeStringArray(record.answerAliases ?? record.aliases ?? record.acceptedAnswers, 8)
      : [];

  const normalized: GeneratedQuestion = {
    id: Number.isFinite(Number(record.id)) ? Math.max(0, Math.round(Number(record.id))) : index,
    question,
    answer,
    points: clampPositiveInteger(record.points, getDefaultQuestionPoints(config, index, scope)),
    isBonus: Boolean(record.isBonus),
    ...(groupName ? { category: groupName } : {}),
    ...(options.length ? { options } : {}),
    ...(normalizeDifficulty(record.difficulty) ? { difficulty: normalizeDifficulty(record.difficulty) } : {}),
    ...(normalizeBonusType(record.bonusType) ? { bonusType: normalizeBonusType(record.bonusType) } : {}),
    ...(imageKeywords.length ? { imageKeywords } : {}),
    ...(surveyAnswers.length ? { surveyAnswers } : {}),
    ...(answerAliases.length ? { answerAliases } : {}),
  };

  if (config.type === GameType.WORD_WHEEL) {
    normalized.letter = normalizeLetter(record.letter) || WORD_WHEEL_LETTERS[index] || '';
    normalized.points = 10;
    normalized.isBonus = false;
    delete normalized.options;
  }

  if (config.type === GameType.SURVEY_SHOWDOWN) {
    normalized.surveyAnswers = surveyAnswers;
  }

  return normalized;
};

const normalizeGroupedQuestions = (
  value: unknown,
  config: GameConfig,
  scope: 'jeopardy' | 'pubquiz'
): JeopardyCategory[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((rawGroup, groupIndex) => {
      const record = isRecord(rawGroup) ? rawGroup : {};
      const fallbackName = scope === 'jeopardy' ? `Category ${groupIndex + 1}` : `Round ${groupIndex + 1}`;
      const name = asText(record.name ?? record.title ?? record.category) || fallbackName;
      const rawQuestions = Array.isArray(record.questions)
        ? record.questions
        : Array.isArray(record.items)
          ? record.items
          : [];
      const questions = rawQuestions.map((rawQuestion, questionIndex) =>
        normalizeQuestion(rawQuestion, config, questionIndex, scope, name)
      );
      return { name, questions };
    })
    .filter((group) => group.questions.length > 0);
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

const getImportMcInstruction = (config: GameConfig, includeConditionalPrefix = false) => {
  const policy = getGameMcOptionPolicy(config);
  if (!policy) return '';

  if (policy.mode === 'fixed') {
    return includeConditionalPrefix
      ? `If you include multiple-choice questions, each one must have exactly ${policy.count} options.`
      : `Each multiple-choice question must have exactly ${policy.count} options.`;
  }

  return includeConditionalPrefix
    ? 'If you include multiple-choice questions, vary the number of options between 2, 3, and 4 based on the question. Do not default to 4 options.'
    : 'Vary the number of options between 2, 3, and 4 across the multiple-choice questions based on the question. Do not default to 4 options.';
};

const getSampleMcOptionCount = (config: GameConfig) => {
  const policy = getGameMcOptionPolicy(config);
  if (!policy) return null;
  return policy.mode === 'fixed' ? policy.count : 3;
};

const getImportJsonParseErrorMessage = () =>
  [
    'Could not read that pasted result.',
    'Ask your AI tool to return JSON only, make sure any quotation marks inside a question stay inside the sentence, remove trailing commas, and make sure the reply was not cut off.',
    'Example: "question": "Find the paraphrase for \\\"if I hadn\'t revised\\\"."',
  ].join(' ');

const normalizeLikelyAiJsonText = (text: string) =>
  String(text || '')
    .replace(/^\uFEFF/, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');

const nextNonWhitespaceChar = (text: string, startIndex: number) => {
  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];
    if (!/\s/.test(char)) return char;
  }
  return '';
};

const repairLikelyAiJsonText = (text: string) => {
  const normalized = normalizeLikelyAiJsonText(text);
  let result = '';
  let inString = false;
  let escaping = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (!inString) {
      if (char === '"') {
        inString = true;
      }
      result += char;
      continue;
    }

    if (escaping) {
      result += char;
      escaping = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escaping = true;
      continue;
    }

    if (char === '\r') continue;
    if (char === '\n') {
      result += '\\n';
      continue;
    }

    if (char === '"') {
      const nextChar = nextNonWhitespaceChar(normalized, index + 1);
      const isClosingQuote =
        nextChar === '' ||
        nextChar === ',' ||
        nextChar === '}' ||
        nextChar === ']' ||
        nextChar === ':';

      if (isClosingQuote) {
        inString = false;
        result += char;
      } else {
        result += '\\"';
      }
      continue;
    }

    result += char;
  }

  return result;
};

const parseImportedJsonText = (text: string) => {
  const normalizedText = normalizeLikelyAiJsonText(text);
  const repairedText = repairLikelyAiJsonText(normalizedText);
  const candidateTextFactories = [
    () => text,
    () => normalizedText,
    () => repairedText,
    () => jsonrepair(normalizedText),
    () => jsonrepair(repairedText),
  ];
  const tried = new Set<string>();

  for (const getCandidateText of candidateTextFactories) {
    let candidateText = '';
    try {
      candidateText = getCandidateText();
    } catch {
      continue;
    }

    if (!candidateText || tried.has(candidateText)) continue;
    tried.add(candidateText);

    try {
      return JSON.parse(candidateText);
    } catch {
      // Try the next recovery strategy.
    }
  }

  throw new Error(getImportJsonParseErrorMessage());
};

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

  rawQuestions.forEach((rawQuestion, index) => {
    const answer = String(rawQuestion?.answer || '').trim();
    const fallbackLetter = answer
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 1);
    const letter = normalizeLetter(rawQuestion?.letter) || fallbackLetter || WORD_WHEEL_LETTERS[index] || '';
    if (!letter || !WORD_WHEEL_LETTERS.includes(letter) || byLetter.has(letter)) return;

    const question = String(rawQuestion?.question || '').trim();
    const isValidForLetter = answerMatchesWordWheelRule(answer, letter, rule);

    byLetter.set(letter, {
      id: index,
      letter,
      question,
      answer: isValidForLetter ? answer : '',
      answerAliases: normalizeAliases(rawQuestion?.answerAliases, answer),
      points: 10,
      isBonus: false,
      ...(rawQuestion?.imageKeywords ? { imageKeywords: normalizeStringArray(rawQuestion.imageKeywords, 2) } : {}),
    });
  });

  return WORD_WHEEL_LETTERS.map((letter, index) => {
    const existing = byLetter.get(letter);
    if (existing) {
      return {
        ...existing,
        id: index,
        letter,
        points: 10,
        isBonus: false,
      };
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

const getJsonOnlyTemplate = (config: GameConfig) => {
  const title = config.title?.trim() || `${config.type} Import`;

  if (config.type === GameType.STOP_THE_FIRE) {
    return JSON.stringify(
      {
        title,
        stopTheFireCategories: ['Category 1', 'Category 2', 'Category 3'],
      },
      null,
      2
    );
  }

  if (config.type === GameType.JEOPARDY) {
    return JSON.stringify(
      {
        title,
        jeopardyBoard: [
          {
            name: (config.jeopardyCategoryNames || []).find((entry) => entry.trim()) || 'Category 1',
            questions: [
              {
                id: 1,
                question: 'Question text',
                answer: 'Correct answer',
                points: 100,
                isBonus: false,
              },
            ],
          },
        ],
      },
      null,
      2
    );
  }

  if (config.type === GameType.PUB_QUIZ) {
    return JSON.stringify(
      {
        title,
        pubQuizRounds: [
          {
            name: (config.pubQuizRoundNames || []).find((entry) => entry.trim()) || 'Round 1',
            questions: [
              {
                id: 1,
                question: 'Question text',
                answer: 'Correct answer',
                points: 1,
                isBonus: false,
              },
            ],
          },
        ],
      },
      null,
      2
    );
  }

  const sampleQuestion: Record<string, any> = {
    id: 1,
    question: config.type === GameType.WORD_WHEEL ? 'Concise clue for the answer' : 'Question text',
    answer: 'Correct answer',
    points: config.type === GameType.WORD_WHEEL ? 10 : 100,
    isBonus: false,
  };

  const sampleMcOptionCount = getSampleMcOptionCount(config);
  if (config.type === GameType.MILLIONAIRE || (config.questionType === 'multiple-choice' && sampleMcOptionCount)) {
    sampleQuestion.options = Array.from({ length: config.type === GameType.MILLIONAIRE ? 4 : sampleMcOptionCount || 3 }).map(
      (_, index) => `Option ${index + 1}`
    );
    sampleQuestion.answer = 'Option 1';
  }

  if (config.type === GameType.DARTS) {
    sampleQuestion.difficulty = 'easy';
  }

  if (config.type === GameType.SURVEY_SHOWDOWN) {
    sampleQuestion.surveyAnswers = [
      { text: 'Top answer', score: 35, alts: ['Variation 1', 'Variation 2'] },
      { text: 'Second answer', score: 22, alts: ['Variation 3'] },
    ];
    sampleQuestion.answer = 'Top answer';
  }

  if (config.type === GameType.WORD_WHEEL) {
    sampleQuestion.letter = 'A';
    sampleQuestion.answerAliases = ['Accepted alternative'];
  }

  return JSON.stringify({ title, questions: [sampleQuestion] }, null, 2);
};

const getQuestionStyleInstruction = (config: GameConfig) => {
  if (config.type === GameType.MILLIONAIRE) return 'multiple-choice';
  if (config.type === GameType.SURVEY_SHOWDOWN) return 'survey style';
  if (config.type === GameType.WORD_WHEEL) return 'short clue per letter';
  if (config.type === GameType.STOP_THE_FIRE) return 'category bank';

  switch (config.questionType) {
    case 'multiple-choice':
      return 'multiple-choice';
    case 'gap-fill':
      return 'gap-fill';
    case 'open':
      return 'open-ended';
    case 'mixed':
      return 'mixed';
    case 'ai-decide':
      return 'varied formats chosen by the model';
    default:
      return 'mixed';
  }
};

type ExternalPromptPointsStrategy = 'fixed' | 'random' | 'ai-random' | 'manual';

const getPointsStrategyInstruction = (
  config: GameConfig,
  strategyOverride?: ExternalPromptPointsStrategy
) => {
  if (config.type === GameType.MILLIONAIRE) return '';
  if (config.type === GameType.JEOPARDY) return 'Use increasing Jeopardy-style point values by row.';
  if (config.type === GameType.PUB_QUIZ) return 'Use 1 point per question unless a round clearly needs a different value.';
  if (config.type === GameType.WORD_WHEEL) return 'Use 10 points for every entry.';
  if (config.type === GameType.DARTS) return 'Use sensible point values; difficulty matters more than points for this import.';
  if (config.type === GameType.STOP_THE_FIRE) return '';

  const strategy = strategyOverride || config.pointsMode || 'fixed';

  switch (strategy) {
    case 'random':
      return 'Assign random point values across the question set. Do not keep every question at the same value.';
    case 'ai-random':
      return 'Assign point values based on difficulty using a sensible spread.';
    case 'manual':
      return 'Use simple editable point values because points may be adjusted manually later.';
    default:
      return 'Use consistent point values unless the game format strongly suggests otherwise.';
  }
};

export const buildExternalLlmGamePrompt = (
  config: GameConfig,
  options?: { pointsStrategy?: ExternalPromptPointsStrategy }
) => {
  const title = config.title?.trim() || `${config.type} Import`;
  const topic = config.topic?.trim();
  const customInstructions = config.customInstructions?.trim();
  const questionStyle = getQuestionStyleInstruction(config);
  const pointsStrategy = getPointsStrategyInstruction(config, options?.pointsStrategy);
  const lines = [
    'Return ONLY valid JSON.',
    'Do not wrap the response in markdown or code fences.',
    'Do not add notes, explanations, headings, or comments.',
    'JSON SAFETY RULES:',
    'Use straight double quotes (") for every JSON key and every string value. Never use smart quotes like “ ” or ‘ ’.',
    'If text inside a string contains quotation marks, escape them as \\".',
    'Escape backslashes as \\\\ when needed.',
    'Do not put literal line breaks inside string values. Use \\n if a line break is required inside a value.',
    'Do not use trailing commas.',
    `Example of valid escaping: "question": "Find the paraphrase for \\\"if I hadn't revised\\\"."`,
    `If a question needs quoted wording inside the visible text, prefer single quotes in the question itself, for example: What is a paraphrase for 'If I hadn't revised'?`,
    'Before sending the final answer, verify that it would parse with JSON.parse.',
    `This JSON will be imported into a classroom game app for the game type "${config.type}".`,
    `Use the title "${title}".`,
    `Question style: ${questionStyle}.`,
  ];

  if (config.type === GameType.MILLIONAIRE || QUESTION_TYPES_WITH_MCQ.has(config.questionType)) {
    lines.push('Distribute correct answer positions as evenly as possible across the available option letters. Do not overuse any single position.');
  }

  if (topic) {
    lines.push(`Topic / theme: ${topic}.`);
  }

  if (pointsStrategy) {
    lines.push(`Points strategy: ${pointsStrategy}`);
  }

  if (customInstructions) {
    lines.push(`Additional instructions: ${customInstructions}`);
  }

  if (config.type === GameType.JEOPARDY) {
    lines.push(`Create exactly ${config.jeopardyCategories || 5} categories.`);
    lines.push(`Create exactly ${config.jeopardyRows || 5} questions per category.`);
    if (QUESTION_TYPES_WITH_MCQ.has(config.questionType)) {
      lines.push(getImportMcInstruction(config, config.questionType !== 'multiple-choice'));
      lines.push('The answer field must match one option exactly.');
    }
    if ((config.jeopardyCategoryNames || []).some((name) => name.trim())) {
      lines.push(`Use these category names in order: ${JSON.stringify(config.jeopardyCategoryNames)}.`);
    }
    if (config.strictMode) {
      lines.push('Answers should use Jeopardy phrasing such as "What is..." when natural.');
    }
  } else if (config.type === GameType.PUB_QUIZ) {
    lines.push(`Create exactly ${config.pubQuizRoundsCount || 3} rounds.`);
    lines.push(`Create exactly ${config.pubQuizQuestionsPerRound || 5} questions per round.`);
    if (QUESTION_TYPES_WITH_MCQ.has(config.questionType)) {
      lines.push(getImportMcInstruction(config, config.questionType !== 'multiple-choice'));
      lines.push('The answer field must match one option exactly.');
    }
    if ((config.pubQuizRoundNames || []).some((name) => name.trim())) {
      lines.push(`Use these round names in order: ${JSON.stringify(config.pubQuizRoundNames)}.`);
    }
  } else if (config.type === GameType.MILLIONAIRE) {
    lines.push('Create exactly 15 questions.');
    lines.push('Every question must have exactly 4 options.');
    lines.push('The answer field must match one option exactly.');
    lines.push('Questions 1-5 should be easy, 6-10 medium, 11-15 hard.');
  } else if (config.type === GameType.DARTS) {
    lines.push(`Create at least ${(config.questionCount || 15) + 10} questions.`);
    lines.push('Include a difficulty field for every question: easy, medium, or hard.');
    if (QUESTION_TYPES_WITH_MCQ.has(config.questionType)) {
      lines.push(getImportMcInstruction(config, config.questionType !== 'multiple-choice'));
      lines.push('The answer field must match one option exactly.');
    }
  } else if (config.type === GameType.SURVEY_SHOWDOWN) {
    lines.push(`Create exactly ${config.questionCount || 5} survey prompts.`);
    lines.push('Each question must include exactly 8 surveyAnswers.');
    lines.push('Each survey answer needs text, score, and 2-5 short alts.');
    lines.push('Order surveyAnswers from highest score to lowest score.');
  } else if (config.type === GameType.WORD_WHEEL) {
    lines.push('Create exactly 26 entries, one for each letter A-Z.');
    lines.push('Each entry must include a single-letter "letter" field.');
    lines.push('Do not include multiple-choice options.');
    lines.push(
      config.wordWheelLetterRule === 'contains-hard'
        ? 'For Q, V, X, Y, Z the answer may contain the letter; for all other letters the answer must start with the letter.'
        : 'Every answer must start with its assigned letter.'
    );
  } else if (config.type === GameType.STOP_THE_FIRE) {
    lines.push('Return a strong bank of distinct category names in "stopTheFireCategories".');
    lines.push('Make every category short, clear, and playable in class.');
  } else {
    lines.push(`Create exactly ${config.questionCount || 10} questions.`);
    if (config.questionType === 'multiple-choice') {
      lines.push(getImportMcInstruction(config));
      lines.push('The answer field must match one option exactly.');
    } else if (config.questionType === 'mixed' || config.questionType === 'ai-decide') {
      lines.push(getImportMcInstruction(config, true));
      lines.push('Whenever a question includes options, the answer field must match one option exactly.');
    } else if (config.questionType === 'open') {
      lines.push('Do not include multiple-choice options unless truly needed.');
    } else if (config.questionType === 'gap-fill') {
      lines.push('Questions should mainly use fill-in-the-blank prompts with clear correct answers.');
    }
  }

  lines.push('Use integer ids and integer points.');
  lines.push('Keep field names exactly as shown in the schema below.');
  lines.push('If a field is not relevant, omit it rather than inventing a new field.');
  lines.push('');
  lines.push('JSON schema example:');
  lines.push(getJsonOnlyTemplate(config));
  lines.push('');
  lines.push('Use the topic, settings, and instructions already provided above.');
  lines.push('If the user adds lesson notes or source text after this prompt, base the content on that material too.');

  return lines.join('\n');
};

const createImportedGameId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const extractJsonPayloadText = (text: string) => {
  const cleaned = String(text || '')
    .replace(/```json/gi, '```')
    .replace(/```/g, '')
    .trim();

  if (!cleaned) return '';
  if ((cleaned.startsWith('{') && cleaned.endsWith('}')) || (cleaned.startsWith('[') && cleaned.endsWith(']'))) {
    return cleaned;
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');

  if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }

  if (firstBracket !== -1 && lastBracket !== -1) {
    return cleaned.slice(firstBracket, lastBracket + 1);
  }

  return cleaned;
};

const unwrapImportedPayload = (raw: any): any => {
  if (Array.isArray(raw)) return raw;
  if (!isRecord(raw)) return raw;

  const directKeys = ['questions', 'jeopardyBoard', 'pubQuizRounds', 'stopTheFireCategories', 'categories'];
  if (directKeys.some((key) => key in raw)) return raw;

  for (const key of ['game', 'data', 'payload', 'result']) {
    const candidate = raw[key];
    if (Array.isArray(candidate)) return candidate;
    if (isRecord(candidate) && directKeys.some((directKey) => directKey in candidate)) return candidate;
  }

  return raw;
};

export const parseImportedGameContent = (text: string, config: GameConfig): GeneratedGame => {
  const jsonText = extractJsonPayloadText(text);
  if (!jsonText) {
    throw new Error('The import file was empty. Paste or upload valid JSON.');
  }

  const parsed = parseImportedJsonText(jsonText);

  const payload = unwrapImportedPayload(parsed);
  const nextConfig: GameConfig = {
    ...config,
    isAI: false,
    files: [],
  };
  const title =
    (isRecord(payload) ? asText(payload.title ?? payload.name) : '') ||
    config.title?.trim() ||
    `${config.type} Import`;

  if (config.type === GameType.STOP_THE_FIRE) {
    const rawCategories = Array.isArray(payload)
      ? payload
      : isRecord(payload)
        ? payload.stopTheFireCategories ?? payload.categories ?? payload.questions
        : [];
    const categories = dedupeStrings(normalizeStringArray(rawCategories, 500), 500);
    if (categories.length === 0) {
      throw new Error('No categories found. Expected "stopTheFireCategories" or "categories" as an array of strings.');
    }

    nextConfig.questionCount = categories.length;
    nextConfig.stopTheFireMode = 'manual';

    return {
      id: createImportedGameId(),
      createdAt: new Date().toISOString(),
      title,
      config: nextConfig,
      questions: [],
      stopTheFireCategories: categories,
    };
  }

  const normalizedPayload: {
    title: string;
    questions: GeneratedQuestion[];
    jeopardyBoard?: JeopardyCategory[];
    pubQuizRounds?: JeopardyCategory[];
  } = {
    title,
    questions: [],
  };

  if (config.type === GameType.JEOPARDY) {
    const board = normalizeGroupedQuestions(isRecord(payload) ? payload.jeopardyBoard : undefined, nextConfig, 'jeopardy');
    if (board.length === 0) {
      throw new Error('No Jeopardy categories found. Expected "jeopardyBoard" with category objects and question arrays.');
    }
    normalizedPayload.jeopardyBoard = board;
    nextConfig.jeopardyCategories = board.length;
    nextConfig.jeopardyCategoryNames = board.map((category) => category.name);
    nextConfig.jeopardyRows = Math.max(...board.map((category) => category.questions.length));
    nextConfig.questionCount = board.reduce((sum, category) => sum + category.questions.length, 0);
  } else if (config.type === GameType.PUB_QUIZ) {
    const rounds = normalizeGroupedQuestions(isRecord(payload) ? payload.pubQuizRounds : undefined, nextConfig, 'pubquiz');
    if (rounds.length === 0) {
      throw new Error('No Pub Quiz rounds found. Expected "pubQuizRounds" with round objects and question arrays.');
    }
    normalizedPayload.pubQuizRounds = rounds;
    nextConfig.pubQuizRoundsCount = rounds.length;
    nextConfig.pubQuizRoundNames = rounds.map((round) => round.name);
    nextConfig.pubQuizQuestionsPerRound = Math.max(...rounds.map((round) => round.questions.length));
    nextConfig.questionCount = rounds.reduce((sum, round) => sum + round.questions.length, 0);
  } else {
    const rawQuestions = Array.isArray(payload)
      ? payload
      : isRecord(payload)
        ? payload.questions
        : [];
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      throw new Error('No questions found. Expected a "questions" array in the import JSON.');
    }

    normalizedPayload.questions = rawQuestions.map((rawQuestion, index) =>
      normalizeQuestion(rawQuestion, nextConfig, index, 'standard')
    );
    if (config.type !== GameType.DARTS) {
      nextConfig.questionCount = normalizedPayload.questions.length;
    }
  }

  enforceGameOptionCounts(normalizedPayload, nextConfig);
  enforceGameAnswerMatchesOptions(normalizedPayload);
  rebalanceGameAnswerPositions(normalizedPayload, nextConfig);

  const finalQuestions =
    config.type === GameType.WORD_WHEEL
      ? normalizeWordWheelQuestions(normalizedPayload.questions, (nextConfig.wordWheelLetterRule || 'contains-hard') as WordWheelLetterRule)
      : normalizedPayload.questions;

  if (
    config.type !== GameType.JEOPARDY &&
    config.type !== GameType.PUB_QUIZ &&
    config.type !== GameType.WORD_WHEEL &&
    finalQuestions.length === 0
  ) {
    throw new Error('No usable questions were found in the import JSON.');
  }

  nextConfig.questionCount =
    config.type === GameType.JEOPARDY || config.type === GameType.PUB_QUIZ
      ? nextConfig.questionCount
      : config.type === GameType.DARTS
        ? config.questionCount
        : finalQuestions.length;

  return {
    id: createImportedGameId(),
    createdAt: new Date().toISOString(),
    title: normalizedPayload.title,
    config: nextConfig,
    questions: finalQuestions,
    ...(normalizedPayload.jeopardyBoard ? { jeopardyBoard: normalizedPayload.jeopardyBoard } : {}),
    ...(normalizedPayload.pubQuizRounds ? { pubQuizRounds: normalizedPayload.pubQuizRounds } : {}),
  };
};
