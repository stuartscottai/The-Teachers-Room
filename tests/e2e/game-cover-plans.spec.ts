import { expect, test } from '@playwright/test';
import { buildCoverBrief, coverSearchPlanParams, parseCoverSearchPlans } from '../../utils/gameCoverBrief';
import { selectGameCover, getGameCoverQuery } from '../../utils/gameCover';
import { GameType, GeneratedGame } from '../../types';

const game: GeneratedGame = { id: 'topic-test', title: 'B2 Food revision', config: {
  type: GameType.TRIVIA, topic: 'English', isAI: false, questionCount: 30, questionType: 'open',
}, questions: Array.from({ length: 30 }, (_, id) => ({ id, question: `Food question ${id}`, answer: 'Apple', points: 1, isBonus: false })) };
const photo = (id: string) => ({ id, url: `/test-${id}.png`, thumbUrl: `/test-${id}.png`, alt: 'Market vegetables', width: 900, height: 600 });

test('cover briefing samples the game and excludes files and image contents', () => {
  const brief = buildCoverBrief({ ...game, config: { ...game.config, files: [{ name: 'private.pdf', mimeType: 'application/pdf', data: 'PRIVATE-FILE-BYTES' }] } });
  expect(brief.samples).toHaveLength(10);
  expect(brief.samples[9].question).toBe('Food question 27');
  expect(JSON.stringify(brief)).not.toContain('PRIVATE-FILE-BYTES');
  expect(getGameCoverQuery(game)).toBe('colourful food');
  expect(coverSearchPlanParams([brief]).config.systemInstruction).toContain('NOT visual subjects');
});

test('query plans validate keys and bound AI output before stock search', () => {
  const brief = buildCoverBrief(game);
  const plans = parseCoverSearchPlans(JSON.stringify({ plans: [
    { key: 'unknown-game', queries: ['wrong game'] },
    { key: game.id, theme: 'Food and markets', queries: ['Fresh vegetables', 'fresh vegetables', 'Market stalls', 'x', 'one two three four five six seven eight'] },
  ] }), [brief]);
  expect(plans).toEqual([{ key: game.id, theme: 'Food and markets', queries: ['fresh vegetables', 'market stalls'] }]);
  expect(parseCoverSearchPlans('not valid json', [brief])).toEqual([]);
});

test('tries another relevant scene when all first-query images are used', async () => {
  const calls: string[] = [];
  const cover = await selectGameCover(game, async query => {
    calls.push(query); return { items: query === 'fresh vegetables' ? [photo('used')] : [photo('unused')] };
  }, { queries: ['fresh vegetables', 'market stalls'], theme: 'Food markets', usageCounts: new Map([['used', 4]]) });
  expect(calls).toEqual(['fresh vegetables', 'market stalls']);
  expect(cover?.stockId).toBe('unused');
  expect(cover?.visualTheme).toBe('Food markets');
  expect(cover?.selectionVersion).toBe(2);
});

test('uses the wider pool and prefers the least-used relevant image when necessary', async () => {
  const photos = Array.from({ length: 40 }, (_, i) => photo(`photo-${i}`));
  const counts = new Map(photos.slice(0, 39).map(p => [p.id, 3]));
  expect((await selectGameCover(game, async () => ({ items: photos }), { usageCounts: counts }))?.stockId).toBe('photo-39');
  counts.set('photo-39', 1);
  expect((await selectGameCover(game, async () => ({ items: photos }), { usageCounts: counts }))?.stockId).toBe('photo-39');
});

test('running stories exclude motor racing and prefer photos to clip art', async () => {
  const running = { ...game, title: "Raymond's Run" };
  const cover = await selectGameCover(running, async () => ({ items: [
    { ...photo('motorbike'), kind: 'photo' as const, alt: 'Motocross race on a dirt track' },
    { ...photo('car'), kind: 'photo' as const, alt: 'car race' },
    { ...photo('clipart'), kind: 'vector' as const, alt: 'Athletic running track illustration' },
    { ...photo('runners'), kind: 'photo' as const, alt: 'Young runners on a running track' },
  ] }), { queries: ['neighborhood track race'] });
  expect(cover?.stockId).toBe('runners');
});

test('signed-in cover selection uses AI themes and avoids community image IDs', async ({ page }) => {
  await page.route('**/api/generate', route => route.fulfill({ json: { plan: {
    key: game.id, theme: 'A food market', queries: ['fresh vegetables', 'market stalls'],
  } } }));
  await page.route('**/rest/v1/saved_games?*', route => route.fulfill({ json: [{ id: 'another-game', cover: { stockId: 'used' } }] }));
  await page.route('**/api/stock-images?*', route => {
    expect(new URL(route.request().url()).searchParams.get('q')).toBe('fresh vegetables');
    expect(new URL(route.request().url()).searchParams.get('perPage')).toBe('40');
    return route.fulfill({ json: { items: [photo('used'), photo('new')], totalHits: 2, page: 1, perPage: 40 } });
  });
  await page.goto('/games');
  const result = await page.evaluate(async fixture => {
    // Vite serves source modules in this development-only test.
    const authModule = '/services/supabase.ts';
    const coverModule = '/services/gameCoverService.ts';
    const { supabase } = await import(/* @vite-ignore */ authModule);
    const previous = supabase.auth.getSession;
    supabase.auth.getSession = async () => ({ data: { session: { access_token: 'test-token' } }, error: null });
    try {
      const { ensureGameCover } = await import(/* @vite-ignore */ coverModule);
      return await ensureGameCover(fixture);
    } finally { supabase.auth.getSession = previous; }
  }, game);
  expect(result?.stockId).toBe('new');
  expect(result?.visualTheme).toBe('A food market');
});
