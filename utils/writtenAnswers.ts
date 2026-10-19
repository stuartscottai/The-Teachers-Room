import { AnswerMethod, GameConfig, GameRunOptions, GameType, GeneratedQuestion } from '../types';

export const supportsWrittenAnswers = (type: GameType) => [
  GameType.PLINKO, GameType.TRIVIA, GameType.JEOPARDY, GameType.PUB_QUIZ, GameType.DARTS,
  GameType.SNAKES_LADDERS, GameType.TIME_BOMB, GameType.BLOCK_BEATERS,
].includes(type);

export function getWrittenQuestionType(question: GeneratedQuestion, config: GameConfig): 'gap-fill' | 'open' {
  return question.questionType || (config.questionType === 'gap-fill' || /_{2,}|\[\s*blank\s*\]/i.test(question.question) ? 'gap-fill' : 'open');
}

export const usesAnswerLines = (question: GeneratedQuestion, config: GameConfig) =>
  supportsWrittenAnswers(config.type) && getWrittenQuestionType(question, config) === 'gap-fill';

export const getAnswerEditorText = (question: GeneratedQuestion, config: GameConfig) => usesAnswerLines(question, config)
  ? [question.answer, ...(question.answerAliases || [])].join('\n') : question.answer;

export function getAnswerEditorPatch(text: string, question: GeneratedQuestion, config: GameConfig): Partial<GeneratedQuestion> {
  if (!usesAnswerLines(question, config)) return { answer: text };
  const [answer, ...answerAliases] = text.split(/\r?\n/);
  return { answer, answerAliases };
}

export const normalizeAnswerMethod = (value: unknown): AnswerMethod | undefined => value === 'say' || value === 'write' ? value : undefined;

export function getAnswerMethod(config: GameConfig, options: GameRunOptions): AnswerMethod {
  return normalizeAnswerMethod(options.answerMethod) || normalizeAnswerMethod(config.answerMethod) ||
    (config.type === GameType.BLOCK_BEATERS && (options.blockBeatersMode || config.blockBeatersMode || 'letters') === 'letters' ? 'write' : 'say');
}

// Ignore letter case, surrounding spaces and punctuation at the end. Keep
// accents, mathematical symbols and punctuation within an answer meaningful.
export const normalizeWrittenAnswer = (value: string) => value.normalize('NFC').trim().toLocaleLowerCase()
  .replace(/\s+/g, ' ').replace(/[.!?。！？]+$/u, '').trim();

export const matchesWrittenAnswer = (value: string, question: GeneratedQuestion) => {
  const answer = normalizeWrittenAnswer(value);
  return Boolean(answer) && [question.answer, ...(question.answerAliases || [])].flatMap(candidate => candidate.split(/\r?\n/))
    .some(candidate => normalizeWrittenAnswer(candidate) === answer);
};
