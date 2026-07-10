import { GameType, GeneratedGame, GeneratedQuestion } from '../types';
import { resolveGameQuestionImageUrls } from './gameImage';

type ImageEntry = {
  key: string;
  image: NonNullable<GeneratedQuestion['image']>;
  urls: string[];
};

export type GameImagePreparationResult = {
  preparedGame: GeneratedGame;
  continueGame: GeneratedGame;
  total: number;
  ready: number;
  unavailable: number;
  unavailableKeys: string[];
  temporaryFailures: number;
  temporaryFailureKeys: string[];
};

type PrepareOptions = {
  signal?: AbortSignal;
  concurrency?: number;
  timeoutMs?: number;
  onProgress?: (progress: {
    ready: number;
    completed: number;
    total: number;
    phase: 'loading' | 'retrying' | 'checking';
  }) => void;
};

const getImageEntries = (game: GeneratedGame): ImageEntry[] => {
  const entries: ImageEntry[] = [];
  const collect = (question: GeneratedQuestion | undefined, key: string) => {
    if (!question?.image) return;
    const urls = resolveGameQuestionImageUrls(question.image);
    if (!urls.length) return;
    entries.push({ key, image: question.image, urls });
  };

  if (game.config.type === GameType.JEOPARDY) {
    (game.jeopardyBoard || []).forEach((category, categoryIndex) => {
      (category.questions || []).forEach((question, questionIndex) => {
        collect(question, `jeopardy:${categoryIndex}:${questionIndex}`);
      });
    });
  } else if (game.config.type === GameType.PUB_QUIZ) {
    (game.pubQuizRounds || []).forEach((round, roundIndex) => {
      (round.questions || []).forEach((question, questionIndex) => {
        collect(question, `pubquiz:${roundIndex}:${questionIndex}`);
      });
    });
  } else {
    (game.questions || []).forEach((question, index) => collect(question, `standard:${index}`));
  }

  return entries;
};

const loadImageUrl = (url: string, timeoutMs: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', handleAbort);
      image.onload = null;
      image.onerror = null;
      if (error) reject(error);
      else resolve();
    };

    const handleAbort = () => {
      image.src = '';
      finish(new DOMException('Image preparation was cancelled.', 'AbortError'));
    };

    const timeoutId = window.setTimeout(() => {
      image.src = '';
      finish(new Error('Image preparation timed out.'));
    }, timeoutMs);

    image.decoding = 'async';
    image.onload = async () => {
      try {
        if (typeof image.decode === 'function') await image.decode();
      } catch {
        // onload already confirms the browser has a usable image.
      }
      finish();
    };
    image.onerror = () => finish(new Error('Image could not be loaded.'));
    signal?.addEventListener('abort', handleAbort, { once: true });

    if (signal?.aborted) {
      handleAbort();
      return;
    }
    image.src = url;
  });

const loadFirstAvailableUrl = async (urls: string[], timeoutMs: number, signal?: AbortSignal) => {
  for (const url of urls) {
    try {
      await loadImageUrl(url, timeoutMs, signal);
      return url;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
    }
  }
  return null;
};

const isConfirmedMissingStatus = (status: number) => status === 400 || status === 404 || status === 410;

const isConfirmedUnavailable = async (urls: string[], signal?: AbortSignal) => {
  for (const url of urls) {
    const controller = new AbortController();
    const handleAbort = () => controller.abort();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);
    signal?.addEventListener('abort', handleAbort, { once: true });

    try {
      const response = await fetch(url, { method: 'GET', cache: 'default', signal: controller.signal });
      void response.body?.cancel().catch(() => undefined);
      if (response.ok || !isConfirmedMissingStatus(response.status)) return false;
    } catch {
      return false;
    } finally {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', handleAbort);
    }
  }

  return urls.length > 0;
};

const applyResults = (
  game: GeneratedGame,
  results: Map<string, string | null>,
  omitUnavailable: boolean
): GeneratedGame => {
  const apply = (question: GeneratedQuestion, key: string): GeneratedQuestion => {
    if (!question.image || !results.has(key)) return question;
    const preparedUrl = results.get(key);
    if (!preparedUrl) {
      return omitUnavailable ? { ...question, image: undefined } : question;
    }
    return { ...question, image: { ...question.image, preparedUrl } };
  };

  return {
    ...game,
    questions: (game.questions || []).map((question, index) => apply(question, `standard:${index}`)),
    jeopardyBoard: game.jeopardyBoard?.map((category, categoryIndex) => ({
      ...category,
      questions: (category.questions || []).map((question, questionIndex) =>
        apply(question, `jeopardy:${categoryIndex}:${questionIndex}`)
      ),
    })),
    pubQuizRounds: game.pubQuizRounds?.map((round, roundIndex) => ({
      ...round,
      questions: (round.questions || []).map((question, questionIndex) =>
        apply(question, `pubquiz:${roundIndex}:${questionIndex}`)
      ),
    })),
  };
};

export const prepareGameImages = async (
  game: GeneratedGame,
  options: PrepareOptions = {}
): Promise<GameImagePreparationResult> => {
  const entries = getImageEntries(game);
  const total = entries.length;
  const results = new Map<string, string | null>();
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 5, 8));
  const timeoutMs = Math.max(3000, options.timeoutMs ?? 12000);
  let completed = 0;
  let ready = 0;

  options.onProgress?.({ ready, completed, total, phase: 'loading' });

  const runEntries = async (
    targetEntries: ImageEntry[],
    workerCount: number,
    attemptTimeoutMs: number,
    phase: 'loading' | 'retrying'
  ) => {
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < targetEntries.length) {
        if (options.signal?.aborted) throw new DOMException('Image preparation was cancelled.', 'AbortError');
        const entry = targetEntries[nextIndex];
        nextIndex += 1;
        const preparedUrl = await loadFirstAvailableUrl(entry.urls, attemptTimeoutMs, options.signal);
        const wasReady = Boolean(results.get(entry.key));
        results.set(entry.key, preparedUrl);
        if (phase === 'loading') completed += 1;
        if (preparedUrl && !wasReady) ready += 1;
        options.onProgress?.({ ready, completed, total, phase });
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(workerCount, Math.max(targetEntries.length, 1)) }, () => worker())
    );
  };

  await runEntries(entries, concurrency, timeoutMs, 'loading');

  const firstPassFailures = entries.filter((entry) => !results.get(entry.key));
  if (firstPassFailures.length > 0) {
    options.onProgress?.({ ready, completed, total, phase: 'retrying' });
    await runEntries(firstPassFailures, 2, Math.max(timeoutMs, 20000), 'retrying');
  }

  const remainingFailures = entries.filter((entry) => !results.get(entry.key));
  options.onProgress?.({ ready, completed, total, phase: 'checking' });

  const unavailableKeys: string[] = [];
  const temporaryFailureKeys: string[] = [];
  for (const entry of remainingFailures) {
    if (await isConfirmedUnavailable(entry.urls, options.signal)) unavailableKeys.push(entry.key);
    else temporaryFailureKeys.push(entry.key);
  }

  return {
    preparedGame: applyResults(game, results, false),
    continueGame: applyResults(game, results, true),
    total,
    ready,
    unavailable: unavailableKeys.length,
    unavailableKeys,
    temporaryFailures: temporaryFailureKeys.length,
    temporaryFailureKeys,
  };
};
