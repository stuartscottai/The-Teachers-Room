import React, { useMemo, useState } from 'react';
import { Radio, Shuffle, Timer, X } from 'lucide-react';
import { GeneratedGame } from '../../types';
import { buildLiveQuizQuestionsFromGame } from '../../utils/liveQuizUtils';

interface LiveQuizSetupModalProps {
  isOpen: boolean;
  game: GeneratedGame | null;
  selectedItemIds: string[];
  onClose: () => void;
  onStart: (options: { timerSeconds: number; randomize: boolean }) => void | Promise<void>;
}

export const LiveQuizSetupModal: React.FC<LiveQuizSetupModalProps> = ({
  isOpen,
  game,
  selectedItemIds,
  onClose,
  onStart,
}) => {
  const [timerSeconds, setTimerSeconds] = useState(20);
  const [randomize, setRandomize] = useState(false);
  const [starting, setStarting] = useState(false);

  const compatibility = useMemo(() => {
    if (!game) return { questions: [], skipped: 0 };
    return buildLiveQuizQuestionsFromGame(game, selectedItemIds);
  }, [game, selectedItemIds]);

  if (!isOpen || !game) return null;

  const compatibleCount = compatibility.questions.length;
  const skippedCount = compatibility.skipped;

  const handleStart = async () => {
    if (compatibleCount === 0) return;
    setStarting(true);
    await onStart({ timerSeconds, randomize });
    setStarting(false);
  };

  return (
    <div className="fixed inset-0 z-[760] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-sm sm:p-4">
      <div className="w-full max-w-lg max-h-full overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-yellow px-3 py-1 text-xs font-black uppercase text-slate-900">
              <Radio size={14} />
              Live Quiz Challenge
            </div>
            <h2 className="mt-3 text-2xl font-black text-slate-900">{game.title}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {compatibleCount} playable multiple-choice question{compatibleCount === 1 ? '' : 's'}
              {skippedCount > 0 ? `, ${skippedCount} skipped` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {skippedCount > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
            Live Quiz currently uses auto-scored multiple-choice questions. Open-ended or incomplete questions will be left out.
          </div>
        )}

        <div className="mt-5 grid gap-4">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700">
              <Timer size={16} className="text-brand-blue" />
              Time per question
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 15, 20, 30].map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => setTimerSeconds(seconds)}
                  className={`rounded-xl border px-3 py-3 font-black ${
                    timerSeconds === seconds
                      ? 'border-brand-blue bg-sky-50 text-brand-blue'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {seconds}s
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setRandomize((value) => !value)}
            className={`flex items-center justify-between rounded-2xl border p-4 text-left ${
              randomize ? 'border-brand-blue bg-sky-50' : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-slate-800">
                <Shuffle size={16} className="text-brand-blue" />
                Randomize question order
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-500">Shuffle selected questions for this live session.</p>
            </div>
            <div className={`h-6 w-11 rounded-full p-1 transition ${randomize ? 'bg-brand-blue' : 'bg-slate-300'}`}>
              <div className={`h-4 w-4 rounded-full bg-white transition ${randomize ? 'translate-x-5' : ''}`} />
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={() => void handleStart()}
          disabled={starting || compatibleCount === 0}
          className="mt-5 w-full rounded-2xl bg-brand-yellow px-6 py-4 text-xl font-black text-slate-900 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {starting ? 'Creating lobby...' : 'Create Live Lobby'}
        </button>
      </div>
    </div>
  );
};
