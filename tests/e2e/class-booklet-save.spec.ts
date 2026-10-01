import { expect, test } from '@playwright/test';

test('saved copy includes every page, chosen answers and reading marks', async ({ page }) => {
  await page.goto('/class/m7q4rx');
  await page.getByLabel('1. Sample answer box', { exact: true }).fill('My saved answer <keep this>');
  await page.getByTestId('reading-passage').evaluate(root => {
    const range = document.createRange();
    range.setStart(root.firstChild!.firstChild!, 0); range.setEnd(root.firstChild!.firstChild!, 24);
    const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await page.getByRole('button', { name: 'Highlight', exact: true }).click();
  await page.getByRole('button', { name: 'Next →' }).click();
  await page.getByRole('radio', { name: 'Option B' }).check();
  await page.getByRole('button', { name: 'Next →' }).click();
  await page.getByLabel('1. Sample dropdown control').selectOption('Option C');
  await page.getByRole('checkbox', { name: 'Option A' }).check();
  await page.getByRole('checkbox', { name: 'Option C' }).check();
  await page.getByRole('button', { name: 'Page 5: Written answers' }).click();
  await page.getByLabel('1. Sample open-answer control').fill('A long answer. '.repeat(100) + 'LAST LINE OF MY ANSWER');
  await page.evaluate(() => { window.print = () => window.dispatchEvent(new Event('beforeprint')); });
  await page.getByRole('button', { name: 'Save a copy', exact: true }).click();
  await page.emulateMedia({ media: 'print' });
  const copy = page.getByTestId('saved-booklet');
  await expect(copy).toBeVisible();
  await expect(copy.locator('article')).toHaveCount(6);
  await expect(copy).toContainText('My saved answer <keep this>');
  await expect(copy).toContainText('LAST LINE OF MY ANSWER');
  await expect(copy).toContainText('Answer: Option B');
  await expect(copy).toContainText('Answer: Option C');
  await expect(copy).toContainText('Answer: Option A; Option C');
  await expect(copy).toContainText('Not answered');
  await expect(copy.locator('.class-highlight')).toHaveText('This is placeholder text');
  await expect(copy.locator('input, textarea, select, button')).toHaveCount(0);
  await expect(page.locator('.class-page-nav')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(copy).toHaveCount(0);
  await expect(page.getByLabel('1. Sample open-answer control')).toHaveValue('A long answer. '.repeat(100) + 'LAST LINE OF MY ANSWER');
  await expect(page.getByText('Page 5 of 6', { exact: true })).toBeVisible();
});

test('B2 print copy includes reference answers, gaps and uncut writing', async ({ page }, testInfo) => {
  await page.goto('/class/v9k2fp');
  await page.getByRole('button', { name: /^Reference 204/ }).click();
  const gaps = page.locator('section[aria-labelledby="section-ref204-practice-1"]');
  await gaps.getByRole('textbox').nth(1).fill('have not finished');
  await page.getByRole('checkbox', { name: 'This sentence is correct' }).first().check();
  await page.getByRole('button', { name: 'Page 6: Grammar & writing · A story' }).click();
  await page.getByLabel('Story. Your story', { exact: true }).fill('While I was walking down the street, I found a small, gold ring on the pavement.\n\n' + 'This is a longer response for checking that the saved copy includes every line. '.repeat(30) + '\nFINAL SAVED STORY LINE');
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  const copy = page.getByTestId('saved-booklet');
  await expect(copy.locator('article')).toHaveCount(8);
  await expect(copy).toContainText('Textbook page 204');
  await expect(copy).toContainText('Textbook page 205');
  await expect(copy).toContainText('FINAL SAVED STORY LINE');
  await expect(copy.locator('section[aria-labelledby="saved-section-ref204-practice-1"] .class-saved-gap').nth(1)).toHaveText('have not finished');
  await expect(copy).toContainText('[x] This sentence is correct');
  await expect(copy.locator('input, textarea, select, button')).toHaveCount(0);
  // Chromium's PDF capture exercises the same print layout as Save as PDF.
  if (testInfo.project.name === 'chromium') {
    await page.pdf({ path: testInfo.outputPath('b2-saved-copy.pdf'), preferCSSPageSize: true, printBackground: true });
  }
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(page.getByText('Page 6 of 6', { exact: true })).toBeVisible();
});
