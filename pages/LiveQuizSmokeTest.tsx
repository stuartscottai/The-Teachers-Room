import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Home, Trophy, WifiOff, XCircle } from 'lucide-react';
import { LiveQuizLeaderboardStage } from '../components/games/LiveQuizLeaderboardStage';
import { LiveQuizParticipant, LiveQuizSubmission } from '../types';
import { LiveQuizHost, type LiveQuizHostPreview } from './LiveQuizHost';
import { LiveQuizStudent, type LiveQuizStudentPreview } from './LiveQuizStudent';

const smokeImage =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300"><rect width="480" height="300" fill="#eff6ff"/><circle cx="240" cy="130" r="70" fill="#facc15"/><text x="240" y="250" text-anchor="middle" font-family="Arial" font-size="32" font-weight="700" fill="#0f172a">Live quiz</text></svg>'
  );

const participants: LiveQuizParticipant[] = [
  { id: 'team-2', sessionId: 'smoke-session', displayName: 'Team 2', score: 1808, joinedAt: new Date().toISOString() },
  { id: 'team-1', sessionId: 'smoke-session', displayName: 'Team 1', score: 336, joinedAt: new Date().toISOString() },
];

const submissions: LiveQuizSubmission[] = [
  {
    id: 'submission-1',
    sessionId: 'smoke-session',
    participantId: 'team-2',
    questionIndex: 0,
    answer: 'Correct',
    isCorrect: true,
    responseMs: 2400,
    pointsAwarded: 808,
    submittedAt: new Date().toISOString(),
  },
  {
    id: 'submission-2',
    sessionId: 'smoke-session',
    participantId: 'team-1',
    questionIndex: 0,
    answer: 'Wrong A',
    isCorrect: false,
    responseMs: 3200,
    pointsAwarded: 0,
    submittedAt: new Date().toISOString(),
  },
];

const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`mx-auto w-full max-w-4xl rounded-3xl border border-white/10 bg-white p-6 text-slate-900 shadow-2xl ${className}`}>{children}</div>
);

const SmokeExitScreen: React.FC<{ kind: 'disconnected' | 'removed' }> = ({ kind }) => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
    <Panel className="max-w-md text-center">
      <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${kind === 'removed' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
        {kind === 'removed' ? <XCircle size={28} /> : <WifiOff size={28} />}
      </div>
      <h1 className="text-2xl font-black">{kind === 'removed' ? 'You have been removed' : 'Teacher disconnected'}</h1>
      <p className="mt-2 text-sm font-semibold text-slate-500">
        {kind === 'removed'
          ? 'Ask your teacher for the join code if you need to rejoin.'
          : 'The host screen is no longer connected, so this live quiz has paused or ended.'}
      </p>
      <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-yellow px-5 py-3 font-black text-slate-900">
        <Home size={18} />
        Go to homepage
      </button>
    </Panel>
  </div>
);

const TeacherSmokeFlow: React.FC<{ promo?: boolean }> = ({ promo = false }) => {
  const preview = useMemo<LiveQuizHostPreview>(() => ({
    session: { id: 'smoke-session', title: promo ? 'Live Quiz Challenge' : 'Teacher Live Quiz Smoke',
      joinCode: promo ? 'PLAY24' : 'SMOKE1', status: 'lobby', currentQuestionIndex: 0, timerSeconds: 60 },
    questions: [
      { questionIndex: 0, question: promo ? 'Which two colours mix to make purple?' : 'Which answer is correct?',
        options: promo ? ['Red and blue', 'Yellow and green', 'Red and yellow', 'Blue and green'] : ['Correct', 'Wrong A', 'Wrong B', 'Wrong C'],
        answer: promo ? 'Red and blue' : 'Correct', category: promo ? 'Colour lab' : 'Smoke quiz', points: 1000,
        ...(!promo ? { image: { url: smokeImage, alt: 'Live quiz smoke image' } } : {}) },
      { questionIndex: 1, question: 'Which planet is famous for its rings?',
        options: ['Saturn', 'Mars', 'Earth', 'Mercury'], answer: 'Saturn', category: 'Space explorers', points: 1000 },
    ],
    participants,
    answerDelayMs: promo ? 2000 : undefined,
    submissions: submissions.map((submission) => ({ ...submission,
      answer: promo ? (submission.isCorrect ? 'Red and blue' : 'Yellow and green') : submission.answer })),
  }), [promo]);
  return <LiveQuizHost preview={preview} />;
};

const StudentSmokeFlow: React.FC = () => {
  const [phase, setPhase] = useState<'join' | 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'ended'>('join');
  const [answer, setAnswer] = useState('');
  const myRank = useMemo(() => participants.findIndex((participant) => participant.id === 'team-2') + 1, []);

  if (phase === 'leaderboard') {
    return (
      <LiveQuizLeaderboardStage
        participants={participants}
        submissions={submissions}
        questionIndex={0}
        title={`You are #${myRank}`}
        subtitle="Round result"
        currentParticipantId="team-2"
        maxRows={8}
        controls={<button onClick={() => setPhase('ended')} className="rounded-xl bg-brand-yellow px-5 py-3 font-black text-slate-900">Finish Game</button>}
      />
    );
  }

  if (phase === 'ended') {
    return (
      <div className="relative min-h-screen overflow-hidden bg-slate-950 p-4 text-white [background:radial-gradient(circle_at_top_left,rgba(14,165,233,0.3),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.2),transparent_34%),#020617]">
        <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col justify-center py-8">
          <div className="mb-5 text-center">
            <Trophy className="mx-auto mb-4 text-brand-yellow" size={54} />
            <h1 className="font-display text-4xl font-black sm:text-5xl">Final standings</h1>
            <p className="mt-2 text-lg font-bold text-white/75">Team 2 wins with 1,808 points</p>
          </div>
          <div className="mb-5 rounded-3xl border border-yellow-300/35 bg-yellow-300 p-5 text-center text-slate-950 shadow-2xl">
            <div className="text-sm font-black uppercase tracking-wide text-slate-700">Your result</div>
            <div className="mt-1 font-display text-4xl font-black">Rank #{myRank}</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-3 shadow-2xl backdrop-blur sm:p-4">
            <h2 className="mb-3 text-xl font-black">All participants</h2>
            {participants.map((participant, index) => (
              <div key={participant.id} className={`mb-2 grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 ${participant.id === 'team-2' ? 'border-yellow-300 bg-yellow-300 text-slate-950' : 'border-white/10 bg-slate-950/45 text-white'}`}>
                <div className="text-2xl font-black">#{index + 1}</div>
                <div className="truncate text-lg font-black">{participant.displayName}</div>
                <div className="text-right text-lg font-black">{participant.score} pts</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
      <Panel className="max-w-xl">
        {phase === 'join' && (
          <>
            <div className="text-sm font-black uppercase tracking-wide text-brand-blue">Live Quiz</div>
            <h1 className="mt-2 text-3xl font-black">Join smoke quiz</h1>
            <input className="mt-5 w-full rounded-xl border border-slate-300 p-4 text-lg font-bold" placeholder="Enter your name" defaultValue="Team 2" />
            <button onClick={() => setPhase('lobby')} className="mt-4 w-full rounded-xl bg-brand-yellow px-6 py-4 text-xl font-black text-slate-900">Join Game</button>
          </>
        )}
        {phase === 'lobby' && (
          <div className="text-center">
            <h1 className="text-3xl font-black">You are in</h1>
            <p className="mt-2 text-lg font-bold text-slate-500">Waiting for the teacher to start...</p>
            <button onClick={() => setPhase('question')} className="mt-6 rounded-xl bg-brand-yellow px-6 py-3 font-black text-slate-900">Teacher starts question</button>
          </div>
        )}
        {phase === 'question' && (
          <>
            <div className="text-sm font-black uppercase tracking-wide text-brand-blue">Question 1</div>
            <img src={smokeImage} alt="Live quiz smoke image" className="mt-4 h-44 w-full rounded-xl border border-slate-200 object-contain" />
            <h1 className="mt-4 text-2xl font-black">Which answer is correct?</h1>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {['Correct', 'Wrong A', 'Wrong B', 'Wrong C'].map((option) => (
                <button key={option} onClick={() => setAnswer(option)} className={`rounded-xl border p-4 font-black ${answer === option ? 'border-brand-yellow bg-yellow-50' : 'border-slate-200 bg-slate-50'}`}>
                  {option}
                </button>
              ))}
            </div>
            <button onClick={() => setPhase('reveal')} disabled={!answer} className="mt-5 w-full rounded-xl bg-brand-yellow px-6 py-3 font-black text-slate-900 disabled:opacity-50">Submit answer</button>
          </>
        )}
        {phase === 'reveal' && (
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-4 text-emerald-500" size={46} />
            <h1 className="text-3xl font-black">Correct</h1>
            <p className="mt-2 text-lg font-bold text-slate-500">Correct answer: Correct</p>
            <button onClick={() => setPhase('leaderboard')} className="mt-6 rounded-xl bg-brand-yellow px-6 py-3 font-black text-slate-900">Show leaderboard</button>
          </div>
        )}
      </Panel>
    </div>
  );
};

export const LiveQuizSmokeTest: React.FC = () => {
  const [params] = useSearchParams();
  const mode = params.get('mode') || 'teacher';

  if (mode === 'disconnected') return <SmokeExitScreen kind="disconnected" />;
  if (mode === 'removed') return <SmokeExitScreen kind="removed" />;
  if (mode === 'student' && params.get('promo') === '1') return <PromoStudent stage={params.get('stage') || 'question'} />;
  if (mode === 'student') return <StudentSmokeFlow />;
  return <TeacherSmokeFlow promo={params.get('promo') === '1'} />;
};

const PromoStudent: React.FC<{ stage: string }> = ({ stage }) => {
  const preview = useMemo<LiveQuizStudentPreview>(() => ({
    participantId: 'team-2', participants,
    session: { id: 'smoke-session', title: 'Live Quiz Challenge', joinCode: 'PLAY24',
      status: stage === 'lobby' ? 'lobby' : 'question', currentQuestionIndex: 0,
      timerSeconds: 60, questionStartedAt: new Date().toISOString() },
    question: { questionIndex: 0, question: 'Which two colours mix to make purple?',
      options: ['Red and blue', 'Yellow and green', 'Red and yellow', 'Blue and green'], points: 1000, category: 'Colour lab' },
  }), [stage]);
  return <LiveQuizStudent preview={preview} />;
};
