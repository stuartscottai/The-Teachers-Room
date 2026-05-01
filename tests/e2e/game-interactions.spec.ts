import { expect, test } from '@playwright/test';
import { expectLoadedSmokeImage, expectNoBrowserErrors, installErrorGuards } from './helpers';

test('trivia answer flow shows feedback and keeps image loaded', async ({ page }) => {
  const errors = installErrorGuards(page);

  await page.goto('/test/game-smoke?mode=trivia');
  await expect(page.getByTestId('game-smoke-root')).toHaveAttribute('data-mode', 'trivia');

  await page.getByRole('button', { name: /^1$/ }).click();
  await expectLoadedSmokeImage(page);
  await page.getByRole('button', { name: /Correct/i }).first().click();
  await expect(page.getByText(/Correct!/i).first()).toBeVisible();

  expectNoBrowserErrors(errors);
});

test('word wheel opens a clue, renders its image, and accepts a correct answer', async ({ page }) => {
  const errors = installErrorGuards(page);

  await page.goto('/test/game-smoke?mode=wordwheel');
  await expect(page.getByTestId('game-smoke-root')).toHaveAttribute('data-mode', 'wordwheel');

  await page.getByRole('button', { name: /^Start$/i }).click();
  await expect(page.getByPlaceholder(/Type your answer/i)).toBeVisible();
  await expectLoadedSmokeImage(page);
  await page.getByPlaceholder(/Type your answer/i).fill('Apple');
  await page.getByRole('button', { name: /^Submit$/i }).click();
  await expect(page.getByText(/^Correct$/i).first()).toBeVisible();

  expectNoBrowserErrors(errors);
});

test('snakes and ladders starts, rolls, and shows a question image', async ({ page }) => {
  const errors = installErrorGuards(page);

  await page.goto('/test/game-smoke?mode=snakes');
  await expect(page.getByTestId('game-smoke-root')).toHaveAttribute('data-mode', 'snakes');

  await page.getByRole('button', { name: /Start Game/i }).click();
  await page.getByLabel('Roll Dice').click({ force: true });
  await expect(page.getByText(/Question for/i).first()).toBeVisible({ timeout: 8_000 });
  await expectLoadedSmokeImage(page);
  await page.getByRole('button', { name: /Correct/i }).first().click();
  await expect(page.getByText(/^Correct$/i).first()).toBeVisible();

  expectNoBrowserErrors(errors);
});

test('millionaire answer selection renders image and advances feedback state', async ({ page }) => {
  const errors = installErrorGuards(page);

  await page.goto('/test/game-smoke?mode=millionaire');
  await expect(page.getByTestId('game-smoke-root')).toHaveAttribute('data-mode', 'millionaire');

  await page.getByRole('button', { name: /Let's Play/i }).click();
  await expectLoadedSmokeImage(page);
  await page.getByRole('button', { name: /Correct/i }).first().click();
  await page.waitForTimeout(2_000);

  expectNoBrowserErrors(errors);
});

test('survey showdown accepts an answer and reveals a board item', async ({ page }) => {
  const errors = installErrorGuards(page);

  await page.goto('/test/game-smoke?mode=survey');
  await expect(page.getByTestId('game-smoke-root')).toHaveAttribute('data-mode', 'survey');
  await expectLoadedSmokeImage(page);

  await page.getByPlaceholder(/TYPE ANSWER/i).fill('Correct');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Correct').first()).toBeVisible();

  expectNoBrowserErrors(errors);
});
