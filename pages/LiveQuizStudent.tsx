import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, CheckCircle2, Clock, Sparkles, Trophy, XCircle } from 'lucide-react';
import {
  getCurrentStudentQuestion,
  getLiveQuizParticipants,
  getLiveQuizSession,
  getLiveQuizSubmissions,
  submitLiveQuizAnswer,
} from '../utils/liveQuizUtils';
import { LiveQuizParticipant, LiveQuizSession, LiveQuizSubmission, StudentSafeLiveQuizQuestion } from '../types';
import { resolveGameImageUrl } from '../utils/gameImage';

const normalizeAnswer = (value?: string | null) => String(value || '').trim().toLowerCase();

const ANSWER_TILE_STYLES = [
  'border-red-300 bg-red-50 text-red-900',
  'border-sky-300 bg-sky-50 text-sky-900',
  'border-amber-300 bg-amber-50 text-amber-900',
  'border-violet-300 bg-violet-50 text-violet-900',
];

const AnimatedScore: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const start = previousValueRef.current;
    const delta = value - start;
    if (delta === 0) {
      setDisplayValue(value);
      return;
    }

    const startedAt = performance.now();
    const duration = 750;
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(start + delta * eased));
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        previousValueRef.current = value;
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [value]);

  return <span className={className}>{displayValue}</span>;
};

export const LiveQuizStudent: React.FC = () => {
  const { sessionId = '', participantId = '' } = useParams();
  const [session, setSession] = useState<LiveQuizSession | null>(null);
  const [question, setQuestion] = useState<StudentSafeLiveQuizQuestion | null>(null);
  const [participants, setParticipants] = useState<LiveQuizParticipant[]>([]);
  const [submissions, setSubmissions] = useState<LiveQuizSubmission[]>([]);
  const [submittedQuestion, setSubmittedQuestion] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      const [nextSession, nextQuestion, nextParticipants, nextSubmissions] = await Promise.all([
        getLiveQuizSession(sessionId),
        getCurrentStudentQuestion(sessionId),
        getLiveQuizParticipants(sessionId),
        getLiveQuizSubmissions(sessionId),
      ]);
      if (disposed) return;
      setSession(nextSession);
      setQuestion(nextQuestion);
      setParticipants(nextParticipants);
      setSubmissions(nextSubmissions);
      if (nextSession && submittedQuestion !== null && nextSession.currentQuestionIndex !== submittedQuestion) {
        setSubmittedQuestion(null);
        setSelectedAnswer('');
        setError('');
      }
    };
    void load();
    const intervalId = window.setInterval(load, 900);
    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [participantId, sessionId, submittedQuestion]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(intervalId);
  }, []);

  const me = useMemo(() => participants.find((participant) => participant.id === participantId), [participantId, participants]);
  const ranking = useMemo(
    () => [...participants].sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName)),
    [participants]
  );
  const ownSubmission = useMemo(
    () => submissions.find((submission) => submission.participantId === participantId && submission.questionIndex === question?.questionIndex),
    [participantId, question?.questionIndex, submissions]
  );
  const effectiveSelectedAnswer = selectedAnswer || ownSubmission?.answer || '';
  const hasSubmitted = Boolean(question && (submittedQuestion === question.questionIndex || effectiveSelectedAnswer));
  const revealVisible = Boolean(question?.revealedAnswer && ['reveal', 'leaderboard'].includes(session?.status || ''));
  const isOwnAnswerCorrect = revealVisible && ownSubmission ? ownSubmission.isCorrect : false;
  const imageUrl = resolveGameImageUrl(question?.image?.url, question?.image?.thumbUrl);
  const elapsedMs = session?.questionStartedAt ? Math.max(0, nowMs - new Date(session.questionStartedAt).getTime()) : 0;
  const timeLeft = session?.status === 'question'
    ? Math.max(0, Math.ceil(((session.timerSeconds * 1000) - elapsedMs) / 1000))
    : 0;
  const canAnswer = session?.status === 'question' && timeLeft > 0 && question && !hasSubmitted && !submitting;

  const handleAnswer = async (answer: string) => {
    if (!question || !canAnswer) return;
    setSubmitting(true);
    setError('');
    setSelectedAnswer(answer);
    const result = await submitLiveQuizAnswer(sessionId, participantId, question.questionIndex, answer);
    setSubmitting(false);
    if (!result.success) {
      if (String(result.error || '').toLowerCase().includes('duplicate')) {
        setSubmittedQuestion(question.questionIndex);
        return;
      }
      setError(result.error || 'Answer could not be submitted.');
      return;
    }
    setSubmittedQuestion(question.questionIndex);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-yellow border-t-transparent" />
      </div>
    );
  }

  if (session.status === 'lobby') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-yellow text-slate-900">
            <Clock size={28} />
          </div>
          <h1 className="text-3xl font-black">You are in</h1>
          <p className="mt-2 text-lg font-bold text-white/70">Waiting for the teacher to start...</p>
          {me && <div className="mt-6 rounded-xl bg-white/10 p-4 font-black">{me.displayName}</div>}
        </div>
      </div>
    );
  }

  if (session.status === 'ended') {
    const myRank = ranking.findIndex((participant) => participant.id === participantId) + 1;
    return (
      <div className="min-h-screen bg-slate-950 p-4 text-white flex items-center justify-center">
        <div className="w-full max-w-lg text-center">
          <Trophy className="mx-auto mb-4 text-brand-yellow" size={54} />
          <h1 className="text-4xl font-black">Game Over</h1>
          <p className="mt-2 text-white/70 font-bold">
            {me ? `${me.displayName}: ${me.score} points` : 'Final scores are in.'}
          </p>
          {myRank > 0 && <div className="mt-4 rounded-2xl bg-white/10 p-5 text-2xl font-black">Rank #{myRank}</div>}
        </div>
      </div>
    );
  }

  if (session.status === 'leaderboard') {
    const myRank = ranking.findIndex((participant) => participant.id === participantId) + 1;
    const roundGain = ownSubmission?.pointsAwarded || 0;
    const leaderboardRows = ranking.slice(0, 8).map((participant) => ({
      ...participant,
      roundGain: submissions.find(
        (submission) => submission.participantId === participant.id && submission.questionIndex === session.currentQuestionIndex
      )?.pointsAwarded || 0,
    }));

    return (
      <div className="min-h-screen bg-slate-950 p-4 text-white [background:radial-gradient(circle_at_top_left,rgba(14,165,233,0.28),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.18),transparent_34%),#020617]">
        <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col justify-center">
          <div className="mb-4 rounded-3xl bg-white p-5 text-slate-900 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-brand-blue">
                  <Sparkles size={15} />
                  Round result
                </div>
                <h1 className="text-3xl font-black sm:text-4xl">
                  {myRank > 0 ? `You are #${myRank}` : 'Leaderboard'}
                </h1>
              </div>
              <div className="text-right">
                <div className="text-xs font-black uppercase text-slate-400">Total score</div>
                <div className="font-mono text-4xl font-black text-slate-950">
                  <AnimatedScore value={me?.score || 0} />
                </div>
              </div>
            </div>
            <div className={`mt-4 rounded-2xl px-4 py-3 text-center font-black ${
              roundGain > 0 ? 'bg-lime-100 text-lime-950 ring-2 ring-lime-300' : 'bg-slate-100 text-slate-600'
            }`}>
              {roundGain > 0 ? `+${roundGain} points this question` : 'No points this question'}
            </div>
          </div>

          <div className="space-y-2">
            {leaderboardRows.map((participant, index) => (
              <div
                key={participant.id}
                className={`rounded-2xl px-4 py-3 shadow-xl ${
                  participant.id === participantId
                    ? 'bg-brand-yellow text-slate-950 ring-4 ring-white/40'
                    : index === 0
                    ? 'bg-amber-50 text-amber-950'
                    : 'bg-white text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                      participant.id === participantId ? 'bg-slate-950 text-brand-yellow' : 'bg-slate-100 text-slate-700'
                    }`}>
                      #{index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-black sm:text-lg">{participant.displayName}</div>
                      <div className={`mt-0.5 text-xs font-black ${
                        participant.roundGain > 0
                          ? participant.id === participantId ? 'text-slate-800' : 'text-lime-700'
                          : participant.id === participantId ? 'text-slate-700' : 'text-slate-400'
                      }`}>
                        {participant.roundGain > 0 ? `+${participant.roundGain} last round` : 'No points last round'}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-2xl font-black sm:text-3xl">
                      <AnimatedScore value={participant.score} />
                    </div>
                    <div className={`text-[10px] font-black uppercase ${
                      participant.id === participantId ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      points
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-5 text-center text-sm font-bold text-white/70">Waiting for the next question...</p>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
        <div className="text-center text-xl font-black">Waiting for the next question...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white [background:radial-gradient(circle_at_top_left,rgba(14,165,233,0.24),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.16),transparent_32%),#020617]">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-3xl flex-col">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-black">
            Question {question.questionIndex + 1}
          </div>
          {session.status === 'question' && (
            <div className={`rounded-full px-4 py-2 text-sm font-black ${timeLeft <= 5 ? 'bg-red-500 text-white' : 'bg-white/10 text-white'}`}>
              {timeLeft}s
            </div>
          )}
          {me && ['leaderboard', 'ended'].includes(session.status) && <div className="rounded-full bg-brand-yellow px-4 py-2 text-sm font-black text-slate-900">{me.score} pts</div>}
        </div>

        <div className="flex flex-1 flex-col justify-center rounded-3xl bg-white p-5 text-slate-900 shadow-2xl">
          {imageUrl && (
            <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <img src={imageUrl} alt="" className="h-44 w-full object-contain" />
            </div>
          )}
          {question.category && <div className="mb-2 text-xs font-black uppercase tracking-wide text-brand-blue">{question.category}</div>}
          <h1 className="text-2xl font-black leading-tight sm:text-4xl">{question.question}</h1>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {question.options.map((option, index) => {
              const isSelected = normalizeAnswer(effectiveSelectedAnswer) === normalizeAnswer(option);
              const isCorrectAnswer = revealVisible && normalizeAnswer(question.revealedAnswer) === normalizeAnswer(option);
              const isWrongSelection = revealVisible && isSelected && !isCorrectAnswer;
              const optionClass = isCorrectAnswer
                ? 'border-lime-700 bg-lime-100 text-lime-950 ring-4 ring-lime-300 shadow-xl'
                : isWrongSelection
                ? 'border-red-700 bg-red-100 text-red-950 ring-4 ring-red-300'
                : revealVisible
                ? 'border-slate-200 bg-slate-100 text-slate-500 opacity-60'
                : isSelected
                ? 'border-slate-950 bg-white text-slate-950 ring-4 ring-brand-yellow shadow-xl scale-[1.01]'
                : `${ANSWER_TILE_STYLES[index % ANSWER_TILE_STYLES.length]} opacity-95`;

              return (
                <button
                  key={`${question.questionIndex}-${option}`}
                  type="button"
                  disabled={!canAnswer}
                  onClick={() => void handleAnswer(option)}
                  className={`relative min-h-[84px] rounded-2xl border-2 p-5 pr-12 text-left text-xl font-black shadow-sm transition hover:scale-[1.01] hover:border-brand-blue disabled:cursor-not-allowed ${optionClass} ${!revealVisible && !canAnswer && !isSelected && !isCorrectAnswer ? 'opacity-60' : ''}`}
                >
                  <span className={`mr-2 ${isCorrectAnswer ? 'text-lime-800' : isWrongSelection ? 'text-red-600' : revealVisible ? 'text-slate-400' : 'text-brand-blue'}`}>
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {option}
                  {isCorrectAnswer && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-lime-800" size={26} />}
                  {isWrongSelection && <XCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-red-700" size={26} />}
                  {isSelected && !revealVisible && <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-950" size={24} />}
                </button>
              );
            })}
          </div>

          {hasSubmitted && !revealVisible && (
            <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-slate-100 p-4 text-center font-black text-slate-700">
              <CheckCircle size={18} className="text-emerald-600" />
              Submitted
            </div>
          )}
          {revealVisible && (
            <div className={`mt-5 rounded-xl p-4 text-center font-black ${isOwnAnswerCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
              {isOwnAnswerCorrect ? `Correct +${ownSubmission?.pointsAwarded || 0}` : 'No points this round'}
            </div>
          )}
          {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
        </div>
      </div>
    </div>
  );
};
