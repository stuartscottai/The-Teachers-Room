import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, CheckCircle2, Clock, Crown, Home, Pencil, Trophy, WifiOff, XCircle } from 'lucide-react';
import {
  getCurrentStudentQuestion,
  getLiveQuizParticipants,
  getLiveQuizSession,
  getLiveQuizSubmissions,
  rememberLiveQuizParticipant,
  submitLiveQuizAnswer,
  updateLiveQuizParticipantDisplayName,
} from '../utils/liveQuizUtils';
import { LiveQuizParticipant, LiveQuizSession, LiveQuizSubmission, StudentSafeLiveQuizQuestion } from '../types';
import { resolveGameImageUrl } from '../utils/gameImage';
import { LiveQuizLeaderboardStage } from '../components/games/LiveQuizLeaderboardStage';
import { LiveQuizTimerBar } from '../components/games/LiveQuizTimerBar';
import { playSound } from '../utils/gameUtils';
import { LIVE_QUIZ_AVATAR_OPTIONS, LiveQuizAvatarIcon, LiveQuizPlayerName, makeLiveQuizDisplayName, parseLiveQuizDisplayName } from '../components/games/liveQuizAvatars';

const normalizeAnswer = (value?: string | null) => String(value || '').trim().toLowerCase();

const getLiveQuizOptionTextClass = (option: string) => {
  const length = option.trim().length;
  if (length > 115) return 'text-[clamp(1rem,2.65vw,1.65rem)]';
  if (length > 80) return 'text-[clamp(1.1rem,3.15vw,1.95rem)]';
  if (length > 48) return 'text-[clamp(1.25rem,3.9vw,2.35rem)]';
  return 'text-[clamp(1.75rem,6.2vw,3.25rem)]';
};

const ANSWER_TILE_STYLES = [
  'border-red-300 bg-red-50 text-red-900',
  'border-sky-300 bg-sky-50 text-sky-900',
  'border-amber-300 bg-amber-50 text-amber-900',
  'border-violet-300 bg-violet-50 text-violet-900',
];

const HOST_DISCONNECTED_AFTER_MS = 20000;
const LIVE_QUIZ_TWO_LINE_OPTION_LENGTH = 30;

const splitLiveQuizOptionText = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.length < LIVE_QUIZ_TWO_LINE_OPTION_LENGTH) return [trimmed];
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 2) return [trimmed];

  const target = trimmed.length / 2;
  let bestIndex = 1;
  let bestDistance = Number.POSITIVE_INFINITY;
  let runningLength = 0;
  for (let index = 1; index < words.length; index += 1) {
    runningLength += words[index - 1].length + (index > 1 ? 1 : 0);
    const distance = Math.abs(runningLength - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return [
    words.slice(0, bestIndex).join(' '),
    words.slice(bestIndex).join(' '),
  ];
};

const getSharedLiveQuizOptionFontSize = (options: string[], compact = false) => {
  const maxLength = Math.max(0, ...options.map((option) => option.trim().length));
  const size = maxLength > 95 ? 24 :
    maxLength > 78 ? 28 :
    maxLength > 62 ? 32 :
    maxLength > 48 ? 36 :
    maxLength > 34 ? 40 :
    maxLength >= LIVE_QUIZ_TWO_LINE_OPTION_LENGTH ? 44 :
    50;
  return compact ? Math.max(22, size - 4) : size;
};

const useIsLargeLiveQuizScreen = () => {
  const [isLarge, setIsLarge] = useState(false);
  useEffect(() => {
    const update = () => setIsLarge(window.innerWidth >= 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return isLarge;
};

interface StudentAnswerOptionMeta {
  option: string;
  index: number;
  isSelected: boolean;
  isCorrectAnswer: boolean;
  isWrongSelection: boolean;
  optionClass: string;
}

const LiveQuizStudentAnswerButton: React.FC<{
  meta: StudentAnswerOptionMeta;
  questionIndex: number;
  canAnswer: boolean;
  revealVisible: boolean;
  isLargeScreen: boolean;
  sharedFontSize: number;
  onAnswer: (answer: string) => void;
}> = ({ meta, questionIndex, canAnswer, revealVisible, isLargeScreen, sharedFontSize, onAnswer }) => {
  const optionLines = splitLiveQuizOptionText(meta.option);

  return (
    <button
      key={`${questionIndex}-${meta.option}`}
      type="button"
      disabled={!canAnswer}
      onClick={() => onAnswer(meta.option)}
      className={`relative flex min-h-[70px] items-center overflow-hidden rounded-2xl border-2 p-4 pr-12 text-left ${isLargeScreen ? '' : getLiveQuizOptionTextClass(meta.option)} font-black leading-tight shadow-sm transition hover:scale-[1.01] hover:border-brand-blue disabled:cursor-not-allowed md:min-h-0 ${meta.optionClass} ${!revealVisible && !canAnswer && !meta.isSelected && !meta.isCorrectAnswer ? 'opacity-60' : ''}`}
    >
      <div
        className="flex w-full min-w-0 items-center leading-[1.05]"
        style={isLargeScreen ? { fontSize: `${sharedFontSize}px` } : undefined}
      >
        <span className={`mr-2 shrink-0 ${meta.isCorrectAnswer ? 'text-lime-800' : meta.isWrongSelection ? 'text-red-600' : revealVisible ? 'text-slate-400' : 'text-brand-blue'}`}>
          {String.fromCharCode(65 + meta.index)}.
        </span>
        <span
          className={isLargeScreen ? 'min-w-0 flex-1 overflow-hidden break-words' : 'min-w-0 break-words'}
        >
          {isLargeScreen ? optionLines.map((line, lineIndex) => (
            <span key={`${lineIndex}-${line}`} className="block">
              {line}
            </span>
          )) : meta.option}
        </span>
      </div>
      {meta.isCorrectAnswer && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-lime-800" size={26} />}
      {meta.isWrongSelection && <XCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-red-700" size={26} />}
      {meta.isSelected && !revealVisible && <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-950" size={24} />}
    </button>
  );
};

const LiveQuizStudentAnswerGrid: React.FC<{
  options: string[];
  questionIndex: number;
  effectiveSelectedAnswer: string;
  revealedAnswer?: string | null;
  revealVisible: boolean;
  canAnswer: boolean;
  isLargeScreen: boolean;
  onAnswer: (answer: string) => void;
}> = ({ options, questionIndex, effectiveSelectedAnswer, revealedAnswer, revealVisible, canAnswer, isLargeScreen, onAnswer }) => {
  const sharedFontSize = getSharedLiveQuizOptionFontSize(options, revealVisible);

  return (
    <div className="mt-3 grid min-h-0 flex-[1.15] auto-rows-fr gap-3 sm:grid-cols-2">
      {options.map((option, index) => {
        const isSelected = normalizeAnswer(effectiveSelectedAnswer) === normalizeAnswer(option);
        const isCorrectAnswer = revealVisible && normalizeAnswer(revealedAnswer) === normalizeAnswer(option);
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
          <LiveQuizStudentAnswerButton
            key={`${questionIndex}-${option}`}
            meta={{ option, index, isSelected, isCorrectAnswer, isWrongSelection, optionClass }}
            questionIndex={questionIndex}
            canAnswer={canAnswer}
            revealVisible={revealVisible}
            isLargeScreen={isLargeScreen}
            sharedFontSize={sharedFontSize}
            onAnswer={onAnswer}
          />
        );
      })}
    </div>
  );
};

const StudentExitScreen: React.FC<{ icon: React.ReactNode; title: string; message: string }> = ({ icon, title, message }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-7 text-center text-slate-900 shadow-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          {icon}
        </div>
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">{message}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-yellow px-5 py-3 font-black text-slate-900 hover:bg-yellow-300"
        >
          <Home size={18} />
          Go to homepage
        </button>
      </div>
    </div>
  );
};

export const LiveQuizStudent: React.FC = () => {
  const { sessionId = '', participantId = '' } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<LiveQuizSession | null>(null);
  const [question, setQuestion] = useState<StudentSafeLiveQuizQuestion | null>(null);
  const [participants, setParticipants] = useState<LiveQuizParticipant[]>([]);
  const [submissions, setSubmissions] = useState<LiveQuizSubmission[]>([]);
  const [submittedQuestion, setSubmittedQuestion] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [nowMs, setNowMs] = useState(Date.now());
  const [hasLoadedSnapshot, setHasLoadedSnapshot] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const playedRevealSoundRef = useRef<string>('');
  const isLargeAnswerScreen = useIsLargeLiveQuizScreen();

  useEffect(() => {
    if (sessionId && participantId) rememberLiveQuizParticipant(sessionId, participantId);
  }, [participantId, sessionId]);

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
      setHasLoadedSnapshot(true);
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
    () => [...participants].sort((a, b) => b.score - a.score || parseLiveQuizDisplayName(a.displayName).name.localeCompare(parseLiveQuizDisplayName(b.displayName).name)),
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
  const didSubmitAnswer = Boolean(ownSubmission);
  const imageUrl = resolveGameImageUrl(question?.image?.url, question?.image?.thumbUrl);
  const elapsedMs = session?.questionStartedAt ? Math.max(0, nowMs - new Date(session.questionStartedAt).getTime()) : 0;
  const timeLeft = session?.status === 'question'
    ? Math.max(0, Math.ceil(((session.timerSeconds * 1000) - elapsedMs) / 1000))
    : 0;
  const canAnswer = session?.status === 'question' && timeLeft > 0 && question && !hasSubmitted && !submitting;
  const hostLastSeenAtMs = session?.hostLastSeenAt ? new Date(session.hostLastSeenAt).getTime() : Date.now();
  const hostDisconnected = Boolean(
    session &&
    session.status !== 'ended' &&
    Number.isFinite(hostLastSeenAtMs) &&
    nowMs - hostLastSeenAtMs > HOST_DISCONNECTED_AFTER_MS
  );

  useEffect(() => {
    if (!me || showAvatarPicker) return;
    const parsed = parseLiveQuizDisplayName(me.displayName);
    setSelectedAvatar(parsed.avatarId || LIVE_QUIZ_AVATAR_OPTIONS[0]?.id || '');
    setAvatarError('');
  }, [me, showAvatarPicker]);

  useEffect(() => {
    if (!session || !question || !revealVisible) return;
    const key = `${session.id}-${question.questionIndex}`;
    if (playedRevealSoundRef.current === key) return;
    playedRevealSoundRef.current = key;
    playSound(isOwnAnswerCorrect ? 'correct' : 'incorrect', false, isOwnAnswerCorrect ? 'LevelUp' : 'WompWomp');
  }, [isOwnAnswerCorrect, question, revealVisible, session]);

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

  const handleSaveAvatar = async (avatarId = selectedAvatar) => {
    if (!me || !avatarId) return;
    const parsed = parseLiveQuizDisplayName(me.displayName);
    setAvatarSaving(true);
    setAvatarError('');
    const result = await updateLiveQuizParticipantDisplayName(
      sessionId,
      participantId,
      makeLiveQuizDisplayName(avatarId, parsed.name || 'Player')
    );
    setAvatarSaving(false);
    if (!result.success || !result.participant) {
      setAvatarError(result.error || 'Could not update your avatar.');
      return;
    }
    setParticipants((current) => current.map((participant) => (participant.id === result.participant?.id ? result.participant : participant)));
    setShowAvatarPicker(false);
  };

  if (!session && hasLoadedSnapshot) {
    return (
      <StudentExitScreen
        icon={<WifiOff size={24} />}
        title="Live quiz unavailable"
        message="The live quiz is no longer available. Your teacher may have closed the session."
      />
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-yellow border-t-transparent" />
      </div>
    );
  }

  if (hostDisconnected) {
    return (
      <StudentExitScreen
        icon={<WifiOff size={24} />}
        title="Teacher disconnected"
        message="The host screen is no longer connected, so this live quiz has paused or ended."
      />
    );
  }

  if (hasLoadedSnapshot && !me) {
    return (
      <StudentExitScreen
        icon={<XCircle size={24} />}
        title="You have been removed"
        message="Ask your teacher for the join code if you need to rejoin."
      />
    );
  }

  if (session.status === 'lobby') {
    const parsedMe = me ? parseLiveQuizDisplayName(me.displayName) : null;
    return (
      <div className="flex min-h-screen items-start justify-center bg-slate-950 px-4 py-6 text-white sm:items-center">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-yellow text-slate-900">
            <Clock size={28} />
          </div>
          <h1 className="text-3xl font-black">You are in</h1>
          <p className="mt-2 text-lg font-bold text-white/70">Waiting for the teacher to start...</p>
          {me && (
            <div className="mt-6 flex items-center justify-center gap-4 rounded-xl bg-white/10 p-5 font-black">
              <button
                type="button"
                onClick={() => {
                  setShowAvatarPicker((value) => !value);
                  setSelectedAvatar(parsedMe?.avatarId || LIVE_QUIZ_AVATAR_OPTIONS[0]?.id || '');
                  setAvatarError('');
                }}
                className="group relative shrink-0 rounded-full outline-none focus-visible:ring-4 focus-visible:ring-brand-yellow/70"
                aria-label="Change avatar"
              >
                <LiveQuizAvatarIcon avatarId={parsedMe?.avatarId} className="h-16 w-16" iconSize={28} />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/55 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Pencil size={24} className="text-white" />
                </span>
              </button>
              <div className="min-w-0 truncate text-left text-3xl font-black sm:text-4xl">
                {parsedMe?.name || 'Player'}
              </div>
            </div>
          )}
          {me && showAvatarPicker && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white p-4 text-slate-900 shadow-2xl">
              <div className="mb-3 text-left text-sm font-black text-slate-700">{avatarSaving ? 'Saving avatar...' : 'Choose a new avatar'}</div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {LIVE_QUIZ_AVATAR_OPTIONS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(avatar.id);
                      void handleSaveAvatar(avatar.id);
                    }}
                    disabled={avatarSaving}
                    className={`flex aspect-square items-center justify-center rounded-xl border transition ${
                      selectedAvatar === avatar.id
                        ? 'border-brand-yellow bg-yellow-50 ring-2 ring-brand-yellow'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    } disabled:cursor-not-allowed disabled:opacity-70`}
                    aria-label="Choose avatar"
                  >
                    <LiveQuizAvatarIcon avatarId={avatar.id} className="h-11 w-11" iconSize={23} />
                  </button>
                ))}
              </div>
              {avatarError && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{avatarError}</div>}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (session.status === 'ended') {
    const myRank = ranking.findIndex((participant) => participant.id === participantId) + 1;
    const winner = ranking[0];
    const confettiPieces = Array.from({ length: 44 }, (_, index) => ({
      id: index,
      left: `${(index * 23) % 100}%`,
      delay: `${(index % 11) * 0.18}s`,
      duration: `${3.6 + (index % 6) * 0.28}s`,
      color: ['#facc15', '#22d3ee', '#fb7185', '#34d399', '#fb923c'][index % 5],
      width: index % 3 === 0 ? 8 : 5,
      height: index % 2 === 0 ? 16 : 10,
    }));
    return (
      <div className="relative min-h-screen overflow-hidden bg-slate-950 p-4 text-white [background:radial-gradient(circle_at_top_left,rgba(14,165,233,0.3),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.2),transparent_34%),#020617]">
        <style>{`
          @keyframes live-quiz-final-confetti {
            0% { transform: translate3d(0, -18vh, 0) rotate(0deg); opacity: 0; }
            12% { opacity: 1; }
            100% { transform: translate3d(24px, 118vh, 0) rotate(540deg); opacity: 0.85; }
          }
          @media (prefers-reduced-motion: reduce) {
            .live-quiz-final-confetti { animation: none !important; opacity: 0.28; }
          }
        `}</style>
        {confettiPieces.map((piece) => (
          <span
            key={piece.id}
            className="live-quiz-final-confetti pointer-events-none absolute top-0 z-0 rounded-sm"
            style={{
              left: piece.left,
              width: piece.width,
              height: piece.height,
              backgroundColor: piece.color,
              animation: `live-quiz-final-confetti ${piece.duration} linear ${piece.delay} infinite`,
            }}
          />
        ))}

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col justify-center py-8">
          <div className="mb-5 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-yellow text-slate-950 shadow-xl shadow-yellow-950/30">
              <Trophy size={42} />
            </div>
            <h1 className="font-display text-4xl font-black sm:text-5xl">Final standings</h1>
            <p className="mt-2 text-lg font-bold text-white/75">
              {winner ? `${parseLiveQuizDisplayName(winner.displayName).name} wins with ${winner.score.toLocaleString()} points` : 'Final scores are in.'}
            </p>
          </div>

          {myRank > 0 && me && (
            <div className="mb-5 rounded-3xl border border-yellow-300/35 bg-yellow-300 p-5 text-center text-slate-950 shadow-2xl shadow-yellow-950/25">
              <div className="text-sm font-black uppercase tracking-wide text-slate-700">Your result</div>
              <div className="mt-1 font-display text-4xl font-black">Rank #{myRank}</div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-lg font-black">
                <LiveQuizPlayerName displayName={me.displayName} avatarClassName="h-12 w-12" iconSize={22} nameClassName="text-2xl" />
                <span className="text-2xl">{me.score.toLocaleString()} points</span>
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-white/10 bg-white/10 p-3 shadow-2xl backdrop-blur sm:p-4">
            <div className="mb-3 flex items-center justify-between px-2">
              <h2 className="text-xl font-black">All participants</h2>
              <Crown className="text-brand-yellow" size={24} />
            </div>
            <div className="grid gap-2">
              {ranking.map((participant, index) => {
                const rank = index + 1;
                const isMe = participant.id === participantId;
                return (
                  <div
                    key={participant.id}
                    className={`grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 ${
                      isMe
                        ? 'border-yellow-300 bg-yellow-300 text-slate-950'
                        : rank === 1
                          ? 'border-yellow-300/50 bg-white/15 text-white'
                          : 'border-white/10 bg-slate-950/45 text-white'
                    }`}
                  >
                    <div className={`font-display text-2xl font-black ${rank === 1 && !isMe ? 'text-brand-yellow' : ''}`}>#{rank}</div>
                    <div className="min-w-0">
                      <LiveQuizPlayerName displayName={participant.displayName} nameClassName="text-xl font-black" avatarClassName="h-10 w-10" iconSize={18} />
                    </div>
                    <div className="text-right text-lg font-black">{participant.score.toLocaleString()} pts</div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-yellow px-6 py-4 text-lg font-black text-slate-950 shadow-xl shadow-yellow-950/25 hover:bg-yellow-300 sm:mx-auto sm:w-auto"
          >
            <Home size={18} />
            Go to homepage
          </button>
        </div>
      </div>
    );
  }

  if (session.status === 'leaderboard') {
    const myRank = ranking.findIndex((participant) => participant.id === participantId) + 1;
    return (
      <LiveQuizLeaderboardStage
        participants={participants}
        submissions={submissions}
        questionIndex={session.currentQuestionIndex}
        title={myRank > 0 ? `You are #${myRank}` : 'Leaderboard'}
        subtitle="Round result"
        currentParticipantId={participantId}
        maxRows={8}
        controls={<p className="text-center text-sm font-bold text-white/70">Waiting for the next question...</p>}
      />
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
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 p-3 text-white [background:radial-gradient(circle_at_top_left,rgba(14,165,233,0.24),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.16),transparent_32%),#020617] md:h-[calc(100dvh-4rem)] md:overflow-hidden md:p-4">
      <div className="mx-auto flex min-h-[calc(100vh-4rem-1.5rem)] max-w-6xl flex-col md:h-full md:min-h-0 md:max-w-none">
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3 md:mx-auto md:w-[clamp(720px,55vw,1200px)]">
          <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-black">
            Question {question.questionIndex + 1}
          </div>
          {me && ['leaderboard', 'ended'].includes(session.status) && <div className="rounded-full bg-brand-yellow px-4 py-2 text-sm font-black text-slate-900">{me.score} pts</div>}
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden rounded-3xl bg-white p-4 text-slate-900 shadow-2xl md:mx-auto md:aspect-[2/1] md:h-auto md:max-h-[calc(100dvh-8.5rem)] md:w-[clamp(720px,55vw,1200px)] md:flex-none md:p-5">
          <LiveQuizTimerBar
            active={session.status === 'question'}
            timeLeft={timeLeft}
            timerSeconds={session.timerSeconds || 20}
            elapsedMs={elapsedMs}
            className="-mx-4 -mt-4 mb-4 md:-mx-5 md:-mt-5"
          />
          {imageUrl && (
            <div className="mb-3 max-h-[18vh] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <img src={imageUrl} alt="" className="h-full max-h-[18vh] w-full object-contain" />
            </div>
          )}
          {question.category && <div className="mb-2 text-xs font-black uppercase tracking-wide text-brand-blue">{question.category}</div>}
          <h1 className="min-h-0 max-h-[36vh] shrink overflow-hidden break-words text-[clamp(1.55rem,min(2.35vw,3.8vh),3.1rem)] font-black leading-[1.05]">{question.question}</h1>

          <LiveQuizStudentAnswerGrid
            options={question.options}
            questionIndex={question.questionIndex}
            effectiveSelectedAnswer={effectiveSelectedAnswer}
            revealedAnswer={question.revealedAnswer}
            revealVisible={revealVisible}
            canAnswer={Boolean(canAnswer)}
            isLargeScreen={isLargeAnswerScreen}
            onAnswer={(option) => void handleAnswer(option)}
          />

          {hasSubmitted && !revealVisible && (
            <div className="mt-3 flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-100 p-3 text-center font-black text-slate-700">
              <CheckCircle size={18} className="text-emerald-600" />
              Submitted
            </div>
          )}
          {revealVisible && (
            <div className={`mt-3 shrink-0 rounded-xl p-3 text-center font-black ${isOwnAnswerCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
              {didSubmitAnswer ? (isOwnAnswerCorrect ? 'Correct' : 'Incorrect') : 'No answer submitted'}
            </div>
          )}
          {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
        </div>
      </div>
    </div>
  );
};
