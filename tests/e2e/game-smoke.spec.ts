import { expect, test } from '@playwright/test';
import { expectNoBrowserErrors, installErrorGuards, waitForPageImages } from './helpers';

const gameModes = [
  'trivia',
  'jeopardy',
  'pubquiz',
  'darts',
  'snakes',
  'millionaire',
  'timebomb',
  'survey',
  'stopfire',
  'wordwheel',
] as const;

test.describe('game launch smoke tests', () => {
  for (const mode of gameModes) {
    test(`${mode} renders without browser errors`, async ({ page }) => {
      const errors = installErrorGuards(page);

      await page.goto(`/test/game-smoke?mode=${mode}`);
      await expect(page.getByTestId('game-smoke-root')).toHaveAttribute('data-mode', mode);
      await page.waitForTimeout(1_500);

      expectNoBrowserErrors(errors);
    });
  }
});

test('core public routes render without browser errors', async ({ page }) => {
  const errors = installErrorGuards(page);

  for (const route of ['/', '/games', '/live', '/test']) {
    await page.goto(route);
    await expect(page.locator('body')).toBeVisible();
    await waitForPageImages(page);
  }

  expectNoBrowserErrors(errors);
});
