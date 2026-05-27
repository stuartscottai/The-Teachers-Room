import React from 'react';
import { Clock } from 'lucide-react';

interface LiveQuizTimerBarProps {
  active: boolean;
  timeLeft: number;
  timerSeconds: number;
  elapsedMs: number;
  className?: string;
}

export const LiveQuizTimerBar: React.FC<LiveQuizTimerBarProps> = ({
  active,
  timeLeft,
  timerSeconds,
  elapsedMs,
  className = '',
}) => {
  const remainingMs = Math.max(0, (timerSeconds * 1000) - elapsedMs);
  const progress = Math.max(0, Math.min(1, remainingMs / (timerSeconds * 1000)));
  const isUrgent = timeLeft <= 5;
  const shouldShowContent = active && timerSeconds > 0;

  return (
    <div
      className={`relative h-10 overflow-hidden rounded-t-2xl border-b border-slate-200/80 bg-slate-100 transition-opacity duration-700 ease-out ${shouldShowContent ? 'opacity-100' : 'opacity-0'} ${className}`}
      aria-label={shouldShowContent ? `${timeLeft} seconds remaining` : undefined}
      aria-hidden={!shouldShowContent}
    >
      <div
        className="absolute inset-y-0 left-0 bg-brand-blue transition-[width] duration-200 ease-linear"
        style={{ width: `${shouldShowContent ? progress * 100 : 0}%` }}
      />
      <div className="absolute inset-0 bg-white/35" />
      <div className="relative z-10 flex h-full items-center justify-between px-4 text-slate-900">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide">
          <Clock size={15} />
          Time remaining
        </div>
        <div className={`rounded-full border px-3 py-0.5 text-xs font-black shadow-sm ${isUrgent && shouldShowContent ? 'border-red-200 bg-white text-red-600' : 'border-slate-200 bg-white/90 text-slate-950'}`}>
          {timeLeft}s
        </div>
      </div>
    </div>
  );
};
