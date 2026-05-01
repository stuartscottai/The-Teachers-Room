import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Home, Trophy, WifiOff, XCircle } from 'lucide-react';
import { LiveQuizLeaderboardStage } from '../components/games/LiveQuizLeaderboardStage';
import { WinnerCeremonyHero, WinnerCeremonyRankingEntry } from '../components/games/shared/WinnerCeremonyHero';
import { LiveQuizParticipant, LiveQuizSubmission } from '../types';

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

const finalRanking: WinnerCeremonyRankingEntry[] = participants.map((participant, index) => ({
  index,
  name: participant.displayName,
  score: participant.score,
}));

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

const TeacherSmokeFlow: React.FC = () => {
  const [phase, setPhase] = useState<'lobby' | 'question' | 'reveal' | 'leaderboard' | 'ended'>('lobby');

  if (phase === 'leaderboard') {
    return (
      <LiveQuizLeaderboardStage
        participants={participants}
        submissions={submissions}
        questionIndex={0}
        title="Leaderboard"
        subtitle="Question 1 results"
        controls={
          <button onClick={() => setPhase('ended')} className="rounded-xl bg-brand-yellow px-5 py-3 font-black text-slate-900">
            Final Podium
          </button>
        }
      />
    );
  }

  if (phase === 'ended') {
    return (
      <WinnerCeremonyHero
        winnerHeadline="Team 2 wins!"
        subtitle="Live Quiz Challenge final standings"
        ranking={finalRanking}
        isMobileViewport={false}
        onPlayAgain={() => setPhase('lobby')}
        onExit={() => setPhase('lobby')}
      >
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-white/15 bg-slate-950/80 p-4 text-left shadow-2xl">
          <h2 className="mb-3 text-2xl font-black text-white">Final positions</h2>
          {finalRanking.map((entry, index) => (
            <div key={entry.name} className="mb-2 grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-white/10 p-3 text-white">
              <div className="text-2xl font-black">#{index + 1}</div>
              <div className="truncate text-xl font-black">{entry.name}</div>
              <div className="font-mono text-xl font-black">{entry.score} pts</div>
            </div>
          ))}
        </div>
      </WinnerCeremonyHero>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white [background:radial-gradient(circle_at_top_left,rgba(14,165,233,0.28),transparent_38%),#020617]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-black">Teacher Live Quiz Smoke</h1>
          <div className="rounded-full bg-brand-yellow px-4 py-2 text-sm font-black text-slate-900">Code SMOKE1</div>
        </div>
        <Panel>
          {phase === 'lobby' && (
            <>
              <div className="text-sm font-black uppercase tracking-wide text-brand-blue">Lobby</div>
              <h2 className="mt-2 text-3xl font-black">Waiting for players</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {participants.map((participant) => (
                  <div key={participant.id} className="rounded-2xl bg-slate-100 p-4 font-black">{participant.displayName}</div>
                ))}
              </div>
              <button onClick={() => setPhase('question')} className="mt-6 rounded-xl bg-brand-yellow px-6 py-3 font-black text-slate-900">Start Game</button>
            </>
          )}
          {phase === 'question' && (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black uppercase tracking-wide text-brand-blue">Question 1 of 1</div>
                  <h2 className="mt-2 text-3xl font-black">Which answer is correct?</h2>
                </div>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black">2/2 answered</div>
              </div>
              <img src={smokeImage} alt="Live quiz smoke image" className="mt-5 h-56 w-full rounded-xl border border-slate-200 object-contain" />
              <button onClick={() => setPhase('reveal')} className="mt-6 rounded-xl bg-brand-blue px-6 py-3 font-black text-white">Reveal Answer</button>
            </>
          )}
          {phase === 'reveal' && (
            <>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 font-black text-emerald-800">
                <CheckCircle2 size={18} />
                Round complete
              </div>
              <h2 className="mt-4 text-3xl font-black">Correct answer: Correct</h2>
              <button onClick={() => setPhase('leaderboard')} className="mt-6 rounded-xl bg-brand-yellow px-6 py-3 font-black text-slate-900">Show Leaderboard</button>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
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
  if (mode === 'student') return <StudentSmokeFlow />;
  return <TeacherSmokeFlow />;
};
