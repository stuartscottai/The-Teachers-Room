import type { GameConfig, GeneratedQuestion } from '../types';
import { getSurveyGenerationError } from './surveyGeneration.js';

export const REPLACEMENT_REASONS = ['different', 'wrong-answer', 'ambiguous', 'off-topic', 'too-easy', 'too-difficult'] as const;
export type ReplacementReason = typeof REPLACEMENT_REASONS[number];
export type QuestionReplacementRequest = {
  config: Pick<GameConfig, 'type' | 'topic' | 'customInstructions' | 'wordWheelLetterRule' | 'blockBeatersMode' | 'surveyScoreMode'>;
  original: GeneratedQuestion;
  category?: string;
  reason: ReplacementReason;
  feedback?: string;
  sourceExcerpt?: string;
  sourceRequired?: boolean;
  otherPrompts?: string[];
};
const text = (value: unknown, limit: number) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const normalized = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();
const gameTypes = ['Trivia Quiz', 'Jeopardy', 'Pub Quiz', 'Word Wheel', 'Block Beaters', 'Darts', 'Millionaire Maker', 'Time Bomb', 'Survey Showdown', 'Snakes and Ladders', 'Live Quiz Challenge'];

export function isReplacementSourceRequired(config: GameConfig, question: GeneratedQuestion): boolean {
  return Boolean(config.files?.length || (config.type === 'Survey Showdown' && (question.surveyScoreMode || config.surveyScoreMode) === 'statistics'));
}

/** Keep uploaded files, images and the rest of the game out of small repair requests. */
export function sanitizeReplacementRequest(input: any): QuestionReplacementRequest {
  if (!gameTypes.includes(input?.config?.type)) throw new Error('This game does not support question replacement.');
  if (!REPLACEMENT_REASONS.includes(input?.reason)) throw new Error('Choose a replacement reason.');
  const original = input?.original;
  if (!original || !text(original.question, 2000)) throw new Error('Choose a question to replace.');
  const options = Array.isArray(original.options) ? original.options.map((option: unknown) => text(option, 500)) : undefined;
  if (options && (options.length < 2 || options.length > 4 || options.some(option => !option))) throw new Error('Multiple-choice questions need between two and four nonempty options.');
  const request: QuestionReplacementRequest = {
    config: {
      type: input.config.type, topic: text(input.config.topic, 500), customInstructions: text(input.config.customInstructions, 4000),
      wordWheelLetterRule: input.config.wordWheelLetterRule === 'starts-with' ? 'starts-with' : 'contains-hard',
      blockBeatersMode: input.config.blockBeatersMode === 'numbers' ? 'numbers' : 'letters',
      surveyScoreMode: original.surveyScoreMode === 'statistics' || input.config.surveyScoreMode === 'statistics' ? 'statistics' : 'survey',
    },
    original: {
      id: original.id, question: text(original.question, 2000), answer: text(original.answer, 1000), options,
      letter: text(original.letter, 1).toUpperCase(), category: text(original.category, 200),
      points: Number.isFinite(original.points) ? original.points : 100, isBonus: Boolean(original.isBonus),
    },
    category: text(input.category, 200), reason: input.reason, feedback: text(input.feedback, 1000),
    sourceExcerpt: text(input.sourceExcerpt, 12000),
    sourceRequired: Boolean(input.sourceRequired),
    otherPrompts: Array.isArray(input.otherPrompts) ? input.otherPrompts.slice(0, 80).map((prompt: unknown) => text(prompt, 160)).filter(Boolean) : [],
  };
  if ((request.sourceRequired || (request.config.type === 'Survey Showdown' && request.config.surveyScoreMode === 'statistics')) && !request.sourceExcerpt) {
    throw new Error('Paste the relevant source passage before replacing this question.');
  }
  if ((request.config.type === 'Word Wheel' || (request.config.type === 'Block Beaters' && request.config.blockBeatersMode === 'letters')) && !/^[A-Z]$/.test(request.original.letter || '')) {
    throw new Error('This question needs a letter before it can be replaced.');
  }
  return request;
}

/** Reject unusable AI output before offering it to the teacher. */
export function validateReplacement(candidate: any, request: QuestionReplacementRequest): GeneratedQuestion {
  const prompt = text(candidate?.question, 2000);
  const answer = text(candidate?.answer, 1000);
  if (!prompt || !answer || candidate.question.length > 2000 || candidate.answer.length > 1000) throw new Error('The AI did not return a complete replacement. Your original question is unchanged.');
  if (request.otherPrompts?.some(other => normalized(other) === normalized(prompt.slice(0, 160)))) throw new Error('The AI repeated an existing question. Your original question is unchanged.');
  const replacement: GeneratedQuestion = { id: request.original.id, question: prompt, answer, points: request.original.points, isBonus: request.original.isBonus, category: request.original.category };
  if (request.original.options?.length) {
    if (!Array.isArray(candidate.options) || candidate.options.length !== request.original.options.length || candidate.options.some((option: unknown) => typeof option !== 'string' || !option.trim() || option.length > 500)) throw new Error('The AI returned invalid answer options. Your original question is unchanged.');
    const options: string[] = candidate.options.map((option: string) => option.trim());
    if (new Set(options.map(normalized)).size !== options.length || options.filter(option => option === answer).length !== 1) throw new Error('The replacement must have one matching correct answer and distinct options.');
    replacement.options = options;
  }
  const letters = request.config.type === 'Word Wheel' || (request.config.type === 'Block Beaters' && request.config.blockBeatersMode === 'letters');
  if (letters) {
    const letter = request.original.letter!;
    const rule = request.config.type === 'Word Wheel' ? request.config.wordWheelLetterRule : 'starts-with';
    const fits = rule === 'starts-with' ? answer.toUpperCase().startsWith(letter) : answer.toUpperCase().includes(letter);
    if (!fits || answer.length === 1) throw new Error('The replacement answer does not match this question’s letter.');
    replacement.letter = letter;
  }
  if (request.config.type === 'Survey Showdown') {
    const error = getSurveyGenerationError({ questions: [candidate] }, request.config.surveyScoreMode);
    if (error) throw new Error(error);
    if (candidate.surveyAnswers.some((entry: any) => typeof entry.text !== 'string' || entry.text.length > 300 || (entry.alts && (!Array.isArray(entry.alts) || entry.alts.length > 8 || entry.alts.some((alt: unknown) => typeof alt !== 'string' || alt.length > 150))))) throw new Error('The AI returned invalid survey answers.');
    replacement.surveyAnswers = candidate.surveyAnswers;
    replacement.surveyScoreMode = candidate.surveyScoreMode;
  }
  return replacement;
}

/** Preserve the board slot while removing images and answer hints belonging to the old question. */
export function applyQuestionReplacement(original: GeneratedQuestion, replacement: GeneratedQuestion): GeneratedQuestion {
  const { image, imageKeywords, visualSearch, answerAliases, options, surveyAnswers, surveyScoreMode, ...slot } = original;
  return { ...slot, ...replacement, id: original.id, points: original.points, isBonus: original.isBonus, category: original.category, letter: original.letter || replacement.letter };
}
