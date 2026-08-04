import { expect, test, type Locator } from '@playwright/test';

const expectInsideViewport = async (locator: Locator) => {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  const viewport = locator.page().viewportSize();
  expect(viewport).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport!.height + 1);
};

test.describe('short laptop viewport responsiveness', () => {
  test.use({ viewport: { width: 1366, height: 600 } });

  test('create-game choice stays below the navigation and inside the screen', async ({ page }) => {
    await page.goto('/test/game-smoke?mode=trivia&modeSelector=1');
    const dialog = page.getByRole('heading', { name: 'Create Trivia' }).locator('..');
    await expect(dialog).toBeVisible();
    await expectInsideViewport(dialog);
    const box = await dialog.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(64);
  });

  test('Sound Lab remains fully usable without being cut off', async ({ page }) => {
    await page.goto('/test/game-smoke?mode=trivia&setup=1');
    await page.getByRole('button', { name: /Configure Sounds/i }).click();
    const heading = page.getByRole('heading', { name: 'Sound Lab' });
    await expect(heading).toBeVisible();
    const modal = heading.locator('..');
    await expectInsideViewport(modal);
    await expect(page.getByRole('button', { name: 'Done' })).toBeVisible();
  });

  test('Word Wheel focal letter and long result text stay inside their containers', async ({ page }) => {
    await page.goto('/test/game-smoke?mode=wordwheel&long=1&fullWheel=1');
    const track = page.getByTestId('word-wheel-track');
    await expect(track).toBeVisible();
    const activeLetter = track.locator('[data-word-wheel-active="true"]');
    await expect(activeLetter).toBeVisible();

    const trackBox = await track.boundingBox();
    const letterBox = await activeLetter.boundingBox();
    expect(trackBox).not.toBeNull();
    expect(letterBox).not.toBeNull();
    expect(letterBox!.y).toBeGreaterThanOrEqual(trackBox!.y - 1);
    expect(letterBox!.y + letterBox!.height).toBeLessThanOrEqual(trackBox!.y + trackBox!.height + 1);
    expect(letterBox!.width).toBeGreaterThanOrEqual(80);

    const letterBoxes = await track.locator(':scope > div').evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      })
    );
    for (const box of letterBoxes) {
      expect(box.left).toBeGreaterThanOrEqual(trackBox!.x - 1);
      expect(box.right).toBeLessThanOrEqual(trackBox!.x + trackBox!.width + 1);
      expect(box.top).toBeGreaterThanOrEqual(trackBox!.y - 1);
      expect(box.bottom).toBeLessThanOrEqual(trackBox!.y + trackBox!.height + 1);
    }

    const activeCenter = letterBox!.x + letterBox!.width / 2;
    const nearbyCenters = await track.locator(':scope > div').evaluateAll((nodes) =>
      nodes
        .map((node) => {
          const box = node.getBoundingClientRect();
          return { active: node.getAttribute('data-word-wheel-active') === 'true', center: box.left + box.width / 2 };
        })
        .filter((item) => !item.active)
        .map((item) => item.center)
    );
    const closestHorizontalGap = Math.min(...nearbyCenters.map((center) => Math.abs(center - activeCenter)));
    expect(closestHorizontalGap).toBeLessThan(letterBox!.width);

    await page.getByRole('button', { name: /^Start$/i }).click();
    await page.getByPlaceholder('Type your answer').fill('Antidisestablishmentarianism and additional classroom context');
    await page.getByRole('button', { name: 'Submit' }).click();
    const answerCard = page.getByTestId('word-wheel-answer-card');
    await expect(answerCard).toBeVisible();
    const dimensions = await answerCard.evaluate((node) => ({
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
    }));
    expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.clientHeight + 1);
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });
});
