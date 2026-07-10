import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, ImageIcon, Loader2, Pencil, Play, RefreshCw } from 'lucide-react';
import { GeneratedGame } from '../../types';
import { GameImagePreparationResult, prepareGameImages } from '../../utils/gameImagePreparation';

type GameImagePreparationProps = {
  game: GeneratedGame;
  onReady: (game: GeneratedGame) => void;
  onReplace: (unavailableKeys: string[]) => void;
  onBack: () => void;
};

export const GameImagePreparation: React.FC<GameImagePreparationProps> = ({ game, onReady, onReplace, onBack }) => {
  const [progress, setProgress] = useState<{
    ready: number;
    completed: number;
    total: number;
    phase: 'loading' | 'retrying' | 'checking';
  }>({ ready: 0, completed: 0, total: 0, phase: 'loading' });
  const [result, setResult] = useState<GameImagePreparationResult | null>(null);
  const [unexpectedError, setUnexpectedError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setResult(null);
    setUnexpectedError(false);

    void prepareGameImages(game, {
      signal: controller.signal,
      concurrency: 5,
      onProgress: (nextProgress) => {
        if (active) setProgress(nextProgress);
      },
    })
      .then((nextResult) => {
        if (!active) return;
        setResult(nextResult);
        if (nextResult.unavailable === 0 && nextResult.temporaryFailures === 0) {
          window.setTimeout(() => {
            if (active) onReady(nextResult.preparedGame);
          }, nextResult.total > 0 ? 450 : 0);
        }
      })
      .catch((error) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        console.error('Game image preparation failed:', error);
        setUnexpectedError(true);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt, game, onReady]);

  const percentage = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 100;
  const isComplete = Boolean(result);
  const hasFailures = Boolean(result && (result.unavailable > 0 || result.temporaryFailures > 0));

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-6 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl sm:p-9">
        <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${
          hasFailures || unexpectedError ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-brand-blue'
        }`}>
          {hasFailures || unexpectedError ? (
            <AlertTriangle size={32} />
          ) : isComplete ? (
            <ImageIcon size={32} />
          ) : (
            <Loader2 size={32} className="animate-spin" />
          )}
        </div>

        <h1 className="text-2xl font-black text-slate-900">
          {hasFailures || unexpectedError ? 'Some images need attention' : 'Preparing game images'}
        </h1>

        {!isComplete && !unexpectedError && (
          <>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {progress.total > 0
                ? progress.phase === 'retrying'
                  ? `Retrying ${progress.total - progress.ready} slow ${progress.total - progress.ready === 1 ? 'image' : 'images'}...`
                  : progress.phase === 'checking'
                    ? 'Checking the remaining images...'
                    : `${progress.ready} of ${progress.total} images ready`
                : 'Checking this game for images...'}
            </p>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-blue transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </>
        )}

        {result && (result.unavailable > 0 || result.temporaryFailures > 0) && (
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
            {result.ready} {result.ready === 1 ? 'image' : 'images'} ready.
            {result.unavailable > 0 && (
              <> {result.unavailable} {result.unavailable === 1 ? 'image is' : 'images are'} no longer available.</>
            )}
            {result.temporaryFailures > 0 && (
              <> {result.temporaryFailures} {result.temporaryFailures === 1 ? 'image could not' : 'images could not'} be prepared.</>
            )}
          </p>
        )}

        {unexpectedError && (
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
            The images could not be checked. You can return and try again.
          </p>
        )}

        {(hasFailures || unexpectedError) && (
          <div className="mt-7 flex flex-col gap-3">
            {result && result.temporaryFailures > 0 && (
              <button
                type="button"
                onClick={() => setAttempt((current) => current + 1)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-yellow px-5 py-3 font-black text-slate-900 hover:bg-yellow-300"
              >
                <RefreshCw size={18} />
                Try again
              </button>
            )}
            {result && result.unavailable > 0 && (
              <button
                type="button"
                onClick={() => onReplace(result.unavailableKeys)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-yellow px-5 py-3 font-black text-slate-900 hover:bg-yellow-300"
              >
                <Pencil size={18} />
                Replace images
              </button>
            )}
            {result && (result.unavailable > 0 || result.temporaryFailures > 0) && (
              <>
                <button
                  type="button"
                  onClick={() => onReady(result.continueGame)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-blue px-5 py-3 font-black text-white hover:bg-blue-600"
                >
                  <Play size={18} />
                  Continue without them
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={18} />
              Go back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
