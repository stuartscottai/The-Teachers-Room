import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, CheckCircle2, RotateCcw, Target, Trophy, XCircle } from 'lucide-react';
import { PracticeReviewItem } from '../../../types';

interface PracticeReviewSummaryProps {
  playerName?: string;
  correctCount: number;
  totalCount: number;
  missedItems: PracticeReviewItem[];
  onReplay: () => void;
  onExit: () => void;
}

export const PracticeReviewSummary: React.FC<PracticeReviewSummaryProps> = ({
  playerName,
  correctCount,
  totalCount,
  missedItems,
  onReplay,
  onExit,
}) => {
  const [showReview, setShowReview] = useState(false);
  const displayName = playerName || 'Player';
  const safeTotal = Math.max(0, totalCount);
  const safeCorrect = Math.max(0, Math.min(correctCount, safeTotal));
  const percent = safeTotal > 0 ? Math.round((safeCorrect / safeTotal) * 100) : 0;
  const ringStyle = {
    background: `conic-gradient(#10b981 ${percent * 3.6}deg, #e2e8f0 0deg)`,
  };

  const reviewButtonLabel = missedItems.length === 0
    ? 'No wrong answers to review'
    : showReview
    ? 'Hide review'
    : 'Review wrong answers';

  const content = (
    <div className="fixed inset-x-0 bottom-0 top-16 z-[90] overflow-y-auto overscroll-contain bg-slate-100 pt-4">
      <div className="mx-auto max-w-5xl px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="relative bg-slate-900 px-5 py-7 text-white sm:px-8 sm:py-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.28),transparent_32%),radial-gradient(circle_at_82%_28%,rgba(16,185,129,0.24),transparent_30%)]" />
            <div className="relative grid gap-6 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
              <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full p-2 shadow-[0_20px_50px_rgba(15,23,42,0.35)] md:mx-0" style={ringStyle}>
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-slate-950">
                  <div className="text-3xl font-black text-white">{percent}%</div>
                  <div className="text-[10px] font-black uppercase tracking-wide text-emerald-200">Score</div>
                </div>
              </div>

              <div className="text-center md:text-left">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase text-emerald-100">
                  <Trophy size={14} />
                  Practice complete
                </div>
                <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">Finished, {displayName}</h1>
                <p className="mt-2 text-lg font-bold text-slate-200">
                  {safeCorrect} / {safeTotal} correct
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center md:w-56">
                <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                  <Target size={18} className="mx-auto mb-1 text-emerald-200" />
                  <div className="text-2xl font-black">{safeCorrect}</div>
                  <div className="text-[10px] font-black uppercase text-slate-300">Correct</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                  <BookOpen size={18} className="mx-auto mb-1 text-rose-200" />
                  <div className="text-2xl font-black">{missedItems.length}</div>
                  <div className="text-[10px] font-black uppercase text-slate-300">Review</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-3 border-b border-slate-200 bg-white p-4 sm:flex-row sm:p-5">
            <button
              type="button"
              onClick={onReplay}
              className="relative z-10 inline-flex touch-manipulation items-center justify-center gap-2 rounded-xl bg-brand-blue px-5 py-3 font-black text-white hover:brightness-110"
            >
              <RotateCcw size={17} />
              Try again
            </button>
            <button
              type="button"
              onClick={() => setShowReview((prev) => !prev)}
              disabled={missedItems.length === 0}
              className="relative z-10 touch-manipulation rounded-xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reviewButtonLabel}
            </button>
            <button
              type="button"
              onClick={onExit}
              className="relative z-10 touch-manipulation rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 font-black text-slate-700 hover:bg-slate-100"
            >
              Exit
            </button>
          </div>
        </div>

        {showReview && (
          <div className="mt-5 space-y-4 pb-8">
            {missedItems.map((item, index) => (
              <div key={`${item.id}-${index}`} className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase text-rose-600">
                  <XCircle size={16} />
                  Question {index + 1}
                </div>
                {item.context && <div className="mb-1 text-xs font-bold uppercase text-slate-400">{item.context}</div>}
                <p className="text-lg font-black leading-snug text-slate-900 sm:text-xl">{item.question}</p>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-lg bg-rose-50 p-3">
                    <div className="font-black uppercase text-rose-700">Answered</div>
                    <div className="font-semibold text-slate-700">{item.studentAnswer || 'Incorrect / not answered'}</div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-3">
                    <div className="font-black uppercase text-emerald-700">Correct answer</div>
                    <div className="font-semibold text-slate-700">{item.correctAnswer}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return content;

  return createPortal(content, document.body);
};
