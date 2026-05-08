import React, { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle, Copy, Crown, Music, Play, SkipForward, Trophy, UserMinus, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getLiveQuizJoinUrl,
  getLiveQuizParticipants,
  getLiveQuizQuestionsForTeacher,
  getLiveQuizSession,
  getLiveQuizSubmissions,
  removeLiveQuizParticipant,
  resetLiveQuizSession,
  updateLiveQuizHostHeartbeat,
  updateLiveQuizStatus,
} from '../utils/liveQuizUtils';
import { LiveQuizParticipant, LiveQuizQuestion, LiveQuizSession, LiveQuizSubmission } from '../types';
import { resolveGameImageUrl } from '../utils/gameImage';
import { WinnerCeremonyHero, WinnerCeremonyRankingEntry } from '../components/games/shared/WinnerCeremonyHero';
import { LiveQuizLeaderboardStage } from '../components/games/LiveQuizLeaderboardStage';

const useIsMobileViewport = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return isMobile;
};

const getRoundGain = (submissions: LiveQuizSubmission[], participantId: string, questionIndex: number) =>
  submissions.find((submission) => submission.participantId === participantId && submission.questionIndex === questionIndex)?.pointsAwarded || 0;

const ANSWER_TILE_STYLES = [
  'border-red-300 bg-red-50 text-red-900',
  'border-sky-300 bg-sky-50 text-sky-900',
  'border-amber-300 bg-amber-50 text-amber-900',
  'border-violet-300 bg-violet-50 text-violet-900',
];

const LOBBY_TRACKS = [
  { id: 'chill', label: 'Chill', src: '/assets/audio/live-quiz/chill.mp3' },
  { id: 'relax', label: 'Relax', src: '/assets/audio/live-quiz/relax.mp3' },
  { id: 'mystery', label: 'Mystery', src: '/assets/audio/live-quiz/mystery.mp3' },
  { id: 'pop', label: 'Pop', src: '/assets/audio/live-quiz/pop.mp3' },
  { id: 'strings', label: 'Strings', src: '/assets/audio/live-quiz/strings.mp3' },
  { id: 'cello', label: 'Cello', src: '/assets/audio/live-quiz/cello.mp3' },
] as const;

type LobbyTrackId = typeof LOBBY_TRACKS[number]['id'];

const useLiveQuizMusic = (enabled: boolean, mode: 'lobby' | 'focus' | 'off', lobbyTrack: LobbyTrackId) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (!enabled || mode === 'off') return;

    const selectedLobbyTrack = LOBBY_TRACKS.find((track) => track.id === lobbyTrack) || LOBBY_TRACKS[0];
    const src = mode === 'focus'
      ? '/assets/audio/live-quiz/focus.mp3'
      : selectedLobbyTrack.src;
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = mode === 'focus' ? 0.28 : 0.32;
    audioRef.current = audio;
    void audio.play().catch(() => {
      // Browsers can block autoplay until the teacher clicks a control.
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [enabled, lobbyTrack, mode]);
};

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
    const duration = 700;
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

export const LiveQuizHost: React.FC = () => {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobileViewport = useIsMobileViewport();
  const [session, setSession] = useState<LiveQuizSession | null>(null);
  const [questions, setQuestions] = useState<LiveQuizQuestion[]>([]);
  const [participants, setParticipants] = useState<LiveQuizParticipant[]>([]);
  const [submissions, setSubmissions] = useState<LiveQuizSubmission[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [removingParticipantId, setRemovingParticipantId] = useState<string | null>(null);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [lobbyTrack, setLobbyTrack] = useState<LobbyTrackId>('menu');

  const load = async () => {
    const [nextSession, nextQuestions, nextParticipants, nextSubmissions] = await Promise.all([
      getLiveQuizSession(sessionId),
      getLiveQuizQuestionsForTeacher(sessionId),
      getLiveQuizParticipants(sessionId),
      getLiveQuizSubmissions(sessionId),
    ]);
    setSession(nextSession);
    setQuestions(nextQuestions);
    setParticipants(nextParticipants);
    setSubmissions(nextSubmissions);
  };

  useEffect(() => {
    void load();
    const intervalId = window.setInterval(load, 1000);
    return () => window.clearInterval(intervalId);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const sendHeartbeat = () => void updateLiveQuizHostHeartbeat(sessionId);
    sendHeartbeat();
    const intervalId = window.setInterval(sendHeartbeat, 5000);
    return () => window.clearInterval(intervalId);
  }, [sessionId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!session || ['ended'].includes(session.status)) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [session?.id, session?.status]);

  const currentQuestion = questions[session?.currentQuestionIndex || 0];
  const joinUrl = session ? getLiveQuizJoinUrl(session.joinCode) : '';
  const ranking = useMemo(
    () => [...participants].sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName)),
    [participants]
  );
  const currentSubmissions = useMemo(
    () => submissions.filter((submission) => submission.questionIndex === (session?.currentQuestionIndex || 0)),
    [session?.currentQuestionIndex, submissions]
  );
  const allPlayersAnswered = participants.length > 0 && currentSubmissions.length >= participants.length;
  const imageUrl = resolveGameImageUrl(currentQuestion?.image?.url, currentQuestion?.image?.thumbUrl);
  const showRoundScores = ['leaderboard', 'ended'].includes(session?.status || '');
  const displayedRanking = useMemo(() => {
    const questionIndex = session?.currentQuestionIndex || 0;
    return [...participants]
      .map((participant) => {
        const roundGain = getRoundGain(submissions, participant.id, questionIndex);
        return {
          ...participant,
          displayScore: showRoundScores ? participant.score : Math.max(0, participant.score - roundGain),
          roundGain,
        };
      })
      .sort((a, b) => b.displayScore - a.displayScore || a.displayName.localeCompare(b.displayName));
  }, [participants, session?.currentQuestionIndex, showRoundScores, submissions]);
  const elapsedMs = session?.questionStartedAt ? Math.max(0, nowMs - new Date(session.questionStartedAt).getTime()) : 0;
  const timeLeft = session?.status === 'question'
    ? Math.max(0, Math.ceil((((session.timerSeconds || 20) * 1000) - elapsedMs) / 1000))
    : 0;
  const roundComplete = Boolean(session && ['locked', 'reveal', 'leaderboard'].includes(session.status));
  const musicMode = session?.status === 'lobby' || session?.status === 'leaderboard'
    ? 'lobby'
    : session?.status === 'question'
      ? 'focus'
      : 'off';
  useLiveQuizMusic(musicEnabled, musicMode, lobbyTrack);

  useEffect(() => {
    if (session?.status !== 'ended') return;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }, [session?.status]);

  useEffect(() => {
    if (!session || session.status !== 'question' || busy) return;
    if (timeLeft > 0 && !allPlayersAnswered) return;
    void lockAnswers();
  }, [allPlayersAnswered, busy, session?.id, session?.status, timeLeft]);

  const setStatus = async (status: LiveQuizSession['status'], nextIndex?: number) => {
    if (!session) return;
    setBusy(true);
    await updateLiveQuizStatus(session.id, status, typeof nextIndex === 'number' ? { currentQuestionIndex: nextIndex } : {});
    await load();
    setBusy(false);
  };

  const startGame = () => setStatus('question', 0);
  const showLeaderboard = () => setStatus('leaderboard');
  const revealAnswer = () => setStatus('reveal');
  const lockAnswers = () => setStatus('locked');
  const endGame = () => setStatus('ended');
  const exitHost = async () => {
    if (!session) {
      navigate('/games');
      return;
    }

    if (session.status === 'ended') {
      navigate('/games');
      return;
    }

    const confirmed = window.confirm(
      'Leaving the host screen will end this live quiz and disconnect all participants. Students will need a new live quiz link or code to play again. Continue?'
    );
    if (!confirmed) return;

    setBusy(true);
    await updateLiveQuizStatus(session.id, 'ended');
    setBusy(false);
    navigate('/games');
  };
  const nextQuestion = () => {
    if (!session) return;
    const nextIndex = session.currentQuestionIndex + 1;
    if (nextIndex >= questions.length) {
      void endGame();
      return;
    }
    void setStatus('question', nextIndex);
  };

  const replayToLobby = async () => {
    if (!session) return;
    setBusy(true);
    const result = await resetLiveQuizSession(session.id);
    if (!result.success) {
      alert(result.error || 'Could not reset this live quiz.');
    }
    await load();
    setBusy(false);
  };

  const removeParticipant = async (participant: LiveQuizParticipant) => {
    if (!session || removingParticipantId) return;
    const confirmed = window.confirm(`Remove ${participant.displayName} from this live quiz? Their answers and score will be removed.`);
    if (!confirmed) return;
    setRemovingParticipantId(participant.id);
    const result = await removeLiveQuizParticipant(session.id, participant.id);
    if (!result.success) {
      alert(result.error || 'Could not remove this player.');
    }
    await load();
    setRemovingParticipantId(null);
  };

  const copyJoinLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      alert(`Share this link:\n${joinUrl}`);
    }
  };

  const AudioControls = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setMusicEnabled((value) => !value)}
        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-black ${musicEnabled ? 'bg-sky-100 text-sky-800' : 'bg-white/10 text-white'}`}
        title="Turn live quiz music on or off"
      >
        <Music size={16} />
        Music {musicEnabled ? 'On' : 'Off'}
      </button>
      {(session?.status === 'lobby' || session?.status === 'leaderboard') && (
        <select
          value={lobbyTrack}
          onChange={(event) => setLobbyTrack(event.target.value as LobbyTrackId)}
          className="h-10 rounded-xl border border-white/20 bg-white px-3 text-sm font-black text-slate-900"
          aria-label="Lobby music"
        >
          {LOBBY_TRACKS.map((track) => (
            <option key={track.id} value={track.id}>{track.label}</option>
          ))}
        </select>
      )}
    </div>
  );

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-yellow border-t-transparent" />
      </div>
    );
  }

  if (user && session.teacherId && user.id !== session.teacherId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-black text-slate-900">Host access required</h1>
          <p className="mt-2 text-slate-500">Sign in as the teacher who created this live quiz.</p>
        </div>
      </div>
    );
  }

  if (session.status === 'ended') {
    const finalRanking: WinnerCeremonyRankingEntry[] = ranking.map((participant, index) => ({
      index,
      score: participant.score,
      name: participant.displayName,
    }));
    const winnerScore = finalRanking[0]?.score ?? 0;
    const winners = finalRanking.filter((entry) => entry.score === winnerScore);
    return (
      <div className="relative min-h-[calc(100vh-4rem)] bg-slate-950">
        <WinnerCeremonyHero
          winnerHeadline={winners.length > 1 ? `WINNERS: ${winners.map((winner) => winner.name).join(' & ')}` : `${winners[0]?.name || 'Winner'} wins!`}
          subtitle="Live Quiz Challenge final standings"
        ranking={finalRanking}
        isMobileViewport={isMobileViewport}
        musicEnabled={musicEnabled}
        onPlayAgain={() => void replayToLobby()}
        onExit={() => navigate('/games')}
        >
          <div className="mx-auto w-full max-w-5xl rounded-3xl border border-white/15 bg-slate-950/82 p-4 text-left shadow-2xl shadow-black/35 backdrop-blur sm:p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <h2 className="font-display text-2xl font-black text-white sm:text-3xl">Final positions</h2>
              <p className="text-sm font-black uppercase tracking-wide text-cyan-200">{finalRanking.length} teams</p>
            </div>
            <div className="grid gap-3">
              {finalRanking.map((entry, index) => {
                const rank = index + 1;
                const rankStyle =
                  rank === 1
                    ? 'border-yellow-300/60 bg-yellow-300 text-slate-950'
                    : rank === 2
                      ? 'border-slate-200/60 bg-slate-200 text-slate-950'
                      : rank === 3
                        ? 'border-orange-300/60 bg-orange-300 text-slate-950'
                        : 'border-white/15 bg-white/10 text-white';
                return (
                  <div
                    key={`${entry.name}-${entry.index}`}
                    className={`grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 shadow-lg sm:grid-cols-[90px_minmax(0,1fr)_180px] sm:p-4 ${rankStyle}`}
                  >
                    <div className="font-display text-3xl font-black sm:text-4xl">#{rank}</div>
                    <div className="min-w-0">
                      <div className="truncate font-display text-2xl font-black sm:text-3xl">{entry.name}</div>
                      <div className={`text-xs font-black uppercase tracking-wide ${rank <= 3 ? 'text-slate-700' : 'text-cyan-200'}`}>Final rank</div>
                    </div>
                    <div className="text-right font-display text-2xl font-black sm:text-3xl">{entry.score.toLocaleString()} pts</div>
                  </div>
                );
              })}
            </div>
          </div>
        </WinnerCeremonyHero>
      </div>
    );
  }

  if (session.status === 'leaderboard') {
    return (
      <LiveQuizLeaderboardStage
        participants={participants}
        submissions={submissions}
        questionIndex={session.currentQuestionIndex}
        title="Leaderboard"
        subtitle={`Question ${session.currentQuestionIndex + 1} results`}
        removingParticipantId={removingParticipantId}
        onRemoveParticipant={(participant) => void removeParticipant(participant)}
        topControls={AudioControls}
        controls={
          <>
            <button onClick={nextQuestion} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-brand-yellow px-5 py-3 font-black text-slate-900 disabled:cursor-not-allowed disabled:opacity-50">
              <SkipForward size={18} />
              {session.currentQuestionIndex + 1 >= questions.length ? 'Final Podium' : 'Next Question'}
            </button>
            <button onClick={() => void endGame()} disabled={busy} className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-black text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50">
              End Game
            </button>
          </>
        }
      />
    );
  }

  return (
    <div className="flex h-[calc(100dvh-4.25rem)] overflow-hidden bg-slate-950 p-3 text-white [background:radial-gradient(circle_at_top_left,rgba(14,165,233,0.28),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.16),transparent_32%),#020617] lg:p-4">
      <div className="flex h-full w-full flex-col">
        <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <button onClick={() => void exitHost()} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 font-bold hover:bg-white/15">
            <ArrowLeft size={16} />
            Games
          </button>
          {AudioControls}
          <div className="rounded-full bg-brand-yellow px-4 py-2 text-sm font-black text-slate-900">Code {session.joinCode}</div>
        </div>

        {session.status === 'lobby' ? (
          <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
            <div className="rounded-3xl bg-white p-5 text-slate-900 shadow-2xl">
              <h1 className="text-3xl font-black">{session.title}</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">{questions.length} live questions</p>
              <div className="mt-5 flex justify-center rounded-2xl border border-slate-200 p-4">
                <QRCodeCanvas value={joinUrl} size={240} includeMargin />
              </div>
              <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-center font-mono text-5xl font-black tracking-[0.2em] text-brand-yellow">{session.joinCode}</div>
              <button onClick={copyJoinLink} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-700">
                {copied ? <CheckCircle size={17} /> : <Copy size={17} />}
                {copied ? 'Copied' : 'Copy join link'}
              </button>
              <button
                onClick={() => void startGame()}
                disabled={busy || participants.length === 0 || questions.length === 0}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-yellow px-4 py-4 text-xl font-black text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play size={20} fill="currentColor" />
                Start Game
              </button>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-md">
              <div className="mb-4 flex items-center gap-2 text-xl font-black">
                <Users size={22} />
                Players Joined ({participants.length})
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 font-black text-slate-900 shadow-lg ring-2 ring-white/50">
                    <span className="min-w-0 truncate">{participant.displayName}</span>
                    <button
                      type="button"
                      onClick={() => void removeParticipant(participant)}
                      disabled={removingParticipantId === participant.id}
                      title={`Remove ${participant.displayName}`}
                      aria-label={`Remove ${participant.displayName}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <UserMinus size={17} />
                    </button>
                  </div>
                ))}
              </div>
              {participants.length === 0 && <div className="rounded-xl border border-white/10 p-8 text-center font-bold text-white/60">Waiting for players...</div>}
            </div>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-h-0 flex-col rounded-3xl bg-white p-4 text-slate-900 shadow-2xl lg:p-5">
              <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-wide text-brand-blue">
                    Question {(session.currentQuestionIndex || 0) + 1} of {questions.length}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {session.status === 'question' && (
                    <div className={`rounded-full px-4 py-2 text-sm font-black ${timeLeft <= 5 ? 'bg-red-100 text-red-700' : 'bg-brand-yellow text-slate-900'}`}>
                      {timeLeft}s
                    </div>
                  )}
                  <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${
                    roundComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {roundComplete ? (
                      <>
                        <Check size={16} />
                        Round complete
                      </>
                    ) : (
                      `${currentSubmissions.length}/${participants.length} answered`
                    )}
                  </div>
                </div>
              </div>

              {currentQuestion ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  {imageUrl && (
                    <div className="mb-3 max-h-[18vh] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      <img src={imageUrl} alt="" className="h-full max-h-[18vh] w-full object-contain" />
                    </div>
                  )}
                  {currentQuestion.category && <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">{currentQuestion.category}</div>}
                  <h1 className="shrink-0 text-[clamp(2.4rem,4.35vw,5.7rem)] font-black leading-[1.04]">{currentQuestion.question}</h1>
                  <div className="mt-4 grid min-h-0 flex-1 auto-rows-fr gap-3 sm:grid-cols-2">
                    {currentQuestion.options.map((option, index) => {
                      const isAnswer = option.trim().toLowerCase() === String(currentQuestion.answer || '').trim().toLowerCase();
                      return (
                        <div
                          key={option}
                          className={`flex min-h-0 items-start rounded-2xl border-2 p-4 text-[clamp(1.9rem,3vw,3.75rem)] font-black leading-tight shadow-sm lg:p-5 ${
                            ['reveal', 'leaderboard'].includes(session.status) && isAnswer
                              ? 'border-lime-700 bg-lime-100 text-lime-950 ring-4 ring-lime-300 shadow-xl'
                              : ['reveal', 'leaderboard'].includes(session.status)
                              ? 'border-slate-200 bg-slate-100 text-slate-500 opacity-70'
                              : ANSWER_TILE_STYLES[index % ANSWER_TILE_STYLES.length]
                          }`}
                        >
                          <span className="mr-2 opacity-70">{String.fromCharCode(65 + index)}.</span>
                          {option}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center font-black text-slate-500">No question loaded.</div>
              )}

              <div className="mt-4 flex shrink-0 flex-wrap gap-3">
                {session.status === 'question' && (
                  <button onClick={() => void lockAnswers()} disabled={busy} className="rounded-xl bg-slate-900 px-5 py-3 font-black text-white">
                    Lock Answers
                  </button>
                )}
                {['question', 'locked'].includes(session.status) && (
                  <button onClick={() => void revealAnswer()} disabled={busy} className="rounded-xl bg-brand-blue px-5 py-3 font-black text-white">
                    Reveal Answer
                  </button>
                )}
                {session.status === 'reveal' && (
                  <button
                    onClick={() => session.currentQuestionIndex + 1 >= questions.length ? void endGame() : void showLeaderboard()}
                    disabled={busy}
                    className="rounded-xl bg-brand-yellow px-5 py-3 font-black text-slate-900"
                  >
                    {session.currentQuestionIndex + 1 >= questions.length ? 'Final Podium' : 'Show Leaderboard'}
                  </button>
                )}
                {session.status === 'leaderboard' && (
                  <button onClick={nextQuestion} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-brand-yellow px-5 py-3 font-black text-slate-900">
                    <SkipForward size={18} />
                    {session.currentQuestionIndex + 1 >= questions.length ? 'Final Podium' : 'Next Question'}
                  </button>
                )}
                <button onClick={() => void endGame()} disabled={busy} className="ml-auto rounded-xl border border-slate-200 px-5 py-3 font-black text-slate-600">
                  End Game
                </button>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur-md lg:p-5">
              <div className="mb-4 flex items-center gap-2 text-xl font-black">
                <Trophy size={22} className="text-brand-yellow" />
                Leaderboard
              </div>
              <div className="space-y-2">
                {displayedRanking.map((participant, index) => (
                  <div key={participant.id} className="rounded-2xl bg-white p-3 text-slate-900 shadow-lg">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2 font-black">
                        {index === 0 ? <Crown size={17} className="shrink-0 text-amber-500" /> : <span className="w-4 shrink-0 text-sm text-slate-400">#{index + 1}</span>}
                        <span className="truncate">{participant.displayName}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="font-mono text-lg font-black">
                          <AnimatedScore value={participant.displayScore} />
                        </div>
                        <button
                          type="button"
                          onClick={() => void removeParticipant(participant)}
                          disabled={removingParticipantId === participant.id}
                          title={`Remove ${participant.displayName}`}
                          aria-label={`Remove ${participant.displayName}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <UserMinus size={15} />
                        </button>
                      </div>
                    </div>
                    {showRoundScores && participant.roundGain > 0 && (
                      <div className="mt-1 text-right text-xs font-black text-emerald-600">
                        +{participant.roundGain}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
