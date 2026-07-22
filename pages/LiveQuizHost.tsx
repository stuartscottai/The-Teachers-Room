import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle, ChevronDown, Copy, Crown, Music, Play, QrCode, SkipForward, Trophy, Users, X } from 'lucide-react';
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
import { resolveGameQuestionImageUrl } from '../utils/gameImage';
import { WinnerCeremonyHero, WinnerCeremonyRankingEntry } from '../components/games/shared/WinnerCeremonyHero';
import { LiveQuizLeaderboardStage } from '../components/games/LiveQuizLeaderboardStage';
import { LiveQuizTimerBar } from '../components/games/LiveQuizTimerBar';
import { LiveQuizAvatarIcon, LiveQuizPlayerName, parseLiveQuizDisplayName } from '../components/games/liveQuizAvatars';

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

const getCorrectCount = (submissions: LiveQuizSubmission[], participantId: string) =>
  submissions.filter((submission) => submission.participantId === participantId && submission.isCorrect).length;

const getLiveQuizOptionLabel = (value: string) => value.trim().toLowerCase();

const getSharedLiveQuizOptionFontSize = (options: string[], compact = false) => {
  const maxLength = Math.max(0, ...options.map((option) => option.trim().length));
  const size = maxLength > 115 ? 26 :
    maxLength > 95 ? 30 :
    maxLength > 78 ? 34 :
    maxLength > 62 ? 38 :
    maxLength > 48 ? 42 :
    maxLength > 34 ? 46 :
    52;
  return compact ? Math.max(22, size - 4) : size;
};

const getResponsiveLiveQuizOptionFontSize = (fontSize: number) =>
  `clamp(1.2rem, min(2.6vw, 5.1vh), ${fontSize}px)`;

const getLiveQuizHostQuestionMaxFontSize = () => {
  const width = window.innerWidth || 1024;
  const preferred = width >= 1024 ? width * 0.031 : width * 0.062;
  const min = width >= 1024 ? 32 : 26.4;
  return Math.min(69.6, Math.max(min, preferred));
};

const ANSWER_TILE_STYLES = [
  'border-red-400 bg-gradient-to-br from-red-300 via-red-500 to-red-700 text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.45),inset_0_-8px_18px_rgba(127,29,29,0.28),0_8px_0_#7f1d1d,0_14px_24px_rgba(127,29,29,0.24)] [--answer-badge:#fff1f2] [--answer-badge-text:#dc2626]',
  'border-sky-400 bg-gradient-to-br from-sky-300 via-sky-500 to-blue-700 text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.45),inset_0_-8px_18px_rgba(30,64,175,0.28),0_8px_0_#1e3a8a,0_14px_24px_rgba(30,64,175,0.24)] [--answer-badge:#eff6ff] [--answer-badge-text:#0284c7]',
  'border-amber-400 bg-gradient-to-br from-amber-200 via-amber-500 to-orange-700 text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.48),inset_0_-8px_18px_rgba(146,64,14,0.3),0_8px_0_#92400e,0_14px_24px_rgba(146,64,14,0.24)] [--answer-badge:#fffbeb] [--answer-badge-text:#d97706]',
  'border-violet-400 bg-gradient-to-br from-violet-300 via-violet-500 to-purple-800 text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.45),inset_0_-8px_18px_rgba(91,33,182,0.3),0_8px_0_#4c1d95,0_14px_24px_rgba(76,29,149,0.24)] [--answer-badge:#f5f3ff] [--answer-badge-text:#7c3aed]',
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

const LiveQuizAnswerTile: React.FC<{
  option: string;
  index: number;
  isAnswer: boolean;
  showRevealState: boolean;
  chosenParticipants: LiveQuizParticipant[];
  fontSize: number;
}> = ({ option, index, isAnswer, showRevealState, chosenParticipants, fontSize }) => {
  const showChosenParticipants = showRevealState && chosenParticipants.length > 0;

  return (
    <div
      className={`relative flex min-h-[76px] items-center overflow-hidden rounded-xl border p-3 ${showChosenParticipants ? 'pb-11 sm:pb-12' : ''} font-black transition-[transform,filter,box-shadow] lg:min-h-0 lg:p-5 ${
        showRevealState && isAnswer
          ? 'border-emerald-500 bg-gradient-to-br from-emerald-300 via-emerald-500 to-emerald-700 text-white ring-2 ring-emerald-200 shadow-[inset_0_2px_0_rgba(255,255,255,0.45),inset_0_-8px_18px_rgba(6,78,59,0.28),0_8px_0_#065f46,0_14px_24px_rgba(6,95,70,0.24)] [--answer-badge:#ecfdf5] [--answer-badge-text:#047857]'
          : showRevealState
          ? 'border-slate-200 bg-slate-50 text-slate-500 opacity-70'
          : ANSWER_TILE_STYLES[index % ANSWER_TILE_STYLES.length]
      }`}
    >
      {!showRevealState && <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent" />}
      <div
        className="relative z-10 flex w-full min-w-0 items-center leading-[1.05] drop-shadow-[0_1px_1px_rgba(0,0,0,0.28)]"
        style={{ fontSize: getResponsiveLiveQuizOptionFontSize(fontSize) }}
      >
        <span className={`mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[0.6em] font-black ${
          showRevealState && isAnswer
            ? 'bg-emerald-600 text-white'
            : showRevealState
            ? 'bg-slate-200 text-slate-500'
            : 'bg-[var(--answer-badge)] text-[var(--answer-badge-text)]'
        }`}>
          {String.fromCharCode(65 + index)}
        </span>
        <span className="min-w-0 flex-1 whitespace-normal break-words">
          {option}
        </span>
      </div>
      {showChosenParticipants && (
        <div className="absolute bottom-2 right-3 flex max-w-[52%] flex-row-reverse flex-wrap-reverse items-center gap-1.5">
          {chosenParticipants.slice(0, 10).map((participant) => {
            const player = parseLiveQuizDisplayName(participant.displayName);
            return (
              <LiveQuizAvatarIcon
                key={participant.id}
                avatarId={player.avatarId}
                className="h-7 w-7 border-2 border-white shadow-sm sm:h-8 sm:w-8"
                iconSize={16}
              />
            );
          })}
          {chosenParticipants.length > 10 && (
            <span className="rounded-full bg-slate-900/80 px-2 py-1 text-xs font-black text-white shadow-sm">
              +{chosenParticipants.length - 10}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const LiveQuizAnswerGrid: React.FC<{
  options: string[];
  answer?: string;
  status: LiveQuizSession['status'];
  participantsByOption: Record<string, LiveQuizParticipant[]>;
}> = ({ options, answer, status, participantsByOption }) => {
  const showRevealState = ['reveal', 'leaderboard'].includes(status);
  const sharedFontSize = getSharedLiveQuizOptionFontSize(options, showRevealState);

  return (
    <div className="mt-4 grid min-h-0 flex-[3] auto-rows-fr gap-4 sm:grid-cols-2">
      {options.map((option, index) => {
        const optionKey = getLiveQuizOptionLabel(option);
        const isAnswer = optionKey === getLiveQuizOptionLabel(String(answer || ''));
        return (
          <LiveQuizAnswerTile
            key={`${index}-${option}`}
            option={option}
            index={index}
            isAnswer={isAnswer}
            showRevealState={showRevealState}
            chosenParticipants={participantsByOption[optionKey] || []}
            fontSize={sharedFontSize}
          />
        );
      })}
    </div>
  );
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
  const [lobbyTrack, setLobbyTrack] = useState<LobbyTrackId>('chill');
  const [showJoinQr, setShowJoinQr] = useState(false);
  const [resizeTick, setResizeTick] = useState(0);
  const [lobbyQrSize, setLobbyQrSize] = useState(1);
  const lobbyQrContainerRef = useRef<HTMLDivElement>(null);
  const questionPanelRef = useRef<HTMLDivElement>(null);
  const questionCategoryRef = useRef<HTMLDivElement>(null);
  const questionTextRef = useRef<HTMLHeadingElement>(null);
  const [questionFontSize, setQuestionFontSize] = useState<number | null>(null);

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
    () => [...participants].sort((a, b) => b.score - a.score || parseLiveQuizDisplayName(a.displayName).name.localeCompare(parseLiveQuizDisplayName(b.displayName).name)),
    [participants]
  );
  const currentSubmissions = useMemo(
    () => submissions.filter((submission) => submission.questionIndex === (session?.currentQuestionIndex || 0)),
    [session?.currentQuestionIndex, submissions]
  );
  const answeredParticipantIds = useMemo(
    () => new Set(currentSubmissions.map((submission) => submission.participantId)),
    [currentSubmissions]
  );
  const answeredCount = answeredParticipantIds.size;
  const allPlayersAnswered = participants.length > 0 && answeredCount >= participants.length;
  const hasCrowdedLobby = participants.length > 8;
  const hasDenseLobby = participants.length > 12;
  const participantsByOption = useMemo(() => {
    const byId = new Map(participants.map((participant) => [participant.id, participant]));
    return currentSubmissions.reduce<Record<string, LiveQuizParticipant[]>>((acc, submission) => {
      const participant = byId.get(submission.participantId);
      if (!participant) return acc;
      const key = getLiveQuizOptionLabel(submission.answer);
      acc[key] = [...(acc[key] || []), participant];
      return acc;
    }, {});
  }, [currentSubmissions, participants]);
  const imageUrl = resolveGameQuestionImageUrl(currentQuestion?.image);

  useLayoutEffect(() => {
    const panel = questionPanelRef.current;
    if (!panel || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setResizeTick((value) => value + 1));
    observer.observe(panel);
    return () => observer.disconnect();
  }, [currentQuestion]);

  useLayoutEffect(() => {
    const container = lobbyQrContainerRef.current;
    if (!container || session?.status !== 'lobby') return;

    const updateQrSize = () => {
      const styles = window.getComputedStyle(container);
      const horizontalPadding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const verticalPadding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
      const availableWidth = container.clientWidth - horizontalPadding;
      const availableHeight = container.clientHeight - verticalPadding;
      const maxSize = isMobileViewport ? 210 : 330;
      setLobbyQrSize(Math.max(1, Math.floor(Math.min(maxSize, availableWidth, availableHeight))));
    };

    updateQrSize();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateQrSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [isMobileViewport, session?.status]);

  useLayoutEffect(() => {
    if (!currentQuestion) {
      setQuestionFontSize(null);
      return;
    }

    const panel = questionPanelRef.current;
    const textEl = questionTextRef.current;
    if (!panel || !textEl) return;

    const categoryHeight = questionCategoryRef.current?.offsetHeight || 0;
    const availableHeight = Math.max(0, panel.clientHeight - categoryHeight - (categoryHeight ? 8 : 0));
    const availableWidth = textEl.clientWidth;
    if (availableHeight <= 0 || availableWidth <= 0) return;

    let size = getLiveQuizHostQuestionMaxFontSize();
    const minSize = imageUrl ? 22 : 26;
    textEl.style.fontSize = `${size}px`;
    textEl.style.lineHeight = '1.08';

    while ((textEl.scrollHeight > availableHeight || textEl.scrollWidth > availableWidth) && size > minSize) {
      size -= 2;
      textEl.style.fontSize = `${size}px`;
    }

    setQuestionFontSize(size);
  }, [currentQuestion?.question, currentQuestion?.category, currentQuestion?.questionIndex, imageUrl, resizeTick]);

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
      .sort((a, b) => b.displayScore - a.displayScore || parseLiveQuizDisplayName(a.displayName).name.localeCompare(parseLiveQuizDisplayName(b.displayName).name));
  }, [participants, session?.currentQuestionIndex, showRoundScores, submissions]);
  const elapsedMs = session?.questionStartedAt ? Math.max(0, nowMs - new Date(session.questionStartedAt).getTime()) : 0;
  const timeLeft = session?.status === 'question'
    ? Math.max(0, Math.ceil((((session.timerSeconds || 20) * 1000) - elapsedMs) / 1000))
    : 0;
  const roundComplete = Boolean(session && ['locked', 'reveal', 'leaderboard'].includes(session.status));
  const canRevealAnswer = Boolean(session && (session.status === 'locked' || (session.status === 'question' && (allPlayersAnswered || timeLeft <= 0))));
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || busy || !session) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.closest('input, textarea, select, button') || target.isContentEditable)) return;

      if (['question', 'locked'].includes(session.status)) {
        if (!canRevealAnswer) return;
        event.preventDefault();
        void revealAnswer();
        return;
      }

      if (session.status === 'reveal') {
        event.preventDefault();
        session.currentQuestionIndex + 1 >= questions.length ? void endGame() : void showLeaderboard();
        return;
      }

      if (session.status === 'leaderboard') {
        event.preventDefault();
        nextQuestion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, canRevealAnswer, questions.length, session]);

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
    const confirmed = window.confirm(`Remove ${parseLiveQuizDisplayName(participant.displayName).name} from this live quiz? Their answers and score will be removed.`);
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
    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        onClick={() => setMusicEnabled((value) => !value)}
        className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs font-black sm:gap-2 sm:px-3 sm:text-sm ${musicEnabled ? 'bg-sky-100 text-sky-800' : 'bg-white/10 text-white'}`}
        title="Turn live quiz music on or off"
      >
        <Music size={15} />
        Music {musicEnabled ? 'On' : 'Off'}
      </button>
      {(session?.status === 'lobby' || session?.status === 'leaderboard') && (
        <div className="relative min-w-0">
          <select
            value={lobbyTrack}
            onChange={(event) => setLobbyTrack(event.target.value as LobbyTrackId)}
            className="h-10 w-[96px] appearance-none rounded-xl border border-white/20 bg-white px-3 pr-8 text-xs font-black text-slate-900 [-moz-appearance:none] [-webkit-appearance:none] sm:w-[150px] sm:px-4 sm:pr-12 sm:text-sm"
            aria-label="Lobby music"
            style={{ backgroundImage: 'none' }}
          >
            {LOBBY_TRACKS.map((track) => (
              <option key={track.id} value={track.id}>{track.label}</option>
            ))}
          </select>
          <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>
      )}
    </div>
  );

  const HostTopControls = (
    <div className="ml-auto flex min-w-0 items-center justify-end gap-1.5 sm:gap-3">
      {AudioControls}
      <button
        type="button"
        onClick={() => setShowJoinQr(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-yellow px-3 py-2 text-xs font-black text-slate-900 shadow-sm hover:bg-yellow-300 sm:px-4 sm:text-sm"
        title="Show join QR code"
      >
        <QrCode size={15} />
        Code {session?.joinCode}
      </button>
    </div>
  );

  const JoinQrModal = showJoinQr && session ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="relative z-[10000] max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 text-slate-950 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-yellow px-3 py-1 text-xs font-black uppercase text-slate-900">
              <QrCode size={14} />
              Join live quiz
            </div>
            <h2 className="mt-3 text-2xl font-black">{session.title}</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowJoinQr(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
            aria-label="Close QR code"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
          <QRCodeCanvas value={joinUrl} size={300} includeMargin className="h-auto max-w-full" />
        </div>
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
          <div className="flex min-w-0 items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-center font-mono text-4xl font-black tracking-[0.22em] text-brand-yellow">
            {session.joinCode}
          </div>
          <button
            type="button"
            onClick={copyJoinLink}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-700 hover:bg-slate-50"
          >
            {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

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
    const finalRanking: WinnerCeremonyRankingEntry[] = ranking.map((participant, index) => {
      const parsedName = parseLiveQuizDisplayName(participant.displayName);
      return {
        index,
        score: participant.score,
        name: parsedName.name,
        id: participant.id,
        avatarId: parsedName.avatarId,
      };
    });
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
                    <div className="flex min-w-0 items-center gap-3">
                      {entry.avatarId && <LiveQuizAvatarIcon avatarId={entry.avatarId} className="h-12 w-12 sm:h-14 sm:w-14" iconSize={24} />}
                      <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
                        <div className="truncate font-display text-3xl font-black sm:text-4xl">{entry.name}</div>
                        <div className={`shrink-0 text-sm font-black uppercase tracking-wide sm:text-base ${rank <= 3 ? 'text-slate-700' : 'text-cyan-200'}`}>
                          {getCorrectCount(submissions, entry.id || '')}/{questions.length} correct
                        </div>
                      </div>
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
        totalQuestions={questions.length}
        title="Leaderboard"
        subtitle={`Question ${session.currentQuestionIndex + 1} results`}
        removingParticipantId={removingParticipantId}
        onRemoveParticipant={(participant) => void removeParticipant(participant)}
        preferSingleLineRows
        topControls={HostTopControls}
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
    <div className="flex min-h-[calc(100dvh-4.25rem)] overflow-y-auto bg-slate-950 p-3 text-white [background:radial-gradient(circle_at_12%_8%,rgba(14,165,233,0.2),transparent_34%),radial-gradient(circle_at_88%_88%,rgba(250,204,21,0.1),transparent_30%),linear-gradient(135deg,#071525_0%,#020617_55%,#0b1220_100%)] sm:p-4 lg:h-[calc(100dvh-4.25rem)] lg:overflow-hidden lg:p-5 lg:pb-7 lg:pl-7">
      {JoinQrModal}
      <div className="flex min-h-0 w-full flex-col lg:h-full">
        <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <button onClick={() => void exitHost()} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 font-bold hover:bg-white/15">
            <ArrowLeft size={16} />
            Games
          </button>
          {HostTopControls}
        </div>

        {session.status === 'lobby' ? (
          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2 lg:gap-5">
            <div className="flex min-h-0 flex-col rounded-3xl bg-white p-4 text-slate-900 shadow-2xl lg:p-5">
              <h1 className="text-[clamp(1.35rem,2vw,2.25rem)] font-black leading-tight">{session.title}</h1>
              <p className="mt-1 text-base font-bold text-slate-500">{questions.length} live questions</p>
              <div ref={lobbyQrContainerRef} className="mt-4 flex min-h-[230px] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 p-3 lg:min-h-0">
                <QRCodeCanvas
                  value={joinUrl}
                  size={lobbyQrSize}
                  includeMargin
                  className="h-auto max-h-full w-auto max-w-full shrink"
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="flex min-w-0 items-center justify-center rounded-2xl bg-slate-950 p-3 text-center font-mono text-[clamp(2rem,3.3vw,3.2rem)] font-black tracking-[0.2em] text-brand-yellow">{session.joinCode}</div>
                <button onClick={copyJoinLink} className="flex min-w-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xl font-black text-slate-700">
                  {copied ? <CheckCircle size={17} /> : <Copy size={17} />}
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
              <button
                onClick={() => void startGame()}
                disabled={busy || participants.length === 0 || questions.length === 0}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-yellow px-4 py-3 text-xl font-black text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play size={20} fill="currentColor" />
                Start Game
              </button>
            </div>
            <div className={`flex min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur-md ${hasCrowdedLobby ? 'sm:p-4' : 'sm:p-6'}`}>
              <div className={`flex shrink-0 items-center gap-3 font-black ${hasCrowdedLobby ? 'mb-3 text-2xl' : 'mb-5 text-2xl sm:text-3xl'}`}>
                <Users size={30} />
                Players Joined ({participants.length})
              </div>
              <div className={`grid min-h-0 flex-1 content-start overflow-y-auto overscroll-contain pr-1 ${
                hasDenseLobby
                  ? 'grid-cols-2 gap-2 lg:grid-cols-3'
                  : hasCrowdedLobby
                    ? 'grid-cols-2 gap-3'
                    : 'gap-4 md:grid-cols-2'
              }`}>
                {participants.map((participant) => {
                  const player = parseLiveQuizDisplayName(participant.displayName);

                  return (
                    <div
                      key={participant.id}
                      className={`min-w-0 rounded-2xl bg-white font-black text-slate-900 shadow-lg ring-2 ring-white/50 ${
                        hasDenseLobby ? 'p-2.5 text-lg' : hasCrowdedLobby ? 'p-3 text-2xl' : 'p-5 text-3xl'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => void removeParticipant(participant)}
                        disabled={removingParticipantId === participant.id}
                        title={`Remove ${player.name}`}
                        aria-label={`Remove ${player.name}`}
                        className={`group flex w-full min-w-0 items-center text-left disabled:cursor-not-allowed disabled:opacity-50 ${hasDenseLobby ? 'gap-2' : 'gap-3'}`}
                      >
                        {player.avatarId && (
                          <LiveQuizAvatarIcon
                            avatarId={player.avatarId}
                            className={`${hasDenseLobby ? 'h-9 w-9' : hasCrowdedLobby ? 'h-10 w-10' : 'h-12 w-12'} shrink-0`}
                            iconSize={hasDenseLobby ? 19 : hasCrowdedLobby ? 21 : 24}
                          />
                        )}
                        <span className="min-w-0 break-words leading-tight [overflow-wrap:anywhere] group-hover:line-through">{player.name}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
              {participants.length === 0 && <div className="rounded-xl border border-white/10 p-8 text-center font-bold text-white/60">Waiting for players...</div>}
            </div>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 p-3 text-slate-950 shadow-[0_18px_45px_rgba(2,6,23,0.26)] sm:p-4 lg:p-5">
              <LiveQuizTimerBar
                active={session.status === 'question'}
                timeLeft={timeLeft}
                timerSeconds={session.timerSeconds || 20}
                elapsedMs={elapsedMs}
                className="-mx-3 -mt-3 mb-3 sm:-mx-4 sm:-mt-4 lg:-mx-5 lg:-mt-5"
              />
              <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-wide text-brand-blue">
                    Question {(session.currentQuestionIndex || 0) + 1} of {questions.length}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${
                    roundComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {roundComplete ? (
                      <>
                        <Check size={16} />
                        Round complete
                      </>
                    ) : (
                      `${answeredCount}/${participants.length} answered`
                    )}
                  </div>
                </div>
              </div>

              {currentQuestion ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className={`flex min-h-0 flex-[2] rounded-2xl border-2 border-slate-900/85 bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_6px_18px_rgba(2,6,23,0.1)] ${imageUrl ? 'gap-4' : ''}`}>
                    {imageUrl && (
                      <div className="w-[34%] min-w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        <img src={imageUrl} alt="" className="h-full w-full object-contain" />
                      </div>
                    )}
                    <div ref={questionPanelRef} className="flex min-w-0 flex-1 flex-col justify-center">
                      {currentQuestion.category && <div ref={questionCategoryRef} className="mb-2 text-xs font-black uppercase tracking-wide text-brand-blue">{currentQuestion.category}</div>}
                      <h1
                        ref={questionTextRef}
                        style={questionFontSize ? { fontSize: `${questionFontSize}px`, lineHeight: '1.08' } : undefined}
                        className={`max-h-full w-full shrink-0 overflow-hidden whitespace-pre-wrap break-normal font-black leading-[1.08] tracking-normal text-slate-950 ${questionFontSize ? '' : 'text-[clamp(1.65rem,6.2vw,4.35rem)] lg:text-[clamp(2rem,3.1vw,4.35rem)]'}`}
                      >
                        {currentQuestion.question}
                      </h1>
                    </div>
                  </div>
                  <LiveQuizAnswerGrid
                    options={currentQuestion.options}
                    answer={currentQuestion.answer}
                    status={session.status}
                    participantsByOption={participantsByOption}
                  />
                </div>
              ) : (
                <div className="p-8 text-center font-black text-slate-500">No question loaded.</div>
              )}

              <div className="mt-4 flex shrink-0 flex-wrap gap-2 sm:gap-3">
                {session.status === 'question' && (
                  <button onClick={() => void lockAnswers()} disabled={busy} className="rounded-xl bg-slate-900 px-5 py-3 font-black text-white">
                    Lock Answers
                  </button>
                )}
                {['question', 'locked'].includes(session.status) && (
                  <button onClick={() => void revealAnswer()} disabled={busy || !canRevealAnswer} className="rounded-xl bg-brand-blue px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-45" title={canRevealAnswer ? 'Reveal answer' : 'Wait for every player to answer, for the timer to finish, or lock answers first'}>
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
                <button onClick={() => void endGame()} disabled={busy} className="rounded-xl border border-slate-200 px-5 py-3 font-black text-slate-600 sm:ml-auto">
                  End Game
                </button>
              </div>
            </div>

            <div className="relative min-h-0 overflow-hidden rounded-2xl border border-cyan-200/15 bg-slate-800 p-4 text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.08),inset_0_-18px_36px_rgba(2,6,23,0.26),0_18px_0_rgba(2,6,23,0.36),0_30px_50px_rgba(2,6,23,0.45)] backdrop-blur-md lg:overflow-y-auto lg:p-5">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/10 to-transparent" />
              <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-yellow-200/40 bg-gradient-to-br from-yellow-200 via-yellow-400 to-amber-600 text-slate-950 shadow-[inset_0_2px_0_rgba(255,255,255,0.55),0_5px_0_#92400e,0_12px_20px_rgba(146,64,14,0.26)]">
                    <Trophy size={24} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xl font-black leading-tight">Leaderboard</div>
                    <div className="text-xs font-black uppercase tracking-wide text-cyan-100/70">Live standings</div>
                  </div>
                </div>
                <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black text-white/75">
                  {participants.length} players
                </div>
              </div>
              <div className="relative z-10 space-y-3">
                {displayedRanking.map((participant, index) => {
                  const player = parseLiveQuizDisplayName(participant.displayName);
                  const hasSubmittedCurrentAnswer = answeredParticipantIds.has(participant.id);
                  const isLeader = index === 0;
                  const isSecond = index === 1;
                  const isThird = index === 2;
                  const rankCardClass = isLeader
                    ? 'border-yellow-200 bg-yellow-500/90 shadow-[inset_0_2px_0_rgba(255,255,255,0.28),0_7px_0_rgba(202,138,4,0.9),0_15px_26px_rgba(2,6,23,0.28)]'
                    : isSecond
                    ? 'border-slate-100/85 bg-slate-400/45 shadow-[inset_0_2px_0_rgba(255,255,255,0.24),0_6px_0_rgba(148,163,184,0.55),0_14px_24px_rgba(2,6,23,0.26)]'
                    : isThird
                    ? 'border-orange-300/65 bg-orange-950/35 shadow-[inset_0_2px_0_rgba(255,255,255,0.1),0_6px_0_rgba(120,53,15,0.72),0_14px_24px_rgba(2,6,23,0.26)]'
                    : 'border-white/12 bg-white/[0.075] shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_6px_0_rgba(2,6,23,0.34),0_14px_24px_rgba(2,6,23,0.24)]';
                  const rankBadgeClass = isLeader
                    ? 'bg-yellow-300 text-slate-950 shadow-[inset_0_2px_0_rgba(255,255,255,0.5),0_3px_0_#92400e]'
                    : isSecond
                    ? 'bg-slate-200 text-slate-950 shadow-[inset_0_2px_0_rgba(255,255,255,0.55),0_3px_0_#475569]'
                    : isThird
                    ? 'bg-orange-300 text-slate-950 shadow-[inset_0_2px_0_rgba(255,255,255,0.45),0_3px_0_#9a3412]'
                    : 'bg-white/8 text-white/55';
                  const scoreClass = isLeader ? 'text-yellow-100' : isSecond ? 'text-slate-100' : isThird ? 'text-orange-200' : 'text-white';

                  return (
                    <div
                      key={participant.id}
                      className={`relative overflow-hidden rounded-xl border p-3 text-white transition ${rankCardClass}`}
                    >
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => void removeParticipant(participant)}
                          disabled={removingParticipantId === participant.id}
                          title={`Remove ${player.name}`}
                          aria-label={`Remove ${player.name}`}
                          className="group relative z-10 flex min-w-0 items-center gap-3 text-left text-xl font-black disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-black ${rankBadgeClass}`}>
                            {isLeader ? (
                              <Crown size={23} />
                            ) : (
                              `#${index + 1}`
                            )}
                          </span>
                          {player.avatarId && <LiveQuizAvatarIcon avatarId={player.avatarId} className="h-11 w-11 shrink-0" iconSize={23} />}
                          <span className="min-w-0 truncate group-hover:line-through">{player.name}</span>
                          {session.status === 'question' && (
                            <span
                              className={`ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs transition ${
                                hasSubmittedCurrentAnswer
                                  ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                                  : 'border-white/20 bg-white/10 text-white/35'
                              }`}
                              title={hasSubmittedCurrentAnswer ? `${player.name} has answered` : `${player.name} has not answered yet`}
                              aria-label={hasSubmittedCurrentAnswer ? `${player.name} has answered` : `${player.name} has not answered yet`}
                            >
                              {hasSubmittedCurrentAnswer ? <Check size={16} /> : ''}
                            </span>
                          )}
                        </button>
                        <div className="relative z-10 flex shrink-0 items-center gap-2">
                          <div className={`font-mono text-3xl font-black leading-none drop-shadow-[0_2px_0_rgba(2,6,23,0.45)] ${scoreClass}`}>
                            <AnimatedScore value={participant.displayScore} />
                          </div>
                        </div>
                      </div>
                      {showRoundScores && participant.roundGain > 0 && (
                        <div className="relative z-10 mt-2 text-right text-sm font-black text-emerald-300">
                          +{participant.roundGain} scored this round
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
