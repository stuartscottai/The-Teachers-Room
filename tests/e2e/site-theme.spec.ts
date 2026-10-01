import { expect, test } from '@playwright/test';

test('saved dark appearance loads across public pages and survives refresh', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('teachers-room-theme', 'dark'));
  await page.goto('/games');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('nav').first()).toHaveCSS('background-color', 'rgb(34, 39, 46)');
  await expect(page.locator('.game-ai-teaser')).toHaveCSS('background-image', 'none');
  await page.goto('/pricing');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('main')).toHaveCSS('background-color', 'rgb(34, 39, 46)');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('dark Games page fits a narrow phone screen', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Phone layout check');
  await page.addInitScript(() => localStorage.setItem('teachers-room-theme', 'dark'));
  await page.goto('/games');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const widths = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport + 1);
});

test('game-type guidance has readable headings and a dark creation choice', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('teachers-room-theme', 'dark'));
  await page.goto('/game-types/time-bomb');
  await expect(page.getByRole('heading', { name: 'Make it your own' })).toHaveCSS('color', 'rgb(239, 243, 248)');
  await expect(page.getByText('Bring along your topic')).toHaveCSS('color', 'rgb(130, 212, 248)');

  await page.goto('/test/game-smoke?mode=trivia&modeSelector=1');
  const aiChoice = page.getByRole('button', { name: /Use AI Assistant/ });
  await aiChoice.hover();
  await expect(aiChoice).toHaveCSS('background-color', 'rgb(56, 50, 36)');
  await expect(aiChoice.getByRole('heading', { name: 'Use AI Assistant' })).toHaveCSS('color', 'rgb(239, 243, 248)');
});

test('a dark-site game can switch to bright play without changing the site, and leaving asks first', async ({ page, isMobile }) => {
  await page.addInitScript(() => localStorage.setItem('teachers-room-theme', 'dark'));
  await page.goto('/test/game-smoke?mode=blockbeaters');
  const scoreboard = page.locator('.team-scoreboard-header');
  await expect(scoreboard).toHaveCSS('background-color', 'rgb(34, 43, 53)');

  await page.getByRole('button', { name: 'Switch game to bright appearance' }).click();
  await expect(scoreboard).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('link', { name: 'Home' }).first().click();
  await expect(page.getByRole('heading', { name: 'Leave game?' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(scoreboard).toBeVisible();
  await page.getByRole('link', { name: 'Home' }).first().click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page).toHaveURL('/');
});

test('a light-site game can switch to dark play without changing the site', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('teachers-room-theme', 'light'));
  await page.goto('/test/game-smoke?mode=blockbeaters');
  const scoreboard = page.locator('.team-scoreboard-header');
  await expect(scoreboard).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.getByRole('button', { name: 'Switch game to dark appearance' }).click();
  await expect(scoreboard).toHaveCSS('background-color', 'rgb(34, 43, 53)');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('Block Beaters setup offers three steals by default and keeps the selected limit', async ({ page }) => {
  await page.goto('/test/game-smoke?mode=blockbeaters&setup=1');
  const limit = page.getByLabel('Steals per team');
  await expect(limit).toHaveValue('3');
  await limit.selectOption('2');
  await page.getByRole('button', { name: 'Start Game' }).click();
  await expect(page.getByRole('status')).toContainText('"blockBeatersStealLimit":2');
});

test('Block Beaters uses the chosen steal count during play', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The full steals panel is shown on larger screens');
  await page.goto('/test/game-smoke?mode=blockbeaters&stealLimit=2');
  await expect(page.getByText('max 2', { exact: true })).toBeVisible();
  await expect(page.getByLabel('2 of 2 steals left')).toHaveCount(2);
});

test('dark game tiles and Block Beaters answer labels stay readable', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => localStorage.setItem('teachers-room-theme', 'dark'));
  for (const mode of ['trivia', 'jeopardy']) {
    await page.goto(`/test/game-smoke?mode=${mode}`);
    const tile = page.locator('[data-game-grid-tile="true"]:not(:disabled)').first();
    await tile.hover();
    await expect(tile).toHaveCSS('color', 'rgb(248, 250, 252)');
  }
  await page.goto('/test/game-smoke?mode=blockbeaters&blockMode=numbers');
  await page.getByRole('button', { name: /^Tile / }).first().click();
  const label = page.locator('[data-option-label="true"]').first();
  await expect(label).toHaveCSS('color', 'rgb(23, 32, 43)');
  await expect(page.locator('[data-game-answer-option="true"]').first()).toHaveCSS('color', 'rgb(241, 245, 249)');
});

test('Sound Lab play controls share the same brand colour', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/test/game-smoke?mode=trivia&setup=1');
  await page.getByRole('button', { name: /Sound Lab|Configure Sounds/i }).first().click();
  const buttons = page.locator('.sound-lab-play');
  await expect(buttons).toHaveCount(6);
  const colours = await buttons.evaluateAll(items => items.map(item => getComputedStyle(item).backgroundColor));
  expect(new Set(colours).size).toBe(1);
});

test('quiz score cards remain inside their headers', async ({ page }) => {
  for (const mode of ['trivia', 'jeopardy', 'blockbeaters', 'pubquiz']) {
    await page.goto(`/test/game-smoke?mode=${mode}&players=4`);
    const header = page.locator(mode === 'pubquiz' ? '.pub-quiz-scoreboard' : '.team-scoreboard-header');
    await expect(header).toBeVisible();
    const boxes = await header.evaluate((element) => {
      const headerBox = element.getBoundingClientRect();
      const cards = [...element.querySelectorAll('button')].filter(button => {
        const box = button.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && /^Team [1-4]/.test(button.textContent?.trim() || '');
      });
      return cards.map(card => {
        const box = card.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom, width: box.width, height: box.height, headerTop: headerBox.top, headerBottom: headerBox.bottom };
      });
    });
    expect(boxes.length).toBe(4);
    for (const box of boxes) {
      expect(box.top).toBeGreaterThanOrEqual(box.headerTop);
      expect(box.bottom).toBeLessThanOrEqual(box.headerBottom + 1);
      expect(box.height).toBeCloseTo(boxes[0].height, 0);
      expect(box.width).toBeCloseTo(boxes[0].width, 0);
    }
  }
});

for (const mode of ['darts', 'wordwheel', 'survey', 'timebomb', 'stopfire']) {
  test(`${mode} team score header keeps every card visible`, async ({ page }) => {
    await page.goto(`/test/game-smoke?mode=${mode}&players=4&lightweight=1`);
    const header = page.locator('[data-scoreboard-header="true"]');
    await expect(header).toBeVisible();
    const boxes = await header.evaluate((element) => {
      const outer = element.getBoundingClientRect();
      return [...element.querySelectorAll('[data-scoreboard-card="true"]')].map(card => {
        const box = card.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom, width: box.width, height: box.height, outerTop: outer.top, outerBottom: outer.bottom };
      });
    });
    expect(boxes.length).toBe(4);
    for (const box of boxes) {
      expect(box.top).toBeGreaterThanOrEqual(box.outerTop);
      expect(box.bottom).toBeLessThanOrEqual(box.outerBottom + 1);
      expect(box.height).toBeCloseTo(boxes[0].height, 0);
      expect(box.width).toBeCloseTo(boxes[0].width, 0);
    }
  });
}
