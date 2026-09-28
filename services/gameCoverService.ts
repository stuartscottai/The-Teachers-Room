import type { GeneratedGame, GameCoverImage } from '../types';
import { searchStockImages } from './stockImageService';
import { selectGameCover } from '../utils/gameCover';
import { buildCoverBrief, parseCoverSearchPlans } from '../utils/gameCoverBrief';
import { supabase } from './supabase';

const pending = new Map<string, Promise<GameCoverImage | undefined>>();
const sessionSelections = new Set<string>();
const chooseCover = async (game: GeneratedGame): Promise<GameCoverImage | undefined> => {
  const brief = buildCoverBrief(game);
  const usageCounts = new Map<string, number>();
  const usageController = new AbortController();
  const usageTimeout = setTimeout(() => usageController.abort(), 4000);
  try {
    const { data } = await supabase.from('saved_games').select('id,cover:config->coverImage')
      .eq('is_public', true).order('created_at', { ascending: false }).limit(500).abortSignal(usageController.signal);
    for (const row of data || []) {
      const id = (row.cover as any)?.stockId;
      if (id && row.id !== game.id) usageCounts.set(id, (usageCounts.get(id) || 0) + 1);
    }
  } catch { /* Cover search remains available during a library outage. */ }
  finally { clearTimeout(usageTimeout); }

  let plan;
  const themeController = new AbortController();
  const themeTimeout = setTimeout(() => themeController.abort(), 15000);
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      const response = await fetch('/api/generate', { method: 'POST', signal: themeController.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ action: 'game-cover', coverBrief: brief }),
      });
      if (response.ok) {
        const result = await response.json();
        plan = parseCoverSearchPlans(JSON.stringify({ plans: [result.plan] }), [brief])[0];
      }
    }
  } catch { /* Guests and temporary AI failures use content-based fallback queries. */ }
  finally { clearTimeout(themeTimeout); }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    for (const id of sessionSelections) usageCounts.set(id, (usageCounts.get(id) || 0) + 1);
    const image = await selectGameCover(game, query => searchStockImages(query, { perPage: 40, signal: controller.signal }),
      { queries: plan?.queries, theme: plan?.theme, usageCounts });
    if (image?.stockId) sessionSelections.add(image.stockId);
    if (sessionSelections.size > 500) sessionSelections.delete(sessionSelections.values().next().value!);
    return image;
  } finally { clearTimeout(timeout); }
};

export const ensureGameCover = async (game: GeneratedGame): Promise<GameCoverImage | undefined> => {
  if (game.config.coverImage) return game.config.coverImage;
  const key = JSON.stringify(buildCoverBrief(game));
  if (!pending.has(key)) {
    const request = chooseCover(game).catch(() => undefined);
    pending.set(key, request);
    // Bound memory; retain results for the editor/save handoff, not indefinitely.
    if (pending.size > 100) pending.delete(pending.keys().next().value!);
  }
  return pending.get(key)!;
};
