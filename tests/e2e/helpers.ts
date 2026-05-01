import { expect, type Page } from '@playwright/test';

export const installErrorGuards = (page: Page) => {
  const errors: string[] = [];

  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    errors.push(`console.error: ${message.text()}`);
  });

  return errors;
};

export const expectNoBrowserErrors = (errors: string[]) => {
  expect(errors, errors.join('\n')).toEqual([]);
};

export const expectAtLeastOneLoadedImage = async (page: Page) => {
  await expect.poll(
    async () =>
      page.locator('img').evaluateAll((images) =>
        images.filter((image) => {
          const element = image as HTMLImageElement;
          return Boolean(element.src) && element.complete && element.naturalWidth > 0 && element.naturalHeight > 0;
        }).length
      ),
    { timeout: 5_000 }
  ).toBeGreaterThan(0);
};

export const expectLoadedSmokeImage = async (page: Page) => {
  await expect.poll(
    async () =>
      page.locator('img[alt="Smoke test image"]').evaluateAll((images) =>
        images.filter((image) => {
          const element = image as HTMLImageElement;
          return Boolean(element.src) && element.complete && element.naturalWidth > 0 && element.naturalHeight > 0;
        }).length
      ),
    { timeout: 5_000 }
  ).toBeGreaterThan(0);
};
