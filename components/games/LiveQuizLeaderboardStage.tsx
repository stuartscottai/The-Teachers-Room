import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Crown, Trophy } from 'lucide-react';
import { LiveQuizParticipant, LiveQuizSubmission } from '../../types';
import { LiveQuizAvatarIcon, parseLiveQuizDisplayName } from './liveQuizAvatars';

const getRoundGain = (submissions: LiveQuizSubmission[], participantId: string, questionIndex: number) =>
  submissions.find((submission) => submission.participantId === participantId && submission.questionIndex === questionIndex)?.pointsAwarded || 0;

const getCorrectCount = (submissions: LiveQuizSubmission[], participantId: string) =>
  submissions.filter((submission) => submission.participantId === participantId && submission.isCorrect).length;

const sortByScore = <T extends { displayName: string; displayScore: number }>(items: T[]) =>
  [...items].sort((a, b) => b.displayScore - a.displayScore || parseLiveQuizDisplayName(a.displayName).name.localeCompare(parseLiveQuizDisplayName(b.displayName).name));

const AnimatedScore: React.FC<{ value: number; className?: string; durationMs?: number }> = ({ value, className, durationMs = 1500 }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const start = displayValue;
    const delta = value - start;
    if (delta === 0) return;

    const startedAt = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(start + delta * eased));
      if (progress < 1) frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [durationMs, value]);

  return <span className={className}>{displayValue}</span>;
};

interface LiveQuizLeaderboardStageProps {
  participants: LiveQuizParticipant[];
  submissions: LiveQuizSubmission[];
  questionIndex: number;
  title?: string;
  subtitle?: string;
  currentParticipantId?: string;
  totalQuestions?: number;
  maxRows?: number;
  controls?: React.ReactNode;
  topControls?: React.ReactNode;
  removingParticipantId?: string | null;
  onRemoveParticipant?: (participant: LiveQuizParticipant) => void;
  preferSingleLineRows?: boolean;
}

export const LiveQuizLeaderboardStage: React.FC<LiveQuizLeaderboardStageProps> = ({
  participants,
  submissions,
  questionIndex,
  title = 'Leaderboard',
  subtitle = 'Round scores',
  currentParticipantId,
  totalQuestions,
  maxRows,
  controls,
  topControls,
  removingParticipantId,
  onRemoveParticipant,
  preferSingleLineRows = false,
}) => {
  const [showFinalOrder, setShowFinalOrder] = useState(false);

  useEffect(() => {
    setShowFinalOrder(false);
    const timeoutId = window.setTimeout(() => setShowFinalOrder(true), 650);
    return () => window.clearTimeout(timeoutId);
  }, [questionIndex]);

  const rows = useMemo(() => {
    const baseRows = participants.map((participant) => {
      const roundGain = getRoundGain(submissions, participant.id, questionIndex);
      return {
        ...participant,
        roundGain,
        correctCount: getCorrectCount(submissions, participant.id),
        previousScore: Math.max(0, participant.score - roundGain),
      };
    });

    const previousRows = sortByScore(baseRows.map((participant) => ({ ...participant, displayScore: participant.previousScore })));
    const finalRows = sortByScore(baseRows.map((participant) => ({ ...participant, displayScore: participant.score })));
    const previousRanks = new Map(previousRows.map((participant, index) => [participant.id, index + 1]));
    const finalRanks = new Map(finalRows.map((participant, index) => [participant.id, index + 1]));
    const visibleRows = showFinalOrder ? finalRows : previousRows;

    return visibleRows.slice(0, maxRows || visibleRows.length).map((participant, index) => {
      const previousRank = previousRanks.get(participant.id) || index + 1;
      const finalRank = finalRanks.get(participant.id) || index + 1;
      return {
        ...participant,
        rank: index + 1,
        previousRank,
        finalRank,
        movement: previousRank - finalRank,
      };
    });
  }, [maxRows, participants, questionIndex, showFinalOrder, submissions]);

  return (
    <div className="min-h-screen bg-slate-950 p-3 text-white [background:radial-gradient(circle_at_12%_8%,rgba(14,165,233,0.24),transparent_34%),radial-gradient(circle_at_88%_88%,rgba(250,204,21,0.14),transparent_30%),linear-gradient(135deg,#071525_0%,#020617_55%,#0b1220_100%)] sm:p-4">
      {topControls && (
        <div className="mx-auto mb-4 flex w-full max-w-6xl justify-end">
          {topControls}
        </div>
      )}
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-6xl flex-col justify-start py-5 sm:justify-center sm:py-0">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4 sm:mb-5">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-yellow-200/25 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-brand-yellow shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:mb-3 sm:text-xs">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-yellow text-slate-950">
                <Trophy size={14} />
              </span>
              {subtitle}
            </div>
            <h1 className="text-3xl font-black leading-none drop-shadow-[0_4px_0_rgba(2,6,23,0.45)] sm:text-6xl">{title}</h1>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-cyan-200/15 bg-[radial-gradient(circle_at_18%_0%,rgba(56,189,248,0.16),transparent_34%),radial-gradient(circle_at_86%_96%,rgba(250,204,21,0.14),transparent_34%),linear-gradient(145deg,#152033_0%,#0b1220_48%,#12161f_100%)] p-2 shadow-[inset_0_2px_0_rgba(255,255,255,0.08),inset_0_-18px_36px_rgba(2,6,23,0.26),0_12px_0_rgba(2,6,23,0.32),0_24px_42px_rgba(2,6,23,0.4)] sm:p-4 sm:shadow-[inset_0_2px_0_rgba(255,255,255,0.08),inset_0_-18px_36px_rgba(2,6,23,0.26),0_18px_0_rgba(2,6,23,0.36),0_30px_50px_rgba(2,6,23,0.45)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/10 to-transparent" />
          <div className="relative z-10 space-y-2 sm:space-y-3">
          <AnimatePresence initial={false}>
            {rows.map((participant, index) => {
              const isCurrent = participant.id === currentParticipantId;
              const isLeader = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;
              const movedUp = showFinalOrder && participant.movement > 0;
              const movedDown = showFinalOrder && participant.movement < 0;
              const player = parseLiveQuizDisplayName(participant.displayName);
              const rankCardClass = isLeader
                ? 'border-yellow-300 bg-yellow-700/85 shadow-[inset_0_2px_0_rgba(255,255,255,0.22),0_7px_0_rgba(146,64,14,0.9),0_16px_26px_rgba(2,6,23,0.28)]'
                : isSecond
                ? 'border-slate-200/60 bg-slate-700/70 shadow-[inset_0_2px_0_rgba(255,255,255,0.11),0_7px_0_rgba(51,65,85,0.74),0_16px_26px_rgba(2,6,23,0.26)]'
                : isThird
                ? 'border-orange-300/65 bg-orange-950/35 shadow-[inset_0_2px_0_rgba(255,255,255,0.1),0_7px_0_rgba(120,53,15,0.72),0_16px_26px_rgba(2,6,23,0.26)]'
                : 'border-white/12 bg-white/[0.075] shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_7px_0_rgba(2,6,23,0.34),0_16px_26px_rgba(2,6,23,0.24)]';
              const currentClass = isCurrent ? 'relative z-20 -mx-1 border-2 ring-2 ring-cyan-200/80 ring-offset-2 ring-offset-slate-950 sm:-mx-3' : '';
              const rankBadgeClass = isLeader
                ? 'bg-yellow-300 text-slate-950 shadow-[inset_0_2px_0_rgba(255,255,255,0.5),0_3px_0_#92400e]'
                : isSecond
                ? 'bg-slate-200 text-slate-950 shadow-[inset_0_2px_0_rgba(255,255,255,0.55),0_3px_0_#475569]'
                : isThird
                ? 'bg-orange-300 text-slate-950 shadow-[inset_0_2px_0_rgba(255,255,255,0.45),0_3px_0_#9a3412]'
                : 'bg-white/8 text-white/65';
              const scoreClass = isLeader ? 'text-yellow-100' : isSecond ? 'text-slate-100' : isThird ? 'text-orange-200' : 'text-white';

              return (
                <motion.div
                  layout
                  key={participant.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ layout: { duration: 1.35, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.25 } }}
                  className={`relative overflow-hidden rounded-2xl border px-3 text-white sm:px-6 ${isCurrent ? 'py-4 sm:py-6' : 'py-3 sm:py-5'} ${rankCardClass} ${currentClass}`}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
                  <div
                    className={`relative z-10 grid grid-cols-[36px_32px_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 sm:grid-cols-[56px_44px_minmax(0,1fr)_auto] sm:gap-x-4 sm:gap-y-2 ${
                      preferSingleLineRows ? 'xl:grid-cols-[56px_44px_minmax(220px,1fr)_180px_56px_240px_170px]' : ''
                    }`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black sm:h-12 sm:w-12 sm:text-lg ${rankBadgeClass}`}>
                        {isLeader ? <Crown size={22} /> : `#${participant.rank}`}
                    </div>

                    <div className="flex h-8 w-8 items-center justify-center sm:h-11 sm:w-11">
                      {player.avatarId && <LiveQuizAvatarIcon avatarId={player.avatarId} className="h-8 w-8 sm:h-11 sm:w-11" iconSize={23} />}
                    </div>

                    <div className="min-w-0 overflow-hidden">
                      {onRemoveParticipant ? (
                        <button
                          type="button"
                          onClick={() => onRemoveParticipant(participant)}
                          disabled={removingParticipantId === participant.id}
                          title={`Remove ${player.name}`}
                          aria-label={`Remove ${player.name}`}
                          className="group block w-full min-w-0 max-w-full text-left disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className={`min-w-0 truncate ${preferSingleLineRows ? 'text-xl sm:text-3xl xl:text-4xl' : 'text-xl sm:text-4xl'} font-black group-hover:line-through`}>
                            {player.name}
                          </span>
                        </button>
                      ) : (
                        <span className={`block min-w-0 truncate ${preferSingleLineRows ? 'text-xl sm:text-3xl xl:text-4xl' : 'text-xl sm:text-4xl'} font-black`}>
                          {player.name || participant.displayName}
                        </span>
                      )}
                    </div>

                    <div className={`text-right ${preferSingleLineRows ? 'xl:col-start-7 xl:row-start-1' : ''}`}>
                      <div className={`font-mono font-black leading-none drop-shadow-[0_2px_0_rgba(2,6,23,0.45)] ${scoreClass} ${preferSingleLineRows ? 'text-2xl sm:text-4xl xl:text-5xl' : 'text-2xl sm:text-5xl'}`}>
                        <AnimatedScore value={participant.displayScore} />
                      </div>
                      <div className="text-[10px] font-black uppercase text-white/55">points</div>
                    </div>

                    <div className={`col-span-4 col-start-1 mt-1 grid min-w-0 grid-cols-[36px_32px_minmax(0,1fr)_auto] items-center gap-x-2 sm:col-span-4 sm:col-start-1 sm:mt-0 sm:grid sm:grid-cols-[56px_44px_minmax(0,1fr)_auto] sm:gap-x-4 ${preferSingleLineRows ? 'xl:col-span-3 xl:col-start-4 xl:row-start-1 xl:grid-cols-[180px_56px_240px] xl:gap-x-0' : ''}`}>
                      {!preferSingleLineRows && <span className="hidden sm:block" />}
                      {showFinalOrder && (
                        <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center justify-self-center rounded-full sm:h-8 sm:w-8 ${preferSingleLineRows ? 'xl:order-2' : ''} ${
                          movedUp
                            ? 'bg-lime-100 text-lime-700'
                            : movedDown
                            ? 'bg-red-100 text-red-700'
                            : 'bg-white/10 text-white/45'
                        }`}>
                          {movedUp ? <ArrowUp size={16} /> : movedDown ? <ArrowDown size={16} /> : <span className="text-xs font-black sm:text-sm">-</span>}
                        </span>
                      )}
                      <span className={preferSingleLineRows ? 'block xl:hidden' : 'block sm:hidden'} />
                      <div className={`min-w-0 text-sm font-black leading-tight sm:text-xl ${preferSingleLineRows ? 'xl:order-3 xl:justify-self-end xl:text-right' : ''} ${
                          participant.roundGain > 0
                            ? 'text-lime-300'
                            : 'text-white/55'
                        }`}>
                        {showFinalOrder
                          ? participant.roundGain > 0
                            ? `+${participant.roundGain} this round`
                            : '0 this round'
                          : 'Calculating'}
                      </div>
                      <div className={`shrink-0 text-xs font-black uppercase tracking-wide text-cyan-100/70 sm:text-sm ${preferSingleLineRows ? 'xl:order-1 xl:justify-self-start' : ''}`}>
                        {totalQuestions ? `${participant.correctCount}/${totalQuestions} correct` : `${participant.correctCount} correct`}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          </div>
        </div>

        {controls && <div className="mt-6 flex flex-wrap justify-center gap-3">{controls}</div>}
      </div>
    </div>
  );
};
