import { test, expect } from '@playwright/test';

for (const [name, slug] of [['Trivia Quiz', 'trivia'], ['Jeopardy', 'jeopardy'], ['Time Bomb', 'time-bomb'], ['Word Wheel', 'wordwheel'], ['Block Beaters', 'blockbeaters'], ['Live Quiz Challenge', 'live-quiz'], ['Pub Quiz', 'pub-quiz'], ['Survey Showdown', 'survey-showdown'], ['Stop the Fire!', 'stop-the-fire'], ['Millionaire Maker', 'millionaire-maker'], ['Darts', 'darts-challenge'], ['Snakes and Ladders', 'snakes-and-ladders']]) {
  test(`${name} separates information from creation`, async ({ page }) => {
    await page.goto('/games');
    const image = page.getByRole('button', { name: `More info about ${name}`, exact: true });
    const card = page.locator('article').filter({ has: image });
    await expect(card.getByRole('link', { name: 'More info' })).toHaveAttribute('href', `/game-types/${slug}`);
    await card.getByRole('button', { name: 'Create game', exact: true }).click();
    await expect(page.getByText('Create a free account on the Teacher Plan to start creating games.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await image.click();
    await expect(page).toHaveURL(new RegExp(`/game-types/${slug}$`));
  });
}
