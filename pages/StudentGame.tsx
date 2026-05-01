import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Calendar } from 'lucide-react';
import { GameRunOptions, GameType, GeneratedGame } from '../types';
import { getSelectedStudentGameShare, getSharedGame, recordGamePlay } from '../utils/gameUtils';
import { Avatar } from '../components/Avatar';
import { LazyGameRunner } from '../components/games/LazyGameRunner';

type LoadState = 'idle' | 'loading' | 'ready' | 'not-found' | 'error';
type StudentPhase = 'start' | 'play';

const UNSUPPORTED_STUDENT_TYPES = new Set<GameType>([
  GameType.STOP_THE_FIRE,
  GameType.SURVEY_SHOWDOWN,
]);

const countPlayableQuestions = (game: GeneratedGame) => {
  if (game.config.type === GameType.JEOPARDY) {
    return (game.jeopardyBoard || []).reduce((total, category) => total + (category.questions?.length || 0), 0);
  }
  if (game.config.type === GameType.PUB_QUIZ) {
    return (game.pubQuizRounds || []).reduce((total, round) => total + (round.questions?.length || 0), 0);
  }
  return game.questions?.length || 0;
};

const formatCreatedDate = (value?: string) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const buildStudentOptions = (game: GeneratedGame, studentName: string): GameRunOptions => {
  const name = studentName.trim() || 'Player 1';
  const questionCount = countPlayableQuestions(game);

  return {
    players: 1,
    timerSeconds: game.config.type === GameType.TIME_BOMB ? 60 : 30,
    enableBonuses: false,
    strictMode: game.config.strictMode || false,
    questionLimit: questionCount,
    teamNames: [name],
    muted: false,
    soundConfig: {
      correct: 'LevelUp',
      incorrect: 'WompWomp',
      select: 'Blip',
      win: 'Orchestral',
      bonus: 'Secret',
      timesUp: 'Gong',
    },
    randomizeQuestions: true,
    triviaRandomPoints: false,
    dartsMode: 'high-score',
    dartsLegs: game.config.type === GameType.DARTS ? Math.max(1, questionCount) : 5,
    teamLives: 3,
    bombDuration: 60,
    wordWheelScoringMode: game.config.wordWheelScoringMode || 'classic',
    wordWheelLetterRule: game.config.wordWheelLetterRule || 'contains-hard',
    studentPractice: true,
  };
};

export const StudentGame: React.FC = () => {
  const { id, shareId } = useParams();
  const navigate = useNavigate();
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [game, setGame] = useState<GeneratedGame | null>(null);
  const [phase, setPhase] = useState<StudentPhase>('start');
  const [studentName, setStudentName] = useState('');
  const [playOptions, setPlayOptions] = useState<GameRunOptions | null>(null);
  const [playKey, setPlayKey] = useState(0);

  useEffect(() => {
    if (!id && !shareId) {
      setLoadState('error');
      return;
    }

    setLoadState('loading');
    const loader = shareId
      ? getSelectedStudentGameShare(shareId).then((result) => result?.game || null)
      : getSharedGame(id!);

    loader
      .then((loadedGame) => {
        if (!loadedGame) {
          setLoadState('not-found');
          return;
        }
        setGame(loadedGame);
        setLoadState('ready');
      })
      .catch(() => setLoadState('error'));
  }, [id, shareId]);

  useEffect(() => {
    if (phase === 'play') document.body.classList.add('gameplay-active');
    else document.body.classList.remove('gameplay-active');

    return () => document.body.classList.remove('gameplay-active');
  }, [phase]);

  const questionCount = useMemo(() => (game ? countPlayableQuestions(game) : 0), [game]);

  const startGame = () => {
    if (!game || UNSUPPORTED_STUDENT_TYPES.has(game.config.type)) return;
    const gameIdToTrack = game.sourceGameId || game.id;
    if (gameIdToTrack) void recordGamePlay(gameIdToTrack);
    setPlayOptions(buildStudentOptions(game, studentName));
    setPlayKey((prev) => prev + 1);
    setPhase('play');
  };

  const returnToStart = () => {
    setPhase('start');
    setPlayOptions(null);
  };

  if (loadState === 'loading' || loadState === 'idle') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-blue border-t-transparent" />
      </div>
    );
  }

  if (loadState === 'not-found' || loadState === 'error' || !game) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <AlertTriangle size={22} />
          </div>
          <h1 className="mb-2 text-2xl font-black text-slate-800">Game not available</h1>
          <p className="mb-6 text-slate-500">Ask your teacher to check the student practice link.</p>
          <button onClick={() => navigate('/')} className="rounded-xl bg-brand-blue px-6 py-3 font-bold text-white">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const unsupported = UNSUPPORTED_STUDENT_TYPES.has(game.config.type);
  const createdByName = game.config.originalCreatorName || game.authorName || 'Teacher';
  const createdByAvatar = game.config.originalCreatorAvatar || game.authorAvatar || game.config.authorAvatar;
  const createdDate = formatCreatedDate(game.createdAt);

  if (phase === 'start') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-5">
            <div className="text-xs font-black uppercase tracking-wide text-brand-blue">Student Practice</div>
            <h1 className="mt-2 text-3xl font-black leading-tight text-slate-900">{game.title}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {game.config.type} | {questionCount} question{questionCount === 1 ? '' : 's'}
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar
                    name={createdByName}
                    src={createdByAvatar}
                    className="h-9 w-9 shrink-0"
                    textClassName="text-[11px]"
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Created by</div>
                    <div className="truncate text-sm font-black text-slate-800">{createdByName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                  <Calendar size={15} className="text-slate-400" />
                  <span>{createdDate}</span>
                </div>
              </div>
            </div>
          </div>

          {unsupported ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              This game type is not available for student practice.
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                startGame();
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">Name</label>
                <input
                  value={studentName}
                  onChange={(event) => setStudentName(event.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-xl border border-slate-300 bg-white p-4 text-lg font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-yellow"
                />
              </div>
              <button
                type="submit"
                disabled={questionCount === 0}
                className="w-full rounded-xl bg-brand-yellow px-6 py-4 text-xl font-black text-slate-900 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start Game
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (!playOptions) return null;

  const commonProps = {
    game,
    options: playOptions,
    onBack: returnToStart,
    onFinish: returnToStart,
    onReplay: startGame,
  };

  return <LazyGameRunner key={playKey} {...commonProps} />;
};
