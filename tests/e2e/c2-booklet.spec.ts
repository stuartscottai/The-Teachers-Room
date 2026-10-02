import { expect, test, type Locator } from '@playwright/test';
import { classBooklets } from '../../data/classBooklets';

async function selectText(passage: Locator, start: number, end: number) {
  await passage.evaluate((root, offsets) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let node: Node | null, position = 0, started = false;
    while ((node = walker.nextNode())) {
      const size = node.textContent?.length || 0;
      if (!started && offsets.start < position + size) { range.setStart(node, offsets.start - position); started = true; }
      if (started && offsets.end <= position + size) { range.setEnd(node, offsets.end - position); break; }
      position += size;
    }
    const selection = window.getSelection()!;
    selection.removeAllRanges(); selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  }, { start, end });
}

test('C2 real unit, independent phrasal gaps and perfect-tense reference persist', async ({ page }) => {
  await page.goto('/class/t6j5cs');
  await expect(page.getByText('Unit 1 · Ring the changes', { exact: true })).toBeVisible();
  await expect(page.getByText('Placeholder booklet', { exact: true })).toHaveCount(0);
  await page.locator('#answer-c2-p8-changes-1').fill('Moving to a new city changed my life.');
  await page.locator('#answer-c2-p8-speaker-1').selectOption('gaining media attention');
  await page.getByRole('radio', { name: 'b. produce the situation you want', exact: true }).check();
  await page.getByRole('button', { name: /^Page 2:/ }).click();
  await page.locator('#answer-c2-p9-verb-catch').fill('catch up with (2)');
  const gaps = page.locator('section[aria-labelledby="section-c2-p9-vocabulary-5"]').getByRole('textbox');
  await gaps.nth(1).fill('tracked');
  await gaps.nth(2).fill('down');
  await expect(gaps.nth(0)).toHaveValue('');
  await page.getByRole('radio', { name: 'B. providers', exact: true }).check();
  await page.getByRole('button', { name: /^Page 3:/ }).click();
  await page.getByRole('checkbox', { name: 'Perfect tenses', exact: true }).check();
  await page.locator('#answer-c2-p10-corpus-a').fill('Three years ago I went to Germany on a cultural exchange.');
  await page.getByRole('button', { name: 'Grammar reference · 178', exact: true }).click();
  await expect(page.getByText('Textbook page 178', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Future perfect continuous tense', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '← Previous', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Next →', exact: true })).toBeDisabled();
  await page.reload();
  await page.getByRole('button', { name: '← Back to lesson', exact: true }).click();
  await expect(page.getByText('Page 3 of 6', { exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Perfect tenses', exact: true })).toBeChecked();
  await expect(page.locator('#answer-c2-p10-corpus-a')).toHaveValue('Three years ago I went to Germany on a cultural exchange.');
  await page.getByRole('button', { name: /^Page 2:/ }).click();
  await expect(gaps.nth(1)).toHaveValue('tracked');
  await expect(gaps.nth(2)).toHaveValue('down');
  await expect(page.locator('#answer-c2-p9-verb-catch')).toHaveValue('catch up with (2)');
  await page.getByRole('button', { name: /^Page 1:/ }).click();
  await expect(page.locator('#answer-c2-p8-changes-1')).toHaveValue('Moving to a new city changed my life.');
  await expect(page.locator('audio, video')).toHaveCount(0);
});

test('C2 supplied grammar highlights and extract underlines survive removing student marks', async ({ page }) => {
  await page.goto('/class/t6j5cs');
  await page.getByRole('button', { name: /^Page 3:/ }).click();
  const knit = page.locator('section[aria-labelledby="section-c2-p10-knit"]');
  await expect(knit.locator('.class-highlight')).toHaveText(['have exploded', 'has been made by', 'who also operate', 'was created', 'are sold']);
  await selectText(knit.getByTestId('reading-passage'), 0, 12);
  await knit.getByRole('button', { name: 'Highlight', exact: true }).click();
  await expect(knit.locator('.class-highlight').first()).toHaveText('From knitted');
  await selectText(knit.getByTestId('reading-passage'), 0, 12);
  await knit.getByRole('button', { name: 'Remove marks', exact: true }).click();
  await expect(knit.locator('.class-highlight')).toHaveCount(5);
  await page.getByRole('button', { name: /^Page 6:/ }).click();
  const extract1 = page.locator('section[aria-labelledby="section-c2-p13-extract-1"]');
  await expect(extract1.locator('.class-underline')).toHaveText(['social status', 'facial features', 'unconsciously attracted']);
  const extract3 = page.locator('section[aria-labelledby="section-c2-p13-extract-3"]');
  await selectText(extract3.getByTestId('reading-passage'), 0, 11);
  await extract3.getByRole('button', { name: 'Underline', exact: true }).click();
  await expect(extract3.locator('.class-underline')).toHaveText('Rather than');
  await page.reload();
  await expect(extract3.locator('.class-underline')).toHaveText('Rather than');
  await selectText(extract1.getByTestId('reading-passage'), 0, 80);
  await extract1.getByRole('button', { name: 'Remove marks', exact: true }).click();
  await expect(extract1.locator('.class-underline')).toHaveCount(3);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Reset booklet', exact: true }).click();
  await page.getByRole('button', { name: /^Page 6:/ }).click();
  await expect(extract3.locator('.class-underline')).toHaveCount(0);
  await expect(extract1.locator('.class-underline')).toHaveCount(3);
});

test('C2 save keeps only entered answers, lettered questions and partial gap positions', async ({ page }, testInfo) => {
  await page.goto('/class/t6j5cs');
  await page.getByRole('button', { name: /^Page 2:/ }).click();
  const gaps = page.locator('section[aria-labelledby="section-c2-p9-vocabulary-5"]').getByRole('textbox');
  await gaps.nth(2).fill('down');
  await page.getByRole('radio', { name: 'C. energy', exact: true }).check();
  await page.getByRole('button', { name: /^Page 4:/ }).click();
  await page.locator('#answer-c2-p11-innovation-6').fill('be used constantly');
  await page.getByRole('button', { name: /^Page 6:/ }).click();
  const summary = 'Fast food brands shaped changes in American lifestyles and diets over the last fifty years.';
  await page.locator('#answer-c2-p13-summary-3').fill(summary);
  await page.locator('#answer-c2-p13-summary-4').fill('   ');
  await expect(page.locator('section[aria-labelledby="section-c2-p13-writing-6"] .class-word-count').first()).toContainText('15 words');
  await page.evaluate(() => { window.print = () => window.dispatchEvent(new Event('beforeprint')); });
  await page.getByRole('button', { name: 'Save a copy', exact: true }).click();
  await page.emulateMedia({ media: 'print' });
  const copy = page.getByTestId('saved-booklet');
  await expect(copy.locator('article')).toHaveCount(3);
  await expect(copy.locator('.class-answer-row')).toHaveCount(4);
  await expect(copy.getByRole('heading', { name: 'Page 9', exact: true })).toBeVisible();
  await expect(copy).toContainText('Exercise 5 - Complete the phrasal verbs');
  await expect(copy.locator('.class-answer-row').first().locator('dt')).toHaveText('b.');
  await expect(copy).toContainText('Gap 2: down');
  await expect(copy).not.toContainText('Gap 1:');
  await expect(copy).toContainText('C. energy');
  await expect(copy).toContainText(summary);
  await expect(copy).not.toContainText('The ancient Chinese philosophers');
  await expect(copy.getByRole('heading', { name: 'Page 178', exact: true })).toHaveCount(0);
  await expect(copy.locator('input, textarea, select, svg, button, .class-highlight, .class-underline')).toHaveCount(0);
  if (testInfo.project.name === 'chromium') {
    const pdf = await page.pdf({ path: testInfo.outputPath('c2-partial-answers.pdf'), preferCSSPageSize: true });
    expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length).toBe(1);
  }
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(page.locator('#answer-c2-p13-summary-3')).toHaveValue(summary);
});

test('C2 lessons, picture activity and grammar reference fit phone, tablet and desktop', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const booklet = classBooklets.find(item => item.level === 'C2')!;
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/class/t6j5cs');
    for (const item of booklet.pages) {
      if (item.reference) await page.getByRole('button', { name: /^Reference 178/ }).click();
      else await page.getByRole('button', { name: `Page ${item.sourcePage! - 7}: ${item.title}`, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect.poll(() => page.evaluate(() => {
        const indicator = document.querySelector('.class-page-heading .class-eyebrow')!.getBoundingClientRect();
        const navigation = document.querySelector('.class-page-nav')!.getBoundingClientRect();
        return indicator.top >= navigation.bottom;
      })).toBe(true);
      if ([10, 13, 178].includes(item.sourcePage!)) await page.screenshot({ path: testInfo.outputPath(`c2-${width}-page${item.sourcePage}.png`), fullPage: true });
      if (item.sourcePage === 12) {
        await expect(page.locator('.class-photo')).toHaveCount(4);
        if (width === 1280) await page.locator('.class-content-cards').screenshot({ path: testInfo.outputPath('c2-change-photos.png') });
      }
    }
  }
  expect(errors).toEqual([]);
});

test('full C2 answer record remains compact and includes every entered response', async ({ page }, testInfo) => {
  const booklet = classBooklets.find(item => item.level === 'C2')!;
  const answers: Record<string, string | string[]> = {};
  for (const item of booklet.pages) for (const exercise of item.sections?.flatMap(section => section.exercises || []) || []) {
    answers[exercise.id] = exercise.kind === 'gaps' ? Array(exercise.prompt.split('{{}}').length - 1).fill('have been working')
      : exercise.options ? exercise.kind === 'checkbox' ? [exercise.options[0]] : exercise.options[0]
      : exercise.kind === 'long-text' ? 'I discussed this with my partner and noted my answer.' : 'My answer.';
  }
  await page.addInitScript(({ slug, answers }) => sessionStorage.setItem(`teachers-room:temporary-class:v1:${slug}`, JSON.stringify({ page: 0, answers, marks: {} })), { slug: booklet.slug, answers });
  await page.goto('/class/t6j5cs');
  await expect(page.getByRole('heading', { name: 'C2 Workbook', exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByTestId('saved-booklet').locator('.class-answer-row')).toHaveCount(Object.keys(answers).length);
  if (testInfo.project.name === 'chromium') {
    const pdf = await page.pdf({ path: testInfo.outputPath('c2-full-answers.pdf'), preferCSSPageSize: true });
    const count = pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length || 0;
    expect(count).toBeGreaterThan(0); expect(count).toBeLessThanOrEqual(3);
  }
});
