import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { LazyGameRunner } from '../components/games/LazyGameRunner';
import { GameRunOptions, GameType, GeneratedGame, GeneratedQuestion } from '../types';

const smokeImage =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300"><rect width="480" height="300" fill="#e0f2fe"/><circle cx="240" cy="130" r="70" fill="#facc15"/><text x="240" y="250" text-anchor="middle" font-family="Arial" font-size="32" font-weight="700" fill="#0f172a">Smoke image</text></svg>'
  );

const makeQuestion = (id: number, overrides: Partial<GeneratedQuestion> = {}): GeneratedQuestion => ({
  id,
  question: overrides.question || `Smoke test question ${id}?`,
  answer: overrides.answer || 'Correct',
  options: overrides.options || ['Correct', 'Wrong A', 'Wrong B', 'Wrong C'],
  points: overrides.points ?? 100,
  isBonus: overrides.isBonus ?? false,
  image: overrides.image ?? {
    url: smokeImage,
    thumbUrl: smokeImage,
    source: 'upload',
    alt: 'Smoke test image',
  },
  ...overrides,
});

const baseQuestions: GeneratedQuestion[] = [
  makeQuestion(1, { question: 'Which option is correct?', answer: 'Correct' }),
  makeQuestion(2, { question: 'Choose the matching answer.', answer: 'Correct' }),
  makeQuestion(3, { question: 'What is shown in the image?', answer: 'Correct' }),
  makeQuestion(4, { question: 'Final smoke question?', answer: 'Correct' }),
];

const makeGame = (type: GameType): GeneratedGame => ({
  id: '00000000-0000-4000-8000-000000000001',
  title: `${type} smoke test`,
  config: {
    type,
    questionCount: baseQuestions.length,
    questionType: 'multiple-choice',
    topic: 'Smoke testing',
    isAI: false,
    strictMode: false,
    wordWheelScoringMode: 'classic',
    wordWheelLetterRule: 'contains-hard',
    stopTheFireCategories: ['animals', 'food', 'places', 'verbs'],
  },
  questions:
    type === GameType.WORD_WHEEL
      ? baseQuestions.map((question, index) => ({
          ...question,
          letter: ['A', 'B', 'C', 'D'][index],
          answer: ['Apple', 'Banana', 'Carrot', 'Desk'][index],
          answerAliases: [],
        }))
      : type === GameType.SURVEY_SHOWDOWN
        ? baseQuestions.map((question) => ({
            ...question,
            surveyAnswers: [
              { text: 'Correct', score: 40, alts: ['right'] },
              { text: 'Wrong A', score: 25, alts: [] },
              { text: 'Wrong B', score: 20, alts: [] },
              { text: 'Wrong C', score: 15, alts: [] },
            ],
          }))
        : baseQuestions,
  jeopardyBoard: [
    { name: 'Smoke A', questions: [makeQuestion(11), makeQuestion(12)] },
    { name: 'Smoke B', questions: [makeQuestion(13), makeQuestion(14)] },
  ],
  pubQuizRounds: [
    { name: 'Round 1', questions: [makeQuestion(21), makeQuestion(22)] },
    { name: 'Round 2', questions: [makeQuestion(23), makeQuestion(24)] },
  ],
  stopTheFireCategories: ['animals', 'food', 'places', 'verbs'],
});

const options: GameRunOptions = {
  players: 2,
  timerSeconds: 30,
  enableBonuses: false,
  strictMode: false,
  questionLimit: baseQuestions.length,
  teamNames: ['Team 1', 'Team 2'],
  muted: true,
  randomizeQuestions: false,
  triviaRandomPoints: false,
  dartsMode: 'high-score',
  dartsLegs: 1,
  teamLives: 3,
  bombDuration: 30,
  wordWheelScoringMode: 'classic',
  wordWheelLetterRule: 'contains-hard',
};

const modes: Record<string, GameType> = {
  darts: GameType.DARTS,
  jeopardy: GameType.JEOPARDY,
  millionaire: GameType.MILLIONAIRE,
  pubquiz: GameType.PUB_QUIZ,
  snakes: GameType.SNAKES_LADDERS,
  stopfire: GameType.STOP_THE_FIRE,
  survey: GameType.SURVEY_SHOWDOWN,
  timebomb: GameType.TIME_BOMB,
  trivia: GameType.TRIVIA,
  wordwheel: GameType.WORD_WHEEL,
};

export const GameSmokeTest: React.FC = () => {
  const [params] = useSearchParams();
  const mode = params.get('mode') || 'trivia';
  const type = modes[mode] || GameType.TRIVIA;
  const game = makeGame(type);
  const props = {
    game,
    options,
    onBack: () => undefined,
    onFinish: () => undefined,
    onReplay: () => undefined,
  };

  return (
    <div data-testid="game-smoke-root" data-mode={mode}>
      <LazyGameRunner {...props} />
    </div>
  );
};
