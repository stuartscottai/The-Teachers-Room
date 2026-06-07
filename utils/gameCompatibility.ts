import { GameType, GeneratedGame, GeneratedQuestion, JeopardyCategory } from '../types';

export interface GameConversionOptions {
  groups?: JeopardyCategory[];
}

export const STANDALONE_GAME_TYPES = new Set<GameType>([
  GameType.STOP_THE_FIRE,
  GameType.SURVEY_SHOWDOWN,
  GameType.WORD_WHEEL,
]);

const SIMPLE_QUESTION_GAME_TYPES: GameType[] = [
  GameType.TRIVIA,
  GameType.SNAKES_LADDERS,
  GameType.TIME_BOMB,
  GameType.DARTS,
  GameType.MILLIONAIRE,
  GameType.BLOCK_BEATERS,
  GameType.LIVE_QUIZ_CHALLENGE,
];

export const CROSS_COMPATIBLE_GAME_TYPES: GameType[] = [
  ...SIMPLE_QUESTION_GAME_TYPES,
  GameType.JEOPARDY,
  GameType.PUB_QUIZ,
];

export const isMultipleChoiceQuestion = (question: GeneratedQuestion) =>
  Array.isArray(question.options) &&
  question.options.filter((option) => String(option || '').trim()).length >= 2 &&
  Boolean(String(question.answer || '').trim());

export const flattenGameQuestions = (game: GeneratedGame): GeneratedQuestion[] => {
  if (game.config.type === GameType.JEOPARDY && game.jeopardyBoard?.length) {
    return game.jeopardyBoard.flatMap((category) =>
      (category.questions || []).map((question) => ({
        ...question,
        category: question.category || category.name,
      }))
    );
  }

  if (game.config.type === GameType.PUB_QUIZ && game.pubQuizRounds?.length) {
    return game.pubQuizRounds.flatMap((round) =>
      (round.questions || []).map((question) => ({
        ...question,
        category: question.category || round.name,
      }))
    );
  }

  return game.questions || [];
};

export const getCompatibleGameTypes = (game: GeneratedGame): GameType[] => {
  if (STANDALONE_GAME_TYPES.has(game.config.type)) return [];

  const questions = flattenGameQuestions(game);
  if (questions.length === 0) return [];
  const hasMultipleChoice = questions.some(isMultipleChoiceQuestion);

  return CROSS_COMPATIBLE_GAME_TYPES.filter((type) => {
    if (type === game.config.type) return false;
    if (type === GameType.MILLIONAIRE || type === GameType.LIVE_QUIZ_CHALLENGE) {
      return hasMultipleChoice;
    }
    return true;
  });
};

const makeFallbackGroupName = (topic: string, groupIndex: number, groupCount: number) => {
  const base = topic.trim() || 'Questions';
  return groupCount > 1 ? `${base} ${groupIndex + 1}` : base;
};

const groupQuestionsForCategoryGame = (
  questions: GeneratedQuestion[],
  topic: string,
  preferredGroupCount: number
): JeopardyCategory[] => {
  const grouped = new Map<string, GeneratedQuestion[]>();
  questions.forEach((question) => {
    const category = String(question.category || '').trim();
    if (!category) return;
    grouped.set(category, [...(grouped.get(category) || []), question]);
  });

  if (grouped.size >= 2) {
    return Array.from(grouped.entries()).map(([name, categoryQuestions]) => ({
      name,
      questions: categoryQuestions,
    }));
  }

  const groupCount = Math.max(1, Math.min(preferredGroupCount, questions.length));
  const groups: JeopardyCategory[] = Array.from({ length: groupCount }, (_, index) => ({
    name: makeFallbackGroupName(topic, index, groupCount),
    questions: [],
  }));

  questions.forEach((question, index) => {
    groups[index % groupCount].questions.push({
      ...question,
      category: groups[index % groupCount].name,
    });
  });

  return groups.filter((group) => group.questions.length > 0);
};

const normalizeQuestionsForTarget = (questions: GeneratedQuestion[], targetType: GameType) => {
  const usable =
    targetType === GameType.MILLIONAIRE || targetType === GameType.LIVE_QUIZ_CHALLENGE
      ? questions.filter(isMultipleChoiceQuestion)
      : questions;

  return usable.map((question, index) => ({
    ...question,
    id: index,
    points:
      targetType === GameType.LIVE_QUIZ_CHALLENGE
        ? question.points || 1000
        : targetType === GameType.WORD_WHEEL
          ? 10
          : targetType === GameType.BLOCK_BEATERS
            ? 10
          : question.points || 100,
    isBonus: false,
  }));
};

export const convertGameForTemporaryPlay = (
  game: GeneratedGame,
  targetType: GameType,
  options: GameConversionOptions = {}
): GeneratedGame | null => {
  if (targetType === game.config.type) return game;
  if (!getCompatibleGameTypes(game).includes(targetType)) return null;

  const questions = normalizeQuestionsForTarget(flattenGameQuestions(game), targetType);
  if (questions.length === 0) return null;

  const title = `${game.title} (${targetType})`;
  const baseConfig = {
    ...game.config,
    type: targetType,
    title,
    questionCount: questions.length,
    isPublic: false,
    stopTheFireMode: undefined,
    stopTheFireCategories: undefined,
  };

  if (targetType === GameType.JEOPARDY) {
    const board = (options.groups?.length ? options.groups : groupQuestionsForCategoryGame(questions, game.config.topic || game.title, 5))
      .map((category, categoryIndex) => ({
        ...category,
        questions: (category.questions || []).map((question, questionIndex) => ({
          ...question,
          id: questionIndex,
          category: category.name,
          points: question.points || (questionIndex + 1) * 100,
          isBonus: false,
        })),
      }))
      .filter((category) => category.questions.length > 0);
    const rowCount = Math.max(...board.map((category) => category.questions.length));
    return {
      ...game,
      id: undefined,
      title,
      config: {
        ...baseConfig,
        questionCount: board.reduce((total, category) => total + category.questions.length, 0),
        jeopardyCategories: board.length,
        jeopardyCategoryNames: board.map((category) => category.name),
        jeopardyRows: rowCount,
      },
      questions: [],
      jeopardyBoard: board,
      pubQuizRounds: undefined,
      stopTheFireCategories: undefined,
      stopTheFireRounds: undefined,
    };
  }

  if (targetType === GameType.PUB_QUIZ) {
    const rounds = (options.groups?.length ? options.groups : groupQuestionsForCategoryGame(questions, game.config.topic || game.title, 3))
      .map((round) => ({
        ...round,
        questions: (round.questions || []).map((question, questionIndex) => ({
          ...question,
          id: questionIndex,
          category: round.name,
          points: question.points || 1,
          isBonus: false,
        })),
      }))
      .filter((round) => round.questions.length > 0);
    const questionsPerRound = Math.max(...rounds.map((round) => round.questions.length));
    return {
      ...game,
      id: undefined,
      title,
      config: {
        ...baseConfig,
        questionCount: rounds.reduce((total, round) => total + round.questions.length, 0),
        pubQuizRoundsCount: rounds.length,
        pubQuizRoundNames: rounds.map((round) => round.name),
        pubQuizQuestionsPerRound: questionsPerRound,
      },
      questions: [],
      jeopardyBoard: undefined,
      pubQuizRounds: rounds,
      stopTheFireCategories: undefined,
      stopTheFireRounds: undefined,
    };
  }

  return {
    ...game,
    id: undefined,
    title,
    config: {
      ...baseConfig,
      questionType:
        targetType === GameType.MILLIONAIRE || targetType === GameType.LIVE_QUIZ_CHALLENGE
          ? 'multiple-choice'
          : game.config.questionType,
    },
    questions,
    jeopardyBoard: undefined,
    pubQuizRounds: undefined,
    stopTheFireCategories: undefined,
    stopTheFireRounds: undefined,
  };
};
