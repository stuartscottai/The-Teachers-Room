import { test, expect } from '@playwright/test';

test('Pub Quiz page has real images, metadata, usable enlargement and no horizontal overflow', async ({ page }) => {
  await page.goto('/game-types/pub-quiz');
  await expect(page).toHaveTitle(/Pub Quiz Classroom Game for Teachers/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new URL('/game-types/pub-quiz', page.url()).href);
  await expect(page.getByRole('link', { name: 'Create a Pub Quiz game' })).toHaveCount(2);
  const shots = page.locator('figure > button img');
  await expect(shots).toHaveCount(3);
  for (const shot of await shots.all()) {
    await shot.scrollIntoViewIfNeeded();
    await expect.poll(() => shot.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  await page.getByRole('button', { name: /Enlarge screenshot: Pub Quiz question/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close screenshot' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('main details')).toHaveCount(0);
  await expect(page.getByAltText('Pub Quiz round cards and team scores', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('guest creation keeps Pub Quiz selected while asking for an account', async ({ page }) => {
  await page.goto('/game-types/pub-quiz');
  await page.getByRole('link', { name: 'Create a Pub Quiz game' }).first().click();
  await expect(page).toHaveURL(/games\?create=pub-quiz/);
  await expect(page.getByText('Sign in or create an account to make your own Pub Quiz game.', { exact: true })).toBeVisible();
});

test('signed-in creation opens the Pub Quiz creation choices directly', async ({ page }) => {
  // Isolated account fixture: every Supabase request is intercepted, with no live writes.
  await page.route('**/*.supabase.co/**', route => route.fulfill({ json: [] }));
  await page.addInitScript(() => {
    const user = { id: '00000000-0000-4000-8000-000000000009', email: 'pub-quiz-test@example.com', aud: 'authenticated', role: 'authenticated', user_metadata: { full_name: 'Test Teacher', account_type: 'teacher' }, app_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
    localStorage.setItem('sb-xsefgwhywcuzfnawtyru-auth-token', JSON.stringify({ access_token: 'fixture-access-token', refresh_token: 'fixture-refresh-token', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user }));
  });
  await page.goto('/games?create=pub-quiz');
  await expect(page).toHaveURL(/\/games$/);
  await expect(page.getByRole('heading', { name: /Pub Quiz/ })).toBeVisible();
  await expect(page.getByText('Manual', { exact: false }).first()).toBeVisible();
});

