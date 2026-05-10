import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Crown, Trophy } from 'lucide-react';
import { LiveQuizParticipant, LiveQuizSubmission } from '../../types';
import { LiveQuizAvatarIcon, LiveQuizPlayerName, parseLiveQuizDisplayName } from './liveQuizAvatars';

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
    <div className="min-h-screen bg-slate-950 p-4 text-white [background:radial-gradient(circle_at_top_left,rgba(14,165,233,0.28),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.18),transparent_34%),#020617]">
      {topControls && (
        <div className="mx-auto mb-4 flex w-full max-w-6xl justify-end">
          {topControls}
        </div>
      )}
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-6xl flex-col justify-center">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-brand-yellow">
              <Trophy size={15} />
              {subtitle}
            </div>
            <h1 className="text-4xl font-black leading-none sm:text-6xl">{title}</h1>
          </div>
        </div>

        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {rows.map((participant, index) => {
              const isCurrent = participant.id === currentParticipantId;
              const movedUp = showFinalOrder && participant.movement > 0;
              const movedDown = showFinalOrder && participant.movement < 0;
              const unchanged = showFinalOrder && participant.movement === 0;
              const player = parseLiveQuizDisplayName(participant.displayName);

              return (
                <motion.div
                  layout
                  key={participant.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ layout: { duration: 1.35, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.25 } }}
                  className={`rounded-2xl px-4 py-4 shadow-xl sm:px-6 sm:py-5 ${
                    isCurrent
                      ? 'bg-brand-yellow text-slate-950 ring-4 ring-white/40'
                      : index === 0
                      ? 'bg-amber-50 text-amber-950'
                      : 'bg-white text-slate-900'
                  }`}
                >
                  <div
                    className={`grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:gap-x-4 ${
                      preferSingleLineRows ? 'xl:grid-cols-[56px_minmax(180px,1fr)_minmax(210px,auto)_auto]' : ''
                    }`}
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-black sm:h-12 sm:w-12 sm:text-lg ${
                        isCurrent ? 'bg-slate-950 text-brand-yellow' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {index === 0 ? <Crown size={22} className="text-amber-500" /> : `#${participant.rank}`}
                    </div>

                    <div className="min-w-0 overflow-hidden">
                      {onRemoveParticipant ? (
                        <button
                          type="button"
                          onClick={() => onRemoveParticipant(participant)}
                          disabled={removingParticipantId === participant.id}
                          title={`Remove ${player.name}`}
                          aria-label={`Remove ${player.name}`}
                          className="group flex w-full min-w-0 max-w-full items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {player.avatarId && <LiveQuizAvatarIcon avatarId={player.avatarId} className="h-10 w-10 shrink-0 sm:h-11 sm:w-11" iconSize={23} />}
                          <span className={`min-w-0 truncate ${preferSingleLineRows ? 'text-2xl sm:text-3xl xl:text-4xl' : 'text-2xl sm:text-4xl'} font-black group-hover:line-through`}>
                            {player.name}
                          </span>
                        </button>
                      ) : (
                        <LiveQuizPlayerName
                          displayName={participant.displayName}
                          className="w-full overflow-hidden"
                          nameClassName={`${preferSingleLineRows ? 'text-2xl sm:text-3xl xl:text-4xl' : 'text-2xl sm:text-4xl'} font-black`}
                          avatarClassName="h-10 w-10 sm:h-11 sm:w-11"
                          iconSize={23}
                        />
                      )}
                    </div>

                    <div className={`text-right ${preferSingleLineRows ? 'xl:col-start-4 xl:row-start-1' : ''}`}>
                      <div className={`font-mono font-black leading-none ${preferSingleLineRows ? 'text-3xl sm:text-4xl xl:text-5xl' : 'text-3xl sm:text-5xl'}`}>
                        <AnimatedScore value={participant.displayScore} />
                      </div>
                      <div className={`text-[10px] font-black uppercase ${isCurrent ? 'text-slate-700' : 'text-slate-400'}`}>points</div>
                    </div>

                    <div className={`col-span-2 col-start-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 ${preferSingleLineRows ? 'xl:col-span-1 xl:col-start-3 xl:row-start-1' : ''}`}>
                      {showFinalOrder && (
                        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          movedUp
                            ? 'bg-lime-100 text-lime-700'
                            : movedDown
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {movedUp ? <ArrowUp size={19} /> : movedDown ? <ArrowDown size={19} /> : <span className="text-sm font-black">-</span>}
                        </span>
                      )}
                      <div className={`min-w-0 text-lg font-black leading-tight sm:text-xl ${
                          participant.roundGain > 0
                            ? isCurrent ? 'text-slate-800' : 'text-lime-700'
                            : isCurrent ? 'text-slate-700' : 'text-slate-400'
                        }`}>
                        {showFinalOrder
                          ? participant.roundGain > 0
                            ? `+${participant.roundGain} this round`
                            : '0 this round'
                          : 'Calculating'}
                      </div>
                      <div className={`text-sm font-black uppercase tracking-wide ${isCurrent ? 'text-slate-700' : 'text-slate-500'}`}>
                        {totalQuestions ? `${participant.correctCount}/${totalQuestions} correct` : `${participant.correctCount} correct`}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {controls && <div className="mt-6 flex flex-wrap justify-center gap-3">{controls}</div>}
      </div>
    </div>
  );
};
