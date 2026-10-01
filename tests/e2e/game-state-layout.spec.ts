import { expect, test } from '@playwright/test';

test('Millionaire keeps question size through suspense and answer reveal', async ({ page }) => {
  await page.clock.install();
  await page.goto('/test/game-smoke?mode=millionaire');
  await page.getByRole('button', { name: /Let.s Play/i }).click();
  const question = page.locator('.millionaire-question-panel h2');
  await expect(question).toBeVisible();
  await expect.poll(() => question.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThan(20);
  const initialSize = await question.evaluate(el => getComputedStyle(el).fontSize);
  await page.getByRole('button', { name: /A: Correct/ }).click();
  await expect(question).toHaveCSS('font-size', initialSize);
  await page.clock.fastForward(3100);
  await expect(question).toHaveCSS('font-size', initialSize);
});

test('Stop the Fire restores the scoreboard after scrolled setup', async ({ page, isMobile }) => {
  if (!isMobile) await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto('/test/game-smoke?mode=stopfire');
  const start = page.getByRole('button', { name: 'Start Round' });
  await start.scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await start.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  const scoreboard = page.locator('.team-scoreboard-header');
  await expect(scoreboard).toBeInViewport({ ratio: 1 });
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, Score' }).click();
  await expect(scoreboard).toBeInViewport({ ratio: 1 });
});

test('Stop the Fire winners screen allows scrolling to the standings', async ({ page, isMobile }) => {
  if (!isMobile) await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto('/test/game-smoke?mode=stopfire');
  await page.getByRole('button', { name: 'Start Round' }).click();
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, Score' }).click();
  await page.locator('.stop-fire-raised').getByRole('button', { name: '2', exact: true }).first().click();
  for (let category = 2; category <= 4; category += 1) {
    await page.getByRole('button', { name: 'Next Category' }).click();
    await expect(page.getByText(`Category ${category} of 4. Use 2 (unique), 1 (shared), 0 (invalid).`, { exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Apply Scores' }).click();
  await page.getByRole('button', { name: 'End Game', exact: true }).click();
  await expect(page.getByText('Final score standings', { exact: true })).toBeVisible();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await page.mouse.wheel(0, 1400);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const standings = page.getByRole('heading', { name: 'Final positions' });
  await standings.scrollIntoViewIfNeeded();
  await expect(standings).toBeInViewport();
});

