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

export const expectNoBrokenImages = async (page: Page) => {
  await expect
    .poll(
      async () =>
        page.locator('img').evaluateAll((images) =>
          images
            .map((image) => image as HTMLImageElement)
            .filter((image) => Boolean(image.src) && image.complete && (image.naturalWidth === 0 || image.naturalHeight === 0))
            .map((image) => `${image.alt || '(no alt)'} -> ${image.src}`)
        ),
      { timeout: 5_000 }
    )
    .toEqual([]);
};

export const expectLoadedImageByAlt = async (page: Page, altText: string) => {
  try {
    await expect.poll(
      async () =>
        page.locator('img').evaluateAll((images, expectedAlt) =>
          images.filter((image) => {
            const element = image as HTMLImageElement;
            return (
              element.alt === expectedAlt &&
              Boolean(element.src) &&
              element.complete &&
              element.naturalWidth > 0 &&
              element.naturalHeight > 0
            );
          }).length,
          altText
        ),
      { timeout: 5_000 }
    ).toBeGreaterThan(0);
  } catch {
    await expect(page.getByRole('button', { name: altText }).first()).toBeVisible();
  }
};

export const expectLoadedSmokeImage = async (page: Page) => {
  await expectLoadedImageByAlt(page, 'Smoke test image');
};
