import { expect, test } from './fixtures';
import { getGameCoverQuery, selectGameCover } from '../../utils/gameCover';
import { GameType, GeneratedGame } from '../../types';

const image = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#0284c7"/><circle cx="350" cy="160" r="100" fill="#facc15"/></svg>';
const items = [1, 2, 3].map(id => ({ id: `pexels:${id}`, url: `/cover-fixture-${id}.svg`, thumbUrl: `/cover-fixture-${id}.svg`,
  alt: `Football stadium ${id}`, provider: 'pexels' as const, width: 640, height: 360, photographer: 'Test photographer', sourcePageUrl: 'https://www.pexels.com/photo/1/' }));
const game: GeneratedGame = { id: 'cover-test', title: 'Premier League Football', config: {
  type: GameType.TRIVIA, topic: 'Football', questionCount: 1, questionType: 'open', isAI: false,
}, questions: [] };

test('selects a stable landscape cover and preserves creator choices', async () => {
  let searches = 0;
  const search = async () => { searches++; return { items: [{ ...items[0], width: 200, height: 400 }, ...items.slice(1)] }; };
  const first = await selectGameCover(game, search);
  const second = await selectGameCover(game, search);
  expect(first).toEqual(second);
  expect(first?.stockId).not.toBe('pexels:1');
  const edited = { ...game, config: { ...game.config, coverImage: { ...first!, selection: 'creator' as const, positionY: 20 } } };
  expect(await selectGameCover(edited, search)).toEqual(edited.config.coverImage);
  expect(searches).toBe(2);
  expect(getGameCoverQuery({ ...game, title: 'Simple Maths calculations', config: { ...game.config, topic: 'Summer holidays' } })).toBe('mathematics numbers');
  expect(getGameCoverQuery({ ...game, title: 'Unit 1', config: { ...game.config, topic: 'General' }, questions: [
    { id: 0, question: 'Which animal lives here?', answer: 'Tiger', isBonus: false, points: 1 },
    { id: 2, question: 'Name this animal.', answer: 'Zebra', isBonus: false, points: 1 },
  ] })).toBe('wildlife animals');
});

test.beforeEach(async ({ page }) => {
  await page.route('**/cover-fixture-*.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: image }));
  await page.route('**/api/stock-images?*', route => route.fulfill({ json: { items, totalHits: 3, page: 1, perPage: 12 } }));
});

test('automatic cover saves independently of question images and survives reload', async ({ page }) => {
  let requests = 0;
  page.on('request', request => { if (request.url().includes('/api/stock-images?')) requests++; });
  await page.goto('/test/game-cover-smoke');
  await expect(page.getByText('Automatically selected for this game.', { exact: false })).toBeVisible();
  const crop = page.getByRole('group', { name: 'Reposition game cover' });
  await expect(crop.locator('img')).toBeVisible();
  await crop.click();
  await page.mouse.wheel(0, -200);
  await expect(crop.locator('img')).not.toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  const box = (await crop.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 15, box.y + box.height / 2 + 10, { steps: 5 });
  await page.mouse.up();
  await page.getByRole('button', { name: 'Save fixture' }).click();
  await expect(page.getByText('Fixture saved')).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('teachersRoomGames')!)[0]);
  expect(stored.config.coverImage.positionY).toBeLessThan(50);
  expect(stored.config.coverImage.positionX).toBeLessThan(50);
  expect(stored.config.coverImage.zoom).toBeGreaterThan(1);
  expect(stored.config.coverImage.selection).toBe('creator');
  expect(stored.questions[0].image.url).toBe('/question-image-unchanged.png');
  await page.reload();
  const position = await page.locator('section[aria-label="Game cover"] img').evaluate(img => getComputedStyle(img).objectPosition.split(' ').map(parseFloat));
  expect(position[0]).toBeCloseTo(stored.config.coverImage.positionX, 3);
  expect(position[1]).toBeCloseTo(stored.config.coverImage.positionY, 3);
  await expect(page.locator('section[aria-label="Game cover"] img')).not.toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  expect(requests).toBe(1);
});

test('creator can search and replace the cover', async ({ page }) => {
  await page.goto('/test/game-cover-smoke');
  await expect(page.getByRole('button', { name: 'Choose another' })).toBeEnabled();
  await page.getByRole('button', { name: 'Choose another' }).click();
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByTitle('Football stadium 2', { exact: true }).filter({ has: page.locator('img') }).click();
  await page.getByRole('button', { name: 'Use Image', exact: true }).click();
  await page.getByRole('button', { name: 'Save fixture' }).click();
  await expect(page.getByText('Fixture saved')).toBeVisible();
  const cover = await page.evaluate(() => JSON.parse(localStorage.getItem('teachersRoomGames')!)[0].config.coverImage);
  expect(cover.stockId).toBe('pexels:2');
  expect(cover.selection).toBe('creator');
});

test('provider failure leaves a usable editor and a designed fallback', async ({ page }) => {
  await page.route('**/api/stock-images?*', route => route.fulfill({ json: { items: [], totalHits: 0 } }));
  await page.goto('/test/game-cover-smoke');
  await expect(page.getByText('No automatic cover is available.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose another' })).toBeEnabled();
  await expect(page.locator('section[aria-label="Game cover"] img')).toHaveCount(0);
});

test('creator can upload a still image and save it', async ({ page }) => {
  await page.goto('/test/game-cover-smoke');
  await expect(page.getByRole('button', { name: 'Upload image', exact: true })).toBeEnabled();
  await page.getByLabel('Upload game cover', { exact: true }).setInputFiles({ name: 'cover.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64') });
  await expect(page.getByAltText('Cover for Premier League Football')).toBeVisible();
  await page.getByRole('button', { name: 'Save fixture' }).click();
  await expect(page.getByText('Fixture saved')).toBeVisible();
  const cover = await page.evaluate(() => JSON.parse(localStorage.getItem('teachersRoomGames')!)[0].config.coverImage);
  expect(cover.source).toBe('upload');
  expect(cover.selection).toBe('creator');
});

test('community covers render without searching and keep mobile layout within the screen', async ({ page }) => {
  let searches = 0;
  page.on('request', request => { if (request.url().includes('/api/stock-images?')) searches++; });
  const coverImage = { source: 'stock', stockId: 'pexels:1', url: items[0].url, alt: 'Football community cover', provider: 'pexels', selection: 'automatic' };
  await page.route('**/rest/v1/rpc/get_game_library_page', route => route.fulfill({ json: { data: [{ id: '00000000-0000-4000-8000-000000000001', title: game.title,
    config: { ...game.config, coverImage }, is_public: true, library_summary: { questionCount: 20, categoryCount: 0, roundCount: 0 }, author_name: 'A Teacher', created_at: '2026-01-01' }], count: 1 } }));
  await page.goto('/games');
  await page.getByRole('tab', { name: 'Community', exact: true }).click();
  await expect(page.getByAltText('Football community cover')).toBeVisible();
  await expect(page.getByRole('heading', { name: game.title })).toBeVisible();
  expect(searches).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});


test('touch pinch zooms and touch drag repositions the cover', async ({ page, isMobile, browserName }) => {
  test.skip(!isMobile || browserName !== 'chromium', 'Real touch gestures use Chromium mobile');
  await page.goto('/test/game-cover-smoke');
  const crop = page.getByRole('group', { name: 'Reposition game cover' });
  await expect(crop.locator('img')).toBeVisible();
  const box = (await crop.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const client = await page.context().newCDPSession(page);
  const touch = (type: string, points: {x:number;y:number;id:number}[]) => client.send('Input.dispatchTouchEvent', { type: type as 'touchStart', touchPoints: points });
  await touch('touchStart', [{x,y,id:0}]);
  await touch('touchEnd', []);
  await expect(crop).toHaveCSS('touch-action', 'none');
  await touch('touchStart', [{x:x-25,y,id:0},{x:x+25,y,id:1}]);
  await touch('touchMove', [{x:x-50,y,id:0},{x:x+50,y,id:1}]);
  await touch('touchEnd', []);
  await expect(crop.locator('img')).not.toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await touch('touchStart', [{x,y,id:0}]);
  await touch('touchMove', [{x:x+20,y:y+10,id:0}]);
  await touch('touchEnd', []);
  await page.getByRole('button', { name: 'Save fixture' }).click();
  await expect(page.getByText('Fixture saved')).toBeVisible();
  const cover = await page.evaluate(() => JSON.parse(localStorage.getItem('teachersRoomGames')!)[0].config.coverImage);
  expect(cover.zoom).toBeGreaterThan(1);
  expect(cover.positionX).toBeLessThan(50);
  expect(cover.positionY).toBeLessThan(50);
});

for (const scope of ['community', 'own'] as const) {
  test(`${scope} library pages use summaries and load full content only on opening`, async ({ page }) => {
    const userId = '00000000-0000-4000-8000-000000000009';
    const gameId = '00000000-0000-4000-8000-000000000001';
    const requests: any[] = [];
    let fullLoads = 0;
    const authUser = { id: userId, email: 'teacher@example.test', aud: 'authenticated', role: 'authenticated', user_metadata: { full_name: 'Teacher', account_type: 'teacher' }, app_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
    await page.addInitScript(user => {
      localStorage.setItem('sb-xsefgwhywcuzfnawtyru-auth-token', JSON.stringify({ access_token: 'fixture-access-token', refresh_token: 'fixture-refresh-token', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user }));
    }, authUser);
    await page.route('**/auth/v1/user', route => route.fulfill({ json: authUser }));
    await page.route('**/rest/v1/rpc/get_game_library_page', route => {
      const args = route.request().postDataJSON();
      requests.push(args);
      const title = args.p_page === 2 ? 'Second page game' : 'Summary game';
      return route.fulfill({ json: { count: 11, data: [{ id: gameId, title, user_id: userId, author_name: 'Teacher', play_count: 5, created_at: '2026-01-01', is_public: scope === 'community', config: { type: 'Trivia Quiz', topic: 'Science', questionType: 'multiple-choice', isAI: false }, library_summary: { questionCount: 20, categoryCount: 0, roundCount: 0 } }] } });
    });
    await page.route('**/rest/v1/saved_games?*', route => {
      fullLoads++;
      const query = new URL(route.request().url()).searchParams;
      expect(query.get('id')).toBe(`eq.${gameId}`);
      expect(query.get(scope === 'own' ? 'user_id' : 'is_public')).toBe(scope === 'own' ? `eq.${userId}` : 'eq.true');
      return route.fulfill({ json: { id: gameId, title: 'Loaded full game', user_id: userId, created_at: '2026-01-01', config: { type: 'Trivia Quiz', topic: 'Science', questionType: 'multiple-choice', isAI: false }, questions: [{ question: 'Full question loaded on demand', answer: 'Earth', options: ['Earth', 'Mars'] }] } });
    });
    await page.goto('/games');
    await page.getByRole('tab', { name: scope === 'community' ? 'Community' : /My Library/, exact: scope === 'community' }).click();
    await expect(page.getByRole('heading', { name: 'Summary game', exact: true })).toBeVisible();
    await expect(page.getByText('20 Qs', { exact: true })).toBeVisible();
    expect(fullLoads).toBe(0);
    expect(requests.at(-1)).toMatchObject({ p_scope: scope, p_page: 1, p_limit: 10 });
    // The top and bottom pagination rows share the same next-page action.
    await page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') }).first().click();
    await expect(page.getByRole('heading', { name: 'Second page game', exact: true })).toBeVisible();
    expect(requests.at(-1)).toMatchObject({ p_scope: scope, p_page: 2, p_limit: 10 });
    expect(fullLoads).toBe(0);
    if (scope === 'community') await page.getByRole('button', { name: 'Preview', exact: true }).click();
    else await page.getByRole('heading', { name: 'Second page game', exact: true }).click();
    await expect(page.getByText('Loaded full game', { exact: true }).first()).toBeVisible();
    expect(fullLoads).toBe(1);
  });
}
