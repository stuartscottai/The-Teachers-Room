import { expect, test } from '@playwright/test';
import { classBooklets } from '../../data/classBooklets';

test('saved copy includes only entered answers and keeps the live workbook unchanged', async ({ page }) => {
  await page.goto('/class/t6j5cs');
  await page.locator('#answer-c2-p8-changes-1').fill('My saved answer <keep this>');
  await page.getByRole('button', { name: /^Page 2:/ }).click();
  await page.getByTestId('reading-passage').evaluate(root => {
    const range = document.createRange();
    range.setStart(root.firstChild!.firstChild!, 0); range.setEnd(root.firstChild!.firstChild!, 24);
    const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await page.getByRole('button', { name: 'Highlight', exact: true }).click();
  await page.getByRole('radio', { name: 'B. providers', exact: true }).check();
  await page.locator('section[aria-labelledby="section-c2-p9-vocabulary-5"]').getByRole('textbox').nth(2).fill('down');
  await page.getByRole('button', { name: 'Next →' }).click();
  await page.getByRole('checkbox', { name: 'Modal verbs', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Passives', exact: true }).check();
  await page.getByRole('button', { name: /^Page 6:/ }).click();
  await page.locator('#answer-c2-p13-summary-3').fill('A long answer. '.repeat(100) + 'LAST LINE OF MY ANSWER');
  await page.evaluate(() => { window.print = () => window.dispatchEvent(new Event('beforeprint')); });
  await page.getByRole('button', { name: 'Save a copy', exact: true }).click();
  await page.emulateMedia({ media: 'print' });
  const copy = page.getByTestId('saved-booklet');
  await expect(copy).toBeVisible();
  await expect(copy.locator('article')).toHaveCount(4);
  await expect(copy).toContainText('My saved answer <keep this>');
  await expect(copy).toContainText('LAST LINE OF MY ANSWER');
  await expect(copy).toContainText('B. providers');
  await expect(copy).toContainText('Gap 2: down');
  await expect(copy).not.toContainText('Gap 1:');
  await expect(copy).toContainText('Modal verbs; Passives');
  await expect(copy).not.toContainText('Not answered');
  await expect(copy.getByRole('heading', { name: 'Page 11', exact: true })).toHaveCount(0);
  await expect(copy.getByRole('heading', { name: 'Page 12', exact: true })).toHaveCount(0);
  await expect(copy).not.toContainText('Uncountable nouns');
  await expect(copy.locator('.class-highlight')).toHaveCount(0);
  await expect(copy).not.toContainText('The ancient Chinese philosophers');
  await expect(copy.locator('input, textarea, select, button')).toHaveCount(0);
  await expect(page.locator('.class-page-nav')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(copy).toHaveCount(0);
  await expect(page.locator('#answer-c2-p13-summary-3')).toHaveValue('A long answer. '.repeat(100) + 'LAST LINE OF MY ANSWER');
  await expect(page.getByText('Page 6 of 6', { exact: true })).toBeVisible();
});

test('B2 answer record skips unanswered pages and gaps, retaining reference numbers and writing', async ({ page }, testInfo) => {
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
  await expect(copy.locator('article')).toHaveCount(2);
  await expect(copy.getByRole('heading', { name: 'Page 204', exact: true })).toBeVisible();
  await expect(copy.getByRole('heading', { name: 'Page 205', exact: true })).toHaveCount(0);
  await expect(copy).toContainText('FINAL SAVED STORY LINE');
  await expect(copy).toContainText('Gap 2: have not finished');
  await expect(copy).not.toContainText('Gap 1:');
  await expect(copy).not.toContainText('Not answered');
  await expect(copy).not.toContainText('The surgeon has just finished');
  await expect(copy).toContainText('Exercise 1 - Practice');
  await expect(copy).toContainText('This sentence is correct');
  await expect(copy.locator('input, textarea, select, button')).toHaveCount(0);
  // Chromium's PDF capture exercises the same print layout as Save as PDF.
  if (testInfo.project.name === 'chromium') {
    await page.pdf({ path: testInfo.outputPath('b2-saved-copy.pdf'), preferCSSPageSize: true, printBackground: true });
  }
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(page.getByText('Page 6 of 6', { exact: true })).toBeVisible();
});


test('a full B2 answer record has compact layout with no missing answers', async ({ page }, testInfo) => {
  const booklet = classBooklets.find(item => item.level === 'B2')!;
  const answers: Record<string, string | string[]> = {};
  for (const item of booklet.pages) {
    for (const exercise of [...item.exercises, ...(item.sections?.flatMap(section => section.exercises || []) || [])]) {
      answers[exercise.id] = exercise.kind === 'gaps'
        ? Array(exercise.prompt.split('{{}}').length - 1).fill('have been working')
        : exercise.options ? (exercise.kind === 'checkbox' ? [exercise.options[0]] : exercise.options[0])
        : exercise.id === 'p13-story' ? 'While I was walking down the street, I found a small, gold ring on the pavement. ' + 'I looked around and decided to ask my neighbour for help. '.repeat(12)
        : exercise.kind === 'long-text' ? 'I discussed this with my partner during the lesson.' : 'My answer for this question.';
    }
  }
  // Include whitespace-only work to ensure it is treated as unanswered.
  answers['p8-sort-2'] = '   ';
  await page.addInitScript(({ slug, answers }) => sessionStorage.setItem(`teachers-room:temporary-class:v1:${slug}`, JSON.stringify({ page: 0, answers, marks: {} })), { slug: booklet.slug, answers });
  await page.goto('/class/v9k2fp');
  await expect(page.getByRole('heading', { name: 'B2 Workbook', exact: true })).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  const copy = page.getByTestId('saved-booklet');
  await expect(copy.locator('article')).toHaveCount(8);
  await expect(copy.locator('.class-answer-row')).toHaveCount(Object.keys(answers).length - 1);
  await expect(copy).not.toContainText('No answers entered yet');
  await expect(copy.locator('.class-answer-row').first().locator('dt')).toHaveText('3.');
  if (testInfo.project.name === 'chromium') {
    const pdf = await page.pdf({ path: testInfo.outputPath('b2-full-answers.pdf'), preferCSSPageSize: true, printBackground: true });
    // Chromium writes an explicit /Page dictionary for each physical PDF page.
    const pageCount = pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length || 0;
    expect(pageCount).toBeGreaterThan(0);
    expect(pageCount).toBeLessThanOrEqual(3);
  }
});
