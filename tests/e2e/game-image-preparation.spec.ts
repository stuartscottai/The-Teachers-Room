import { expect, test } from '@playwright/test';

test('prepares healthy images before opening gameplay', async ({ page }) => {
  await page.goto('/test/game-smoke?mode=trivia&prepare=success');
  await expect(page.getByTestId('game-smoke-root')).toBeVisible();
});

test('can continue without unavailable images', async ({ page }) => {
  await page.route('**/test-confirmed-missing-image', (route) => route.fulfill({ status: 404, body: 'Missing' }));
  await page.goto('/test/game-smoke?mode=trivia&prepare=failure');
  await expect(page.getByRole('heading', { name: 'Some images need attention' })).toBeVisible();
  await expect(page.getByText('3 images ready. 1 image is no longer available.')).toBeVisible();
  await page.getByRole('button', { name: 'Continue without them' }).click();
  await expect(page.getByTestId('game-smoke-root')).toBeVisible();
});

test('can leave preparation to replace unavailable images', async ({ page }) => {
  await page.route('**/test-confirmed-missing-image', (route) => route.fulfill({ status: 404, body: 'Missing' }));
  await page.goto('/test/game-smoke?mode=trivia&prepare=failure');
  await expect(page.getByRole('heading', { name: 'Some images need attention' })).toBeVisible();
  await page.getByRole('button', { name: 'Replace images' }).click();
  await expect(page.getByTestId('image-replacement-requested')).toBeVisible();
});

test('automatically recovers a temporary image failure', async ({ page }) => {
  let requestCount = 0;
  await page.route('**/test-transient-image', async (route) => {
    requestCount += 1;
    if (requestCount === 1) {
      await route.abort();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="blue"/></svg>',
    });
  });
  await page.goto('/test/game-smoke?mode=trivia&prepare=temporary');
  await expect(page.getByTestId('game-smoke-root')).toBeVisible();
});

test('offers retry for an unconfirmed loading failure', async ({ page }) => {
  let available = false;
  await page.route('**/test-transient-image', async (route) => {
    if (!available) {
      await route.abort();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="green"/></svg>',
    });
  });
  await page.goto('/test/game-smoke?mode=trivia&prepare=temporary');
  await expect(page.getByText('1 image could not be prepared.')).toBeVisible();
  available = true;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByTestId('game-smoke-root')).toBeVisible();
});
