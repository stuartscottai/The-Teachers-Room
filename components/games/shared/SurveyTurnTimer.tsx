import { translateInterfaceText as ui, useInterfaceLanguage as useUiLanguage } from '../../../utils/interfaceLanguage';
import React, { useEffect, useRef, useState } from 'react';
import { Clock, Pause, Play } from 'lucide-react';

// Mounted with a new key for each turn, including when only one team remains.
export const SurveyTurnTimer: React.FC<{
    seconds: number; paused: boolean; manuallyPaused: boolean;
    onTogglePause: () => void; onExpire: () => void;
}> = ({ seconds, paused, manuallyPaused, onTogglePause, onExpire }) => {
  useUiLanguage();
    const remaining = useRef(seconds * 1000);
    const expired = useRef(false);
    const onExpireRef = useRef(onExpire);
    onExpireRef.current = onExpire;
    const [displaySeconds, setDisplaySeconds] = useState(seconds);
    useEffect(() => {
        if (paused || expired.current) return;
        let previous = performance.now();
        const interval = window.setInterval(() => {
            const now = performance.now();
            remaining.current = Math.max(0, remaining.current - (now - previous));
            previous = now;
            setDisplaySeconds(Math.ceil(remaining.current / 1000));
            if (remaining.current <= 0 && !expired.current) {
                expired.current = true;
                window.clearInterval(interval);
                onExpireRef.current();
            }
        }, 100);
        return () => window.clearInterval(interval);
    }, [paused]);
    const colour = displaySeconds <= 5 ? 'bg-red-700' : displaySeconds <= 10 ? 'bg-amber-700' : 'bg-sky-700';
    return (
        <div className="flex w-full items-stretch gap-2 sm:gap-3" data-testid="survey-turn-timer">
            <div className="relative flex h-8 min-w-0 flex-1 items-center justify-between gap-2 overflow-hidden rounded-lg border-2 border-slate-400 bg-slate-950 px-2 text-white sm:h-10 sm:px-3">
                <div aria-hidden="true" className={`absolute inset-y-0 left-0 transition-[width] duration-150 motion-reduce:transition-none ${colour}`} style={{ width: `${Math.max(0, displaySeconds / seconds * 100)}%` }} />
                <div className="relative flex min-w-0 items-center gap-1 drop-shadow-md sm:gap-2">
                    <Clock className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden="true" />
                    <span className="whitespace-nowrap text-[10px] font-bold sm:text-base">{ui("Time to guess")}</span>
                    {paused && <span className="text-[9px] font-bold text-amber-200 sm:text-xs">{ui("Paused")}</span>}
                </div>
                <span role="timer" aria-label={ui("Time remaining")} className="relative shrink-0 font-mono text-xl font-black tabular-nums text-white drop-shadow-md sm:text-3xl">{displaySeconds}<span className="ml-0.5 text-sm sm:text-lg">s</span></span>
            </div>
            <button type="button" onClick={onTogglePause} aria-label={manuallyPaused ? ui("Resume timer") : ui("Pause timer")} className="flex w-20 shrink-0 items-center justify-center gap-1 rounded-lg border-2 border-slate-400 bg-slate-800 font-bold text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:w-28">
                {manuallyPaused ? <Play className="h-4 w-4 sm:h-5 sm:w-5" /> : <Pause className="h-4 w-4 sm:h-5 sm:w-5" />}
                <span className="text-[10px] sm:text-sm">{manuallyPaused ? ui("Resume") : ui("Pause")}</span>
            </button>
        </div>
    );
};
