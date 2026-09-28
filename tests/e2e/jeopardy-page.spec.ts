import { test, expect } from '@playwright/test';

test('Jeopardy page has real images, metadata, usable enlargement and no horizontal overflow', async ({ page }) => {
  await page.goto('/game-types/jeopardy');
  await expect(page).toHaveTitle(/Classroom Jeopardy Game for Teachers/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new URL('/game-types/jeopardy', page.url()).href);
  await expect(page.getByRole('link', { name: 'Create a Jeopardy game' })).toHaveCount(2);
  const shots = page.locator('figure > button img');
  await expect(shots).toHaveCount(3);
  for (const shot of await shots.all()) {
    await shot.scrollIntoViewIfNeeded();
    await expect.poll(() => shot.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  await page.getByRole('button', { name: /Enlarge screenshot: Jeopardy geography question/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close screenshot' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('main details')).toHaveCount(0);
  await expect(page.getByAltText('Head-on 3D illustration', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('guest creation keeps Jeopardy selected while asking for an account', async ({ page }) => {
  await page.goto('/game-types/jeopardy');
  await page.getByRole('link', { name: 'Create a Jeopardy game' }).first().click();
  await expect(page).toHaveURL(/games\?create=jeopardy/);
  await expect(page.getByText('Sign in or create an account to make your own Jeopardy game.', { exact: true })).toBeVisible();
});

test('signed-in creation opens the Jeopardy creation choices directly', async ({ page }) => {
  // Isolated account fixture: every Supabase request is intercepted, with no live writes.
  await page.route('**/*.supabase.co/**', route => route.fulfill({ json: [] }));
  await page.addInitScript(() => {
    const user = { id: '00000000-0000-4000-8000-000000000009', email: 'jeopardy-test@example.com', aud: 'authenticated', role: 'authenticated', user_metadata: { full_name: 'Test Teacher', account_type: 'teacher' }, app_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
    localStorage.setItem('sb-xsefgwhywcuzfnawtyru-auth-token', JSON.stringify({ access_token: 'fixture-access-token', refresh_token: 'fixture-refresh-token', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user }));
  });
  await page.goto('/games?create=jeopardy');
  await expect(page).toHaveURL(/\/games$/);
  await expect(page.getByRole('heading', { name: /Jeopardy/ })).toBeVisible();
  await expect(page.getByText('Manual', { exact: false }).first()).toBeVisible();
});

