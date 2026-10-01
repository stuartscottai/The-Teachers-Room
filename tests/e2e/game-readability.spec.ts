import { expect, test } from '@playwright/test';

test('Stop the Fire stays readable and restores zoom when moving to scoring', async ({ page, isMobile }) => {
  await page.addInitScript(() => localStorage.setItem('teachers-room-theme', 'dark'));
  await page.goto('/test/game-smoke?mode=stopfire');
  await expect(page.locator('.stop-fire-surface').first()).toHaveCSS('background-color', 'rgb(34, 39, 46)');
  await expect(page.getByRole('button', { name: 'Start Round' })).toBeVisible();
  await page.getByRole('button', { name: 'Start Round' }).click();
  const categories = page.locator('.stop-fire-raised').filter({ has: page.locator('.font-semibold') });
  await expect(categories.first()).toHaveCSS('background-color', 'rgb(42, 49, 58)');
  await expect(categories.first().locator('.font-semibold')).toHaveCSS('color', 'rgb(239, 243, 248)');
  if (!isMobile) await page.getByRole('button', { name: 'Enlarge question card' }).click();
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.locator('.game-view-zoomed')).toHaveCount(0);
  await page.getByRole('button', { name: 'Yes, Score' }).click();
  await expect(page.getByRole('heading', { name: 'Score Round' })).toBeVisible();
  await expect(page.locator('.game-view-camera')).toHaveCount(0);
  if (!isMobile) {
    await page.getByRole('button', { name: 'Enlarge question card' }).click();
    await expect(page.getByRole('button', { name: 'Close enlarged question card' })).toBeVisible();
    for (let category = 2; category <= 4; category += 1) {
      await page.getByRole('button', { name: 'Next Category' }).click();
      await expect(page.getByText(`Category ${category} of 4. Use 2 (unique), 1 (shared), 0 (invalid).`, { exact: true })).toBeVisible();
      await expect(page.locator('.game-view-zoomed')).toHaveCount(1);
      await expect(page.getByRole('button', { name: 'Close enlarged question card' })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Apply Scores' }).click();
    await expect(page.locator('.game-view-camera')).toHaveCount(0);
  }
});

test('Millionaire uses large fitting question text and an icon inside the question panel', async ({ page, isMobile }) => {
  await page.goto('/test/game-smoke?mode=millionaire');
  await page.getByRole('button', { name: /Let's Play/i }).click();
  const panel = page.locator('.millionaire-question-panel');
  await expect(panel).toBeVisible();
  const text = panel.locator('h2');
  await expect.poll(() => text.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(isMobile ? 22 : 40);
  const fits = await text.evaluate(element => element.scrollWidth <= element.clientWidth + 1);
  expect(fits).toBe(true);
  if (!isMobile) {
    const icon = panel.getByRole('button', { name: 'Enlarge question card' });
    await expect(icon).toBeVisible();
    await icon.click();
    await expect(panel.getByRole('button', { name: 'Close enlarged question card' })).toBeVisible();
    await panel.getByRole('button', { name: 'Close enlarged question card' }).click();
  }
});
