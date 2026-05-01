import React, { Suspense, lazy } from 'react';
import { GameRunOptions, GameType, GeneratedGame } from '../../types';

type GameRunnerProps = {
  game: GeneratedGame;
  options: GameRunOptions;
  onBack: () => void;
  onFinish: () => void;
  onReplay: () => void;
};

const DartsGame = lazy(() => import('./DartsGame').then(({ DartsGame }) => ({ default: DartsGame })));
const JeopardyGame = lazy(() => import('./JeopardyGame').then(({ JeopardyGame }) => ({ default: JeopardyGame })));
const MillionaireGame = lazy(() => import('./MillionaireGame').then(({ MillionaireGame }) => ({ default: MillionaireGame })));
const PubQuizGame = lazy(() => import('./PubQuizGame').then(({ PubQuizGame }) => ({ default: PubQuizGame })));
const SnakesLaddersGame = lazy(() => import('./SnakesLaddersGame').then(({ SnakesLaddersGame }) => ({ default: SnakesLaddersGame })));
const StopTheFireGame = lazy(() => import('./StopTheFireGame').then(({ StopTheFireGame }) => ({ default: StopTheFireGame })));
const SurveyShowdownGame = lazy(() => import('./SurveyShowdownGame').then(({ SurveyShowdownGame }) => ({ default: SurveyShowdownGame })));
const TimeBombGame = lazy(() => import('./TimeBombGame').then(({ TimeBombGame }) => ({ default: TimeBombGame })));
const TriviaGame = lazy(() => import('./TriviaGame').then(({ TriviaGame }) => ({ default: TriviaGame })));
const WordWheelGame = lazy(() => import('./WordWheelGame').then(({ WordWheelGame }) => ({ default: WordWheelGame })));

const GameLoading: React.FC = () => (
  <div className="min-h-[50vh] flex items-center justify-center px-6 text-center">
    <div>
      <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-brand-blue border-t-transparent animate-spin" />
      <p className="text-sm font-bold text-slate-500">Loading game...</p>
    </div>
  </div>
);

const selectGameType = (game: GeneratedGame) =>
  game.config.type === GameType.LIVE_QUIZ_CHALLENGE ? GameType.TRIVIA : game.config.type;

const LazyGameRunnerInner: React.FC<GameRunnerProps> = (props) => {
  const gameType = selectGameType(props.game);

  switch (gameType) {
    case GameType.DARTS:
      return <DartsGame {...props} />;
    case GameType.JEOPARDY:
      return <JeopardyGame {...props} />;
    case GameType.MILLIONAIRE:
      return <MillionaireGame {...props} />;
    case GameType.PUB_QUIZ:
      return <PubQuizGame {...props} />;
    case GameType.SNAKES_LADDERS:
      return <SnakesLaddersGame {...props} />;
    case GameType.STOP_THE_FIRE:
      return <StopTheFireGame {...props} />;
    case GameType.SURVEY_SHOWDOWN:
      return <SurveyShowdownGame {...props} />;
    case GameType.TIME_BOMB:
      return <TimeBombGame {...props} />;
    case GameType.TRIVIA:
      return <TriviaGame {...props} />;
    case GameType.WORD_WHEEL:
      return <WordWheelGame {...props} />;
    default:
      return null;
  }
};

export const LazyGameRunner: React.FC<GameRunnerProps> = (props) => (
  <Suspense fallback={<GameLoading />}>
    <LazyGameRunnerInner {...props} />
  </Suspense>
);
