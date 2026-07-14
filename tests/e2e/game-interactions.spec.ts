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
  test.setTimeout(60_000);
  const errors = installErrorGuards(page);

  await page.goto('/test/game-smoke?mode=snakes');
  await expect(page.getByTestId('game-smoke-root')).toHaveAttribute('data-mode', 'snakes');

  await expect(page.locator('.snl-control-panel')).toHaveCSS('background-color', 'rgb(217, 198, 154)');
  await expect(page.getByRole('button', { name: /Start Game/i })).toHaveCSS('background-color', 'rgb(221, 185, 88)');
  await page.getByRole('button', { name: /Start Game/i }).click();
  await expect(page.locator('.snl-panel-label')).toHaveCSS('background-color', 'rgb(34, 35, 30)');
  await page.getByRole('button', { name: /Roll Dice/i }).last().dispatchEvent('click');
  await expect(page.getByText(/Question for/i).first()).toBeVisible({ timeout: 8_000 });
  await expect(page.locator('.snl-question-card-header').first()).toHaveCSS('background-color', 'rgb(31, 32, 27)');
  await expect(page.locator('.snl-question-card-body').first()).toHaveCSS('background-color', 'rgb(233, 218, 178)');
  await expectLoadedSmokeImage(page);
  await page.getByRole('button', { name: /Correct/i }).first().click();
  await expect(page.getByText(/^Correct$/i).first()).toBeVisible();

  expectNoBrowserErrors(errors);
});

test('snakes and ladders setup shows its own selectable bonus orb effects', async ({ page }) => {
  const errors = installErrorGuards(page);

  await page.goto('/test/game-smoke?mode=snakes&setup=1');
  await page.getByRole('button').filter({ hasText: 'Bonus Orbs' }).first().click();

  await expect(page.getByText('Move forward', { exact: true })).toBeVisible();
  await expect(page.getByText('Up to 5 forward or back', { exact: true })).toBeVisible();
  await expect(page.getByText('Swap positions', { exact: true })).toBeVisible();
  await expect(page.getByText('Take another turn', { exact: true })).toBeVisible();
  await expect(page.getByText('Skip next player', { exact: true })).toBeVisible();
  await expect(page.getByText('Move a rival back', { exact: true })).toBeVisible();
  await expect(page.getByText('Send rival down a snake', { exact: true })).toBeVisible();
  await expect(page.getByText('Double points', { exact: true })).toHaveCount(0);

  expectNoBrowserErrors(errors);
});

test('snakes and ladders bonus movement can trigger a ladder after an up-to-five board choice', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = installErrorGuards(page);
  await page.addInitScript(() => {
    Math.random = () => 0.999999;
  });

  await page.goto('/test/game-smoke?mode=snakes&bonuses=1&bonusType=move-five');
  const board = page.locator('.snl-board-webgl');
  await expect(board).toHaveAttribute('data-bonus-orb-count', '15');

  await page.getByRole('button', { name: /Start Game/i }).click();
  await page.getByRole('button', { name: /Roll Dice/i }).last().dispatchEvent('click');
  await expect(page.getByText(/Question for/i).first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /Correct/i }).first().click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await expect(page.getByRole('article', { name: /Bonus card: Choose Your Path/i })).toBeVisible({ timeout: 15_000 });
  await expect(board).toHaveAttribute('data-bonus-orb-count', '14');
  await page.getByRole('button', { name: 'Use card', exact: true }).click();

  await expect(page.getByRole('article', { name: /Bonus card: Choose Your Path/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'See card', exact: true })).toHaveCount(0);
  await expect(page.getByText(/Select a glowing square on the board/i)).toBeVisible();
  await page.getByRole('button', { name: 'Move to square 4', exact: true }).click();
  await expect(page.getByText(/Climbing/i)).toBeVisible({ timeout: 8_000 });
  await expect(page.locator('.snl-score-row').filter({ hasText: 'Team 1' })).toContainText('Square 24', { timeout: 8_000 });
  await expect(page.getByText('Turn Complete', { exact: true })).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText(/^Bonus!/)).toHaveCount(0);

  expectNoBrowserErrors(errors);
});

test('snakes and ladders bonus card uses a readable portrait layout on mobile', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = installErrorGuards(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Math.random = () => 0.999999;
  });

  await page.goto('/test/game-smoke?mode=snakes&bonuses=1&bonusType=move-five');
  await page.getByRole('button', { name: /Start Game/i }).click();
  await page.getByRole('button', { name: /Roll Dice/i }).last().dispatchEvent('click');
  await expect(page.getByText(/Question for/i).first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /Correct/i }).first().click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  const card = page.getByRole('article', { name: /Bonus card: Choose Your Path/i });
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card.getByText(/A shimmering map reveals/i)).toBeVisible();
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height / box!.width).toBeGreaterThan(1.9);
  expect(box!.height / box!.width).toBeLessThan(2.1);

  const titleSize = await card.getByRole('heading', { name: 'Choose Your Path' }).evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).fontSize)
  );
  expect(titleSize).toBeGreaterThanOrEqual(20);
  await card.getByRole('button', { name: 'Use card', exact: true }).click();
  await expect(card).toHaveCount(0);

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
