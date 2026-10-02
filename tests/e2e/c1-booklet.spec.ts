import { expect, test } from '@playwright/test';
import { classBooklets } from '../../data/classBooklets';

test('C1 real content, reading marks, grammar links and local answers persist', async ({ page }) => {
  await page.goto('/class/h3w8nz');
  await expect(page.getByText('Starter · Take it from me', { exact: true })).toBeVisible();
  await expect(page.getByText('Placeholder booklet', { exact: true })).toHaveCount(0);
  await page.locator('#answer-c1-p8-interview-1').fill('My partner has been learning for ten years.');
  await page.locator('#answer-c1-p8-strategy-C').selectOption('3. Asking for more detail or a follow-up question');
  await page.locator('#answer-c1-p8-order-A').fill('2');
  await page.getByRole('button', { name: /^Page 2:/ }).click();
  await expect(page.locator('.class-photo')).toHaveCount(4);
  await page.locator('#answer-c1-p9-photo-1').selectOption('D');
  await page.getByRole('group', { name: '1. Forum gap 1', exact: true }).getByRole('radio', { name: 'was listening', exact: true }).check();
  const passage = page.getByTestId('reading-passage');
  await expect(passage).toContainText('@geographyteachernigel');
  await passage.evaluate(root => {
    const range = document.createRange();
    range.setStart(root.firstChild!.firstChild!, 0); range.setEnd(root.firstChild!.firstChild!, 5);
    const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await page.getByRole('button', { name: 'Highlight', exact: true }).click();
  await page.getByRole('button', { name: 'Grammar reference · 198', exact: true }).click();
  await expect(page.getByText('Textbook page 198', { exact: true })).toBeVisible();
  const gaps = page.locator('section[aria-labelledby="section-c1-ref198-practice-1"]');
  await gaps.getByRole('textbox').nth(3).fill('Have you been doing');
  await expect(gaps.getByRole('textbox').first()).toHaveValue('');
  await page.reload();
  await expect(gaps.getByRole('textbox').nth(3)).toHaveValue('Have you been doing');
  await page.getByRole('button', { name: 'Next →', exact: true }).click();
  await expect(page.getByText('Textbook page 199', { exact: true })).toBeVisible();
  await page.getByRole('group', { name: '1. The last flight this evening … shortly before midnight.', exact: true }).getByRole('radio', { name: 'departs', exact: true }).check();
  await page.getByRole('button', { name: '← Back to lesson', exact: true }).click();
  await expect(page.getByText('Page 2 of 6', { exact: true })).toBeVisible();
  await expect(page.locator('.class-highlight')).toHaveText('Topic');
  await expect(page.locator('#answer-c1-p9-photo-1')).toHaveValue('D');
  await page.getByRole('button', { name: /^Page 3:/ }).click();
  await page.locator('#answer-c1-p10-word-1').selectOption('who’s');
  await page.locator('section[aria-labelledby="section-c1-p10-vocabulary-2"]').getByRole('group').first().getByRole('checkbox', { name: 'A', exact: true }).check();
  await page.locator('#answer-c1-p10-heading-1').selectOption('Selection');
  await page.getByRole('button', { name: 'Read textbook page 11', exact: true }).first().click();
  await expect(page.getByTestId('reading-passage')).toContainText('Verba volant sed scripta manent');
  await page.locator('#answer-c1-p11-words-1').fill('master');
  await page.reload();
  await expect(page.locator('#answer-c1-p11-words-1')).toHaveValue('master');
  await page.getByRole('button', { name: 'Read textbook page 10', exact: true }).click();
  await expect(page.locator('#answer-c1-p10-heading-1')).toHaveValue('Selection');
  await page.getByRole('button', { name: /^Page 1:/ }).click();
  await expect(page.locator('#answer-c1-p8-interview-1')).toHaveValue('My partner has been learning for ten years.');
});

test('C1 multiple-answer exercises, email writing and whole booklet reset', async ({ page }) => {
  await page.goto('/class/h3w8nz');
  await page.getByRole('button', { name: /^Page 5:/ }).click();
  await page.locator('#answer-c1-p12-main-reason-1').selectOption('B. English will improve my job prospects.');
  const options = page.locator('section[aria-labelledby="section-c1-p12-grammar-3"]').getByRole('group').first();
  await options.getByRole('checkbox', { name: 'doing', exact: true }).check();
  await options.getByRole('checkbox', { name: 'going to do', exact: true }).check();
  await expect(page.locator('audio, video')).toHaveCount(0);
  await page.getByRole('button', { name: 'Grammar reference · 199', exact: true }).click();
  await page.locator('section[aria-labelledby="section-c1-ref199-practice-2"]').getByRole('checkbox', { name: 'This sentence is correct' }).nth(4).check();
  await page.getByRole('button', { name: '← Back to lesson', exact: true }).click();
  await page.getByRole('button', { name: /^Page 6:/ }).click();
  await page.getByRole('radio', { name: 'a. richer', exact: true }).check();
  await page.locator('#answer-c1-p13-email').fill('Hello Emma, I would like to improve my pronunciation.');
  await page.reload();
  await expect(page.locator('#answer-c1-p13-email')).toHaveValue('Hello Emma, I would like to improve my pronunciation.');
  await expect(page.getByRole('radio', { name: 'a. richer', exact: true })).toBeChecked();
  await page.getByRole('button', { name: /^Page 5:/ }).click();
  await expect(options.getByRole('checkbox', { name: 'doing', exact: true })).toBeChecked();
  await expect(options.getByRole('checkbox', { name: 'going to do', exact: true })).toBeChecked();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Reset booklet', exact: true }).click();
  await expect(page.getByText('Page 1 of 6', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Page 5:/ }).click();
  await expect(options.getByRole('checkbox', { name: 'doing', exact: true })).not.toBeChecked();
  await page.getByRole('button', { name: /^Page 6:/ }).click();
  await expect(page.locator('#answer-c1-p13-email')).toHaveValue('');
});

test('C1 partial save includes only entered answers with textbook numbers', async ({ page }, testInfo) => {
  await page.goto('/class/h3w8nz');
  await page.locator('#answer-c1-p8-interview-1').fill('Ten years.');
  await page.getByRole('button', { name: /^Page 4:/ }).click();
  await page.locator('#answer-c1-p11-words-1').fill('master');
  await page.getByRole('button', { name: /^Page 6:/ }).click();
  await page.getByRole('radio', { name: 'a. richer', exact: true }).check();
  await page.getByRole('button', { name: /^Reference 198/ }).click();
  const gaps = page.locator('section[aria-labelledby="section-c1-ref198-practice-1"]');
  await gaps.getByRole('textbox').nth(3).fill('Have you been doing');
  await page.evaluate(() => { window.print = () => window.dispatchEvent(new Event('beforeprint')); });
  await page.getByRole('button', { name: 'Save a copy', exact: true }).click();
  await page.emulateMedia({ media: 'print' });
  const copy = page.getByTestId('saved-booklet');
  await expect(copy.locator('article')).toHaveCount(4);
  await expect(copy.locator('.class-answer-row')).toHaveCount(4);
  await expect(copy.getByRole('heading', { name: 'Page 198', exact: true })).toBeVisible();
  await expect(copy).toContainText('Exercise 5 - Find words in the text');
  await expect(copy.locator('.class-answer-row').last()).toContainText('4.Gap 1: Have you been doing');
  await expect(copy).toContainText('a. richer');
  await expect(copy).not.toContainText('Not answered');
  await expect(copy).not.toContainText('Hermann Ebbinghaus');
  await expect(copy.locator('input, textarea, select, svg, button')).toHaveCount(0);
  if (testInfo.project.name === 'chromium') {
    const pdf = await page.pdf({ path: testInfo.outputPath('c1-partial-answers.pdf'), preferCSSPageSize: true });
    expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length).toBe(1);
  }
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(gaps.getByRole('textbox').nth(3)).toHaveValue('Have you been doing');
});

test('C1 lessons, photos and references fit phones, tablets and desktops', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const booklet = classBooklets.find(item => item.level === 'C1')!;
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/class/h3w8nz');
    for (const item of booklet.pages) {
      if (item.reference) await page.getByRole('button', { name: new RegExp(`^Reference ${item.sourcePage}`) }).click();
      else await page.getByRole('button', { name: `Page ${item.sourcePage! - 7}: ${item.title}`, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if ([9, 11, 13, 199].includes(item.sourcePage!)) await page.screenshot({ path: testInfo.outputPath(`c1-${width}-page${item.sourcePage}.png`), fullPage: true });
      if (width === 1280 && item.sourcePage === 9) await page.locator('.class-content-cards').screenshot({ path: testInfo.outputPath('c1-anecdote-photos.png') });
    }
  }
  expect(errors).toEqual([]);
});

test('full C1 answer record fits a compact PDF without losing responses', async ({ page }, testInfo) => {
  const booklet = classBooklets.find(item => item.level === 'C1')!;
  const answers: Record<string, string | string[]> = {};
  for (const item of booklet.pages) for (const exercise of item.sections?.flatMap(section => section.exercises || []) || []) {
    answers[exercise.id] = exercise.kind === 'gaps' ? Array(exercise.prompt.split('{{}}').length - 1).fill('have been working')
      : exercise.options ? exercise.kind === 'checkbox' ? [exercise.options[0]] : exercise.options[0]
      : exercise.id === 'c1-p13-email' ? 'Hello Emma, I would like to tell you about my strengths and weaknesses as a learner. ' + 'I enjoy reading and discussing new ideas with my classmates. '.repeat(16) + 'With best wishes, Alex.'
      : exercise.kind === 'long-text' ? 'I discussed this with my partner.' : 'My answer.';
  }
  await page.addInitScript(({ slug, answers }) => sessionStorage.setItem(`teachers-room:temporary-class:v1:${slug}`, JSON.stringify({ page: 0, answers, marks: {} })), { slug: booklet.slug, answers });
  await page.goto('/class/h3w8nz');
  await expect(page.getByRole('heading', { name: 'C1 Workbook', exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByTestId('saved-booklet').locator('.class-answer-row')).toHaveCount(Object.keys(answers).length);
  if (testInfo.project.name === 'chromium') {
    const pdf = await page.pdf({ path: testInfo.outputPath('c1-full-answers.pdf'), preferCSSPageSize: true });
    const count = pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length || 0;
    expect(count).toBeGreaterThan(0); expect(count).toBeLessThanOrEqual(3);
  }
});
