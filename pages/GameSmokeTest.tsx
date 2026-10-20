import { GameEditor } from '../components/games/GameEditor';
import { GamePreview } from '../components/games/GamePreview';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LazyGameRunner } from '../components/games/LazyGameRunner';
import { GameImagePreparation } from '../components/games/GameImagePreparation';
import { GameSetup } from '../components/games/GameSetup';
import { GameConfigurator, ModeSelector } from '../components/games/GameConfigurator';
import { GameRunOptions, GameType, GeneratedGame, GeneratedQuestion, SnakesLaddersBonusType } from '../types';
import { useUnsavedChanges } from '../contexts/UnsavedChangesContext';
import { preparePromoGame } from './promoGameData';
import { LiveQuizSmokeTest } from './LiveQuizSmokeTest';

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
  livequiz: GameType.LIVE_QUIZ_CHALLENGE,
  plinko: GameType.PLINKO,
  blockbeaters: GameType.BLOCK_BEATERS,
  wordwheel: GameType.WORD_WHEEL,
};

export const GameSmokeTest: React.FC = () => {
  const { setIsPlaying } = useUnsavedChanges();
  const [params] = useSearchParams();
  const mode = params.get('mode') || 'trivia';
  const [workspace, setWorkspace] = useState(params.get('workspace') || '');
  const [workspaceGame, setWorkspaceGame] = useState<GeneratedGame | null>(null);
  const [workspaceAction, setWorkspaceAction] = useState('');
  const preparationMode = params.get('prepare') || '';
  const bonusesEnabled = params.get('bonuses') === '1';
  const useFullWordWheel = params.get('fullWheel') === '1';
  const snakesBonusType = params.get('bonusType') as SnakesLaddersBonusType | null;
  const requestedPlayers = params.get('players');
  const lightweightTestMode = params.get('lightweight') === '1';
  const useLongContent = params.get('long') === '1';
  const playerCount = requestedPlayers
    ? Math.min(6, Math.max(1, Number.parseInt(requestedPlayers, 10) || options.players))
    : options.players;
  const showSetup = params.get('setup') === '1';
  const showModeSelector = params.get('modeSelector') === '1';
  const isPlayingFixture = !workspace && !showSetup && !showModeSelector && !preparationMode;
  useEffect(() => {
    setIsPlaying(isPlayingFixture);
    return () => setIsPlaying(false);
  }, [isPlayingFixture, setIsPlaying]);
  const type = modes[mode] || GameType.TRIVIA;
  const isPromo = params.get('promo') === '1';
  const baseGame = isPromo ? preparePromoGame(makeGame(type)) : makeGame(type);
  const isSnakesPreview = type === GameType.SNAKES_LADDERS && params.get('preview') === '1';
  if (isSnakesPreview) {
    baseGame.title = 'Animal adventures';
    baseGame.questions = baseGame.questions.map(question => ({
      ...question,
      question: 'Which of these animals is a mammal?',
      answer: 'Dolphin',
      options: ['Dolphin', 'Shark', 'Octopus', 'Penguin'],
      image: undefined,
    }));
  }
  const answerMethod = params.get('answerMethod');
  const answerFormat = params.get('answerFormat');
  if (['say', 'write'].includes(answerMethod || '')) baseGame.config.answerMethod = answerMethod as 'say' | 'write';
  if (answerFormat === 'gap-fill' || answerFormat === 'open') {
    baseGame.config.questionType = answerFormat;
    const convert = (question: GeneratedQuestion): GeneratedQuestion => ({ ...question, options: undefined, questionType: answerFormat,
      question: answerFormat === 'gap-fill' ? 'The correct answer is ____.' : 'Explain which answer is correct.',
      answer: 'Correct', answerAliases: ['Right'],
    });
    baseGame.questions = baseGame.questions.map(convert);
    baseGame.jeopardyBoard = baseGame.jeopardyBoard?.map(group => ({ ...group, questions: group.questions.map(convert) }));
    baseGame.pubQuizRounds = baseGame.pubQuizRounds?.map(group => ({ ...group, questions: group.questions.map(convert) }));
  }
  if (type === GameType.SNAKES_LADDERS && params.get('image') === 'none') {
    baseGame.questions = baseGame.questions.map(question => ({ ...question, image: undefined }));
  }
  if (useLongContent && type === GameType.PLINKO) {
    const answer='I have got a sandwich, and we have got juice.';
    baseGame.questions=baseGame.questions.map(question=>({...question,question:'Choose the correct sentence.',answer,options:[answer,'Wrong A','Wrong B','Wrong C']}));
  }
  if (useLongContent && type === GameType.SNAKES_LADDERS) {
    baseGame.questions = baseGame.questions.map(question => ({ ...question,
      question: 'My brother ____ got PE on Wednesday.',
      answer: 'has', answerAliases: [],
    }));
  }
  if (useFullWordWheel && type === GameType.WORD_WHEEL) {
    baseGame.questions = Array.from({ length: 26 }, (_, index) => {
      const letter = String.fromCharCode(65 + index);
      return makeQuestion(index + 1, {
        letter,
        question: `Which classroom word begins with ${letter}?`,
        answer: `${letter}word`,
        answerAliases: [],
      });
    });
    baseGame.config.questionCount = 26;
  }
  if (useLongContent && type === GameType.WORD_WHEEL && baseGame.questions[0]) {
    baseGame.questions[0] = {
      ...baseGame.questions[0],
      question: 'What exceptionally long classroom vocabulary answer begins with A and should shrink to remain fully visible inside this result card?',
      answer: 'Antidisestablishmentarianism and additional classroom context',
    };
  }
  const game = preparationMode === 'failure' || preparationMode === 'temporary'
    ? {
        ...baseGame,
        questions: (baseGame.questions || []).map((question, index) =>
          index === 0
            ? {
                ...question,
                image: {
                  url: preparationMode === 'failure' ? '/test-confirmed-missing-image' : '/test-transient-image',
                  source: 'upload' as const,
                  alt: 'Unavailable image',
                },
              }
            : question
        ),
      }
    : baseGame;
  const [preparedGame, setPreparedGame] = useState<GeneratedGame | null>(() => preparationMode ? null : game);
  const [replacementRequested, setReplacementRequested] = useState(false);
  const props = {
    game: preparedGame || game,
    options: {
      ...options,
      ...(isPromo ? { questionLimit: game.questions.length } : {}),
      ...(params.has('timer') ? { timerSeconds: Math.max(0, Number(params.get('timer')) || 0) } : {}),
      ...(type === GameType.PLINKO && params.has('rounds') ? { plinkoRounds: Math.max(1, Math.min(20, Number(params.get('rounds')) || 5)) } : {}),
      players: playerCount,
      teamNames: Array.from({ length: playerCount }, (_, index) => params.get('preview') === '1' ? ['Foxes', 'Owls', 'Bears', 'Lions', 'Otters', 'Eagles'][index] : `Team ${index + 1}`),
      enableBonuses: bonusesEnabled,
      blockBeatersStealLimit: Number(params.get('stealLimit')) || 3,
      blockBeatersMode: params.get('blockMode') === 'numbers' ? 'numbers' as const : undefined,
      snakesLaddersBonusOptions: snakesBonusType ? [snakesBonusType] : undefined,
    },
    onBack: () => undefined,
    onFinish: () => undefined,
    onReplay: () => undefined,
    testMode: lightweightTestMode,
    testStartPosition: params.has('testStartPosition') ? Number(params.get('testStartPosition')) : undefined,
  };

  // Development-only fixtures for inspecting the creation workspace without live generation.
  if (workspace) {
    const fixture = workspaceGame || { ...game, config: { ...game.config, coverImage: {
      url: '/assets/games/trivia.png', source: 'upload' as const, selection: 'creator' as const,
    } } };
    if (workspaceAction) return <div role="status" className="p-8">{workspaceAction}<button onClick={() => setWorkspaceAction('')}>Return to workspace</button></div>;
    if (workspace === 'config') return <GameConfigurator type={type} mode={params.get('creation') === 'ai' ? 'ai' : 'manual'} onBack={() => setWorkspace('preview')} onProceed={next => { setWorkspaceGame(next); setWorkspace('editor'); }} />;
    if (workspace === 'editor') return <GameEditor game={fixture} onBack={() => setWorkspace('preview')} onSave={setWorkspaceGame} onPlay={next => { setWorkspaceGame(next); setWorkspaceAction(`Play: ${next.title}`); }} />;
    return <GamePreview game={fixture} source="library" onBack={() => setWorkspace('config')} onEdit={() => setWorkspace('editor')} onPlay={next => { setWorkspaceGame(next); setWorkspaceAction(`Play: ${next.questions.length} questions`); }} onShare={() => setWorkspaceAction('Teacher share')} onStudentShare={ids => setWorkspaceAction(`Student share: ${ids.length} questions`)} />;
  }

  if (replacementRequested) {
    return <div data-testid="image-replacement-requested">Image replacement requested</div>;
  }

  if (showModeSelector) {
    return <ModeSelector type={type} onBack={() => undefined} onModeSelect={() => undefined} />;
  }

  if (showSetup) {
    if (workspaceAction) return <pre role="status">{workspaceAction}</pre>;
    return <GameSetup game={game} onBack={() => undefined} onStart={options => setWorkspaceAction(JSON.stringify(options))} />;
  }

  if (preparationMode && !preparedGame) {
    return (
      <GameImagePreparation
        game={game}
        onReady={setPreparedGame}
        onReplace={() => setReplacementRequested(true)}
        onBack={() => undefined}
      />
    );
  }

  // Live Quiz needs its host screen; the solo runner deliberately falls back to Trivia.
  if (type === GameType.LIVE_QUIZ_CHALLENGE) return <LiveQuizSmokeTest />;

  return (
    <div data-testid="game-smoke-root" data-mode={mode} data-lightweight={lightweightTestMode ? 'true' : 'false'}
      data-promo-questions={isPromo ? JSON.stringify([...game.questions, ...(game.jeopardyBoard || []).flatMap(group => group.questions)]) : undefined}>
      <LazyGameRunner {...props} />
    </div>
  );
};
