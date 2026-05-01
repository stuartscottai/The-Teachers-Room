import { expect, test } from '@playwright/test';
import { expectLoadedImageByAlt, expectLoadedSmokeImage, expectNoBrokenImages, expectNoBrowserErrors, installErrorGuards } from './helpers';

test.describe('image health smoke tests', () => {
  test('public shell routes do not render broken images', async ({ page }) => {
    const errors = installErrorGuards(page);

    for (const route of ['/', '/games', '/test']) {
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();
      await expectNoBrokenImages(page);
    }

    expectNoBrowserErrors(errors);
  });

  test('core game question images load after interaction', async ({ page }) => {
    const errors = installErrorGuards(page);

    await page.goto('/test/game-smoke?mode=trivia');
    await page.getByRole('button', { name: /^1$/ }).click();
    await expectLoadedSmokeImage(page);
    await expectNoBrokenImages(page);

    await page.goto('/test/game-smoke?mode=wordwheel');
    await page.getByRole('button', { name: /^Start$/i }).click();
    await expectLoadedSmokeImage(page);
    await expectNoBrokenImages(page);

    await page.goto('/test/game-smoke?mode=snakes');
    await page.getByRole('button', { name: /Start Game/i }).click();
    await page.getByRole('button', { name: /Roll Dice/i }).last().dispatchEvent('click');
    await expect(page.getByText(/Question for/i).first()).toBeVisible({ timeout: 8_000 });
    await expectLoadedSmokeImage(page);
    await expectNoBrokenImages(page);

    expectNoBrowserErrors(errors);
  });

  test('student practice and live quiz fixtures keep their question images healthy', async ({ page }) => {
    const errors = installErrorGuards(page);

    await page.goto('/test/student-practice-smoke');
    await page.getByPlaceholder(/Enter your name/i).fill('Image Tester');
    await page.getByRole('button', { name: /Start Game/i }).click();
    await page.getByRole('button', { name: /^1$/ }).click();
    await expectLoadedImageByAlt(page, 'Student practice smoke image');
    await expectNoBrokenImages(page);

    await page.goto('/test/live-quiz-smoke?mode=teacher');
    await page.getByRole('button', { name: /Start Game/i }).click();
    await expectLoadedImageByAlt(page, 'Live quiz smoke image');
    await expectNoBrokenImages(page);

    await page.goto('/test/live-quiz-smoke?mode=student');
    await page.getByRole('button', { name: /Join Game/i }).click();
    await page.getByRole('button', { name: /Teacher starts question/i }).click();
    await expectLoadedImageByAlt(page, 'Live quiz smoke image');
    await expectNoBrokenImages(page);

    expectNoBrowserErrors(errors);
  });

  test('preview study mode keeps image cards healthy', async ({ page }) => {
    const errors = installErrorGuards(page);

    await page.goto('/test/preview-smoke');
    await page.getByRole('button', { name: /Study Mode/i }).click();
    await expectLoadedImageByAlt(page, 'Preview image for Question 1');
    await expectNoBrokenImages(page);

    expectNoBrowserErrors(errors);
  });
});
