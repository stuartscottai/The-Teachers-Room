import React, { useMemo, useState } from 'react';
import { AlertTriangle, Calendar } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { TriviaGame } from '../components/games/TriviaGame';
import { GameRunOptions, GameType, GeneratedGame } from '../types';

const smokeImage =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300"><rect width="480" height="300" fill="#dcfce7"/><circle cx="240" cy="130" r="70" fill="#38bdf8"/><text x="240" y="250" text-anchor="middle" font-family="Arial" font-size="32" font-weight="700" fill="#0f172a">Student practice</text></svg>'
  );

const game: GeneratedGame = {
  id: '00000000-0000-4000-8000-000000000002',
  title: 'Student practice smoke test',
  authorName: 'Test Teacher',
  authorAvatar: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  config: {
    type: GameType.TRIVIA,
    questionCount: 1,
    questionType: 'multiple-choice',
    topic: 'Smoke testing',
    isAI: false,
  },
  questions: [
    {
      id: 1,
      question: 'Which answer should be selected for this practice test?',
      answer: 'Correct',
      options: ['Wrong A', 'Correct', 'Wrong B', 'Wrong C'],
      points: 100,
      isBonus: false,
      image: {
        url: smokeImage,
        thumbUrl: smokeImage,
        source: 'upload',
        alt: 'Student practice smoke image',
      },
    },
  ],
};

const buildOptions = (studentName: string): GameRunOptions => ({
  players: 1,
  timerSeconds: 30,
  enableBonuses: false,
  strictMode: false,
  questionLimit: 1,
  teamNames: [studentName.trim() || 'Student'],
  muted: true,
  randomizeQuestions: false,
  triviaRandomPoints: false,
  dartsMode: 'high-score',
  dartsLegs: 1,
  teamLives: 3,
  bombDuration: 30,
  studentPractice: true,
});

export const StudentPracticeSmokeTest: React.FC = () => {
  const [phase, setPhase] = useState<'start' | 'play' | 'exit'>('start');
  const [studentName, setStudentName] = useState('');
  const [playKey, setPlayKey] = useState(0);
  const playOptions = useMemo(() => buildOptions(studentName), [studentName]);

  const startGame = () => {
    setPlayKey((prev) => prev + 1);
    setPhase('play');
  };

  if (phase === 'exit') {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
          <AlertTriangle className="mx-auto mb-3 text-brand-blue" />
          <h1 className="text-2xl font-black text-slate-900">Practice exited</h1>
        </div>
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <TriviaGame
        key={playKey}
        game={game}
        options={playOptions}
        onBack={() => setPhase('start')}
        onFinish={() => setPhase('exit')}
        onReplay={startGame}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-5">
          <div className="text-xs font-black uppercase tracking-wide text-brand-blue">Student Practice</div>
          <h1 className="mt-2 text-3xl font-black leading-tight text-slate-900">{game.title}</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">Trivia Quiz | 1 question</p>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar name="Test Teacher" className="h-9 w-9 shrink-0" textClassName="text-[11px]" />
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Created by</div>
                  <div className="truncate text-sm font-black text-slate-800">Test Teacher</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <Calendar size={15} className="text-slate-400" />
                <span>Jan 1, 2026</span>
              </div>
            </div>
          </div>
        </div>

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
            className="w-full rounded-xl bg-brand-yellow px-6 py-4 text-xl font-black text-slate-900 hover:bg-yellow-300"
          >
            Start Game
          </button>
        </form>
      </div>
    </div>
  );
};
