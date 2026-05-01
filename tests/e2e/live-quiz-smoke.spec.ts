import { expect, test } from '@playwright/test';
import { expectNoBrowserErrors, installErrorGuards } from './helpers';

test('live quiz teacher fixture flows from lobby to final positions', async ({ page }) => {
  const errors = installErrorGuards(page);

  await page.goto('/test/live-quiz-smoke?mode=teacher');
  await expect(page.getByText('Code SMOKE1')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Waiting for players/i })).toBeVisible();
  await page.getByRole('button', { name: /Start Game/i }).click();

  await expect(page.getByRole('heading', { name: /Which answer is correct/i })).toBeVisible();
  await expect(page.getByAltText('Live quiz smoke image')).toBeVisible();
  await expect(page.getByText('2/2 answered')).toBeVisible();
  await page.getByRole('button', { name: /Reveal Answer/i }).click();

  await expect(page.getByText(/Round complete/i)).toBeVisible();
  await page.getByRole('button', { name: /Show Leaderboard/i }).click();
  await expect(page.getByRole('heading', { name: /Leaderboard/i })).toBeVisible();
  await expect(page.getByText(/Team 2/i).first()).toBeVisible();
  await page.getByRole('button', { name: /Final Podium/i }).click();

  await expect(page.getByRole('heading', { name: /Team 2 wins/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Final positions/i })).toBeVisible();

  expectNoBrowserErrors(errors);
});

test('live quiz student fixture joins, answers, sees leaderboard and final standings', async ({ page }) => {
  const errors = installErrorGuards(page);

  await page.goto('/test/live-quiz-smoke?mode=student');
  await expect(page.getByRole('heading', { name: /Join smoke quiz/i })).toBeVisible();
  await page.getByRole('button', { name: /Join Game/i }).click();

  await expect(page.getByRole('heading', { name: /You are in/i })).toBeVisible();
  await page.getByRole('button', { name: /Teacher starts question/i }).click();
  await expect(page.getByAltText('Live quiz smoke image')).toBeVisible();
  await page.getByRole('button', { name: /^Correct$/i }).click();
  await page.getByRole('button', { name: /Submit answer/i }).click();

  await expect(page.getByRole('heading', { name: /^Correct$/i })).toBeVisible();
  await page.getByRole('button', { name: /Show leaderboard/i }).click();
  await expect(page.getByRole('heading', { name: /You are #1/i })).toBeVisible();
  await page.getByRole('button', { name: /Finish Game/i }).click();

  await expect(page.getByRole('heading', { name: /Final standings/i })).toBeVisible();
  await expect(page.getByText(/Rank #1/i)).toBeVisible();
  await expect(page.getByText(/All participants/i)).toBeVisible();

  expectNoBrowserErrors(errors);
});

test('live quiz disconnected and removed player screens render CTAs', async ({ page }) => {
  const errors = installErrorGuards(page);

  await page.goto('/test/live-quiz-smoke?mode=disconnected');
  await expect(page.getByRole('heading', { name: /Teacher disconnected/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Go to homepage/i })).toBeVisible();

  await page.goto('/test/live-quiz-smoke?mode=removed');
  await expect(page.getByRole('heading', { name: /You have been removed/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Go to homepage/i })).toBeVisible();

  expectNoBrowserErrors(errors);
});
