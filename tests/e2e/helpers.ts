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
  const image = page.getByAltText(altText, { exact: true }).first();
  const accessibleImageButton = page.getByRole('button', { name: altText }).first();

  await expect.poll(
    async () => (await image.count()) + (await accessibleImageButton.count()),
    { timeout: 10_000 }
  ).toBeGreaterThan(0);

  if (await image.count()) {
    await expect(image).toBeVisible({ timeout: 10_000 });
    await expect.poll(
      async () => image.evaluate((element) => {
        const loadedImage = element as HTMLImageElement;
        return Boolean(loadedImage.src) && loadedImage.complete && loadedImage.naturalWidth > 0 && loadedImage.naturalHeight > 0;
      }),
      { timeout: 10_000 }
    ).toBe(true);
    return;
  }

  await expect(accessibleImageButton).toBeVisible({ timeout: 10_000 });
};

export const expectLoadedSmokeImage = async (page: Page) => {
  await expectLoadedImageByAlt(page, 'Smoke test image');
};

export const startSnakesLaddersGame = async (page: Page) => {
  const startButton = page.getByRole('button', { name: /Start Game/i });
  await expect(startButton).toBeVisible({ timeout: 20_000 });
  await expect(startButton).toBeEnabled();

  // On a phone-sized test viewport, the site's sticky header can overlap the
  // button when Playwright scrolls it into view. Dispatching the button event
  // starts the same React handler without introducing that unrelated scroll.
  await startButton.dispatchEvent('click');
  const board = page.locator('.snl-board-webgl');
  await expect(board).toHaveAttribute('data-game-phase', 'roll', { timeout: 20_000 });
  await expect(page.locator('.snl-dice[aria-label="Roll Dice"]')).toHaveCount(1, { timeout: 20_000 });
};

export const rollSnakesLaddersDice = async (page: Page) => {
  const dice = page.locator('.snl-dice[aria-label="Roll Dice"]');
  await expect(dice).toHaveCount(1, { timeout: 20_000 });
  await expect(dice).toBeVisible({ timeout: 20_000 });
  await dice.dispatchEvent('click');

  // Confirm that React received the click before allowing the test to move on.
  // This avoids a false wait for a question when a slow CI runner has only just
  // mounted the graphics-heavy dice area.
  const board = page.locator('.snl-board-webgl');
  await expect.poll(async () => {
    const phase = await board.getAttribute('data-game-phase');
    const rollingDice = await page.locator('.snl-dice[aria-label="Dice rolling"]').count();
    return phase !== 'roll' || rollingDice === 1;
  }, { timeout: 10_000 }).toBe(true);
};
