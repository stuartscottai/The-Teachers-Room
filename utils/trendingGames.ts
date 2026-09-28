import type { GeneratedGame } from '../types';

const totalPlays = (game: GeneratedGame) => Math.max(0, Number(game.playCount ?? 0) || 0);
const createdAt = (game: GeneratedGame) => new Date(game.createdAt || 0).getTime() || 0;

export const selectTrendingGamesByMode = (
  games: GeneratedGame[],
  recentPlayCounts: ReadonlyMap<string, number>,
  limit: number,
): GeneratedGame[] => {
  const modes = new Map<string, { recent: number; total: number; latest: number; best: GeneratedGame }>();

  for (const game of games) {
    const mode = String(game.config?.type || '').trim();
    if (!mode) continue;

    const recent = Math.max(0, Number(game.id ? recentPlayCounts.get(game.id) : 0) || 0);
    const total = totalPlays(game);
    const created = createdAt(game);
    const group = modes.get(mode);

    if (!group) {
      modes.set(mode, { recent, total, latest: created, best: game });
      continue;
    }

    group.recent += recent;
    group.total += total;
    group.latest = Math.max(group.latest, created);

    const bestRecent = Math.max(0, Number(group.best.id ? recentPlayCounts.get(group.best.id) : 0) || 0);
    if (recent > bestRecent || (recent === bestRecent && (
      total > totalPlays(group.best) || (total === totalPlays(group.best) && created > createdAt(group.best))
    ))) {
      group.best = game;
    }
  }

  return [...modes.values()]
    .sort((a, b) => b.recent - a.recent || b.total - a.total || b.latest - a.latest)
    .slice(0, Math.max(0, limit))
    .map(group => group.best);
};
