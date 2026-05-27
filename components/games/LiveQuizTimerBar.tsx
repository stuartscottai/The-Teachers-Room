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
  if (!active || timerSeconds <= 0) return null;

  const remainingMs = Math.max(0, (timerSeconds * 1000) - elapsedMs);
  const progress = Math.max(0, Math.min(1, remainingMs / (timerSeconds * 1000)));
  const isUrgent = timeLeft <= 5;
  const fillClass = isUrgent
    ? 'from-red-500 via-orange-400 to-brand-yellow'
    : 'from-brand-blue via-cyan-400 to-brand-yellow';

  return (
    <div className={`relative h-12 overflow-hidden rounded-t-3xl bg-slate-900 ${className}`} aria-label={`${timeLeft} seconds remaining`}>
      <div
        className={`absolute inset-y-0 left-0 bg-gradient-to-r ${fillClass} transition-[width] duration-200 ease-linear`}
        style={{ width: `${progress * 100}%` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.18)_0_1px,transparent_1px_12.5%)] opacity-35" />
      <div className="relative z-10 flex h-full items-center justify-between px-4 text-white">
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide drop-shadow">
          <Clock size={17} />
          Time remaining
        </div>
        <div className={`rounded-full px-3 py-1 text-sm font-black shadow-sm ${isUrgent ? 'bg-white text-red-600' : 'bg-white/90 text-slate-950'}`}>
          {timeLeft}s
        </div>
      </div>
    </div>
  );
};
