import { expect, test } from '@playwright/test';
import { classBooklets } from '../../data/classBooklets';

test('B1 real lessons, independent gaps, reading marks and all three references persist', async ({ page }) => {
  await page.goto('/class/m7q4rx');
  await expect(page.getByText('Starter · Personal profile', { exact: true })).toBeVisible();
  await expect(page.getByText('Placeholder booklet', { exact: true })).toHaveCount(0);
  await page.getByLabel('travel. Choose a photo', { exact: true }).selectOption('B');
  await page.getByRole('button', { name: /^Page 2:/ }).click();
  await expect(page.getByText('Textbook page 9', { exact: true })).toBeVisible();
  await page.getByLabel('1. Gap 1', { exact: true }).selectOption('with');
  const passage = page.getByTestId('reading-passage');
  await expect(passage).toContainText('I’m Martina, an IT student.');
  await passage.evaluate(root => {
    const range = document.createRange();
    range.setStart(root.firstChild!.firstChild!, 0); range.setEnd(root.firstChild!.firstChild!, 6);
    const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await page.getByRole('button', { name: 'Highlight', exact: true }).click();
  await page.getByRole('button', { name: /^Page 3:/ }).click();
  const questions = page.locator('section[aria-labelledby="section-b1-p10-grammar-3"]');
  await questions.getByRole('textbox').nth(1).fill('do');
  await expect(questions.getByRole('textbox').first()).toHaveValue('');
  await page.getByRole('button', { name: 'Grammar reference · 196', exact: true }).first().click();
  await expect(page.getByText('Grammar reference 1 of 3', { exact: true })).toBeVisible();
  await expect(page.getByText('Textbook page 196', { exact: true })).toBeVisible();
  await page.getByRole('group', { name: '1. Choose the option(s) for gap 1', exact: true }).getByRole('checkbox', { name: 'are taking up', exact: true }).check();
  await page.getByRole('button', { name: 'Next →', exact: true }).click();
  await expect(page.getByText('Textbook page 197', { exact: true })).toBeVisible();
  await page.locator('#answer-b1-ref197-frequency-order-1').fill('I go to the gym twice a week.');
  await page.getByRole('button', { name: 'Grammar reference · 198', exact: true }).click();
  await expect(page.getByText('Textbook page 198', { exact: true })).toBeVisible();
  const shortAnswers = page.locator('section[aria-labelledby="section-b1-ref198-yesno-practice-2"]');
  await shortAnswers.getByRole('textbox').nth(1).fill('I’m not');
  await page.reload();
  await expect(shortAnswers.getByRole('textbox').nth(1)).toHaveValue('I’m not');
  await expect(shortAnswers.getByRole('textbox').first()).toHaveValue('');
  await page.getByRole('button', { name: '← Back to lesson', exact: true }).click();
  await expect(page.getByText('Page 3 of 6', { exact: true })).toBeVisible();
  await expect(questions.getByRole('textbox').nth(1)).toHaveValue('do');
  await page.getByRole('button', { name: 'Read textbook page 9', exact: true }).first().click();
  await expect(page.locator('.class-highlight')).toHaveText('Hello!');
  await expect(page.getByLabel('1. Gap 1', { exact: true })).toHaveValue('with');
  await page.getByRole('button', { name: /^Page 1:/ }).click();
  await expect(page.getByLabel('travel. Choose a photo', { exact: true })).toHaveValue('B');
});

test('B1 occupations, listening selections, profile writing and reset', async ({ page }) => {
  await page.goto('/class/m7q4rx');
  await page.getByRole('button', { name: /^Page 4:/ }).click();
  await page.getByLabel('A. Occupation', { exact: true }).selectOption('chef');
  await page.getByLabel('A description. What does the person do?', { exact: true }).selectOption('3. She cooks at a restaurant.');
  await page.getByLabel('A · 1. First name', { exact: true }).fill('Simone');
  await page.getByLabel('B · 2. Surname', { exact: true }).fill('Holland');
  await expect(page.locator('.class-photo')).toHaveCount(8);
  await expect(page.locator('audio, video')).toHaveCount(0);
  await page.getByRole('button', { name: /^Page 5:/ }).click();
  await page.getByLabel('Profile. Your personal profile', { exact: true }).fill('Hello! My name is Alex. Welcome to my blog.');
  await page.getByRole('button', { name: /^Page 6:/ }).click();
  await page.getByRole('checkbox', { name: 'your hobbies', exact: true }).check();
  await page.getByRole('checkbox', { name: 'people you both know', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Nice to meet you.', exact: true }).check();
  await page.getByRole('group', { name: '1. Karen: I go swimming every morning. Sam: Really?' }).getByRole('radio', { name: 'a', exact: true }).check();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'your hobbies', exact: true })).toBeChecked();
  await page.getByRole('button', { name: /^Page 5:/ }).click();
  await expect(page.getByLabel('Profile. Your personal profile', { exact: true })).toHaveValue('Hello! My name is Alex. Welcome to my blog.');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Reset booklet', exact: true }).click();
  await expect(page.getByText('Page 1 of 6', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Page 4:/ }).click();
  await expect(page.getByLabel('A. Occupation', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('A · 1. First name', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: /^Page 6:/ }).click();
  await expect(page.getByRole('checkbox', { name: 'your hobbies', exact: true })).not.toBeChecked();
});

test('B1 saving omits unfinished work and retains textbook exercise and gap numbers', async ({ page }, testInfo) => {
  await page.goto('/class/m7q4rx');
  await page.getByRole('button', { name: /^Page 2:/ }).click();
  await page.getByLabel('2. Gap 2', { exact: true }).selectOption('of');
  await page.getByRole('button', { name: /^Reference 198/ }).click();
  const shortAnswers = page.locator('section[aria-labelledby="section-b1-ref198-yesno-practice-2"]');
  await shortAnswers.getByRole('textbox').nth(1).fill('I’m not');
  await page.evaluate(() => { window.print = () => window.dispatchEvent(new Event('beforeprint')); });
  await page.getByRole('button', { name: 'Save a copy', exact: true }).click();
  await page.emulateMedia({ media: 'print' });
  const saved = page.getByTestId('saved-booklet');
  await expect(saved.locator('article')).toHaveCount(2);
  await expect(saved.getByRole('heading', { name: 'Page 9', exact: true })).toBeVisible();
  await expect(saved.getByRole('heading', { name: 'Page 198', exact: true })).toBeVisible();
  await expect(saved).toContainText('Exercise 1 - Reading');
  await expect(saved).toContainText('Gap 2: I’m not');
  await expect(saved).not.toContainText('Gap 1:');
  await expect(saved).not.toContainText('Not answered');
  await expect(saved).not.toContainText('I’m Martina, an IT student.');
  await expect(saved.locator('input, textarea, select, button, svg')).toHaveCount(0);
  if (testInfo.project.name === 'chromium') {
    const pdf = await page.pdf({ path: testInfo.outputPath('b1-partial-answers.pdf'), preferCSSPageSize: true });
    expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length).toBe(1);
  }
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(shortAnswers.getByRole('textbox').nth(1)).toHaveValue('I’m not');
});

for (const theme of ['light', 'dark']) test(`B1 saved PDF uses a white page in ${theme} site mode`, async ({ page }, testInfo) => {
  await page.addInitScript(theme => localStorage.setItem('teachers-room-theme', theme), theme);
  await page.goto('/class/m7q4rx');
  await page.getByLabel('A. Interest or activity', { exact: true }).fill('My saved answer');
  await page.evaluate(() => { window.print = () => window.dispatchEvent(new Event('beforeprint')); });
  await page.getByRole('button', { name: 'Save a copy', exact: true }).click();
  await page.emulateMedia({ media: 'print' });
  expect(await page.locator('html').evaluate(element => getComputedStyle(element).colorScheme)).toBe('light');
  for (const selector of ['html', 'body', '#root', '.class-workbook', '.class-saved-copy']) {
    expect(await page.locator(selector).evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(255, 255, 255)');
  }
  await expect(page.getByTestId('saved-booklet')).toContainText('My saved answer');
  if (testInfo.project.name === 'chromium') {
    await page.pdf({ path: testInfo.outputPath(`b1-${theme}-page-background.pdf`), preferCSSPageSize: true, printBackground: true });
  }
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(page.getByLabel('A. Interest or activity', { exact: true })).toHaveValue('My saved answer');
  expect(await page.locator('html').evaluate(element => getComputedStyle(element).colorScheme)).toBe(theme);
  expect(await page.evaluate(() => localStorage.getItem('teachers-room-theme'))).toBe(theme);
});

test('B1 lesson and reference pages fit phones, tablets and desktops', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/class/m7q4rx');
    for (const item of classBooklets.find(booklet => booklet.level === 'B1')!.pages) {
      if (item.reference) await page.getByRole('button', { name: new RegExp(`^Reference ${item.sourcePage}`) }).click();
      else await page.getByRole('button', { name: `Page ${item.sourcePage! - 7}: ${item.title}`, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if ([8, 11, 197].includes(item.sourcePage!)) await page.screenshot({ path: testInfoPath(width, item.sourcePage!), fullPage: true });
      if (width === 1280 && [8, 11].includes(item.sourcePage!)) {
        const photos = page.locator('.class-content-cards');
        for (let i = 0; i < await photos.count(); i++) await photos.nth(i).screenshot({ path: test.info().outputPath(`b1-photos-${item.sourcePage}-${i}.png`) });
      }
    }
  }
  expect(errors).toEqual([]);
});

function testInfoPath(width: number, pageNumber: number) { return test.info().outputPath(`b1-${width}-page${pageNumber}.png`); }

test('full B1 entered answers fit a compact PDF', async ({ page }, testInfo) => {
  const booklet = classBooklets.find(item => item.level === 'B1')!;
  const answers: Record<string, string | string[]> = {};
  for (const item of booklet.pages) for (const exercise of item.sections?.flatMap(section => section.exercises || []) || []) {
    answers[exercise.id] = exercise.kind === 'gaps' ? Array(exercise.prompt.split('{{}}').length - 1).fill('do')
      : exercise.options ? exercise.kind === 'checkbox' ? [exercise.options[0]] : exercise.options[0]
      : exercise.id === 'b1-p12-profile' ? 'Hello! My name is Alex. Welcome to my blog. I live in Spain and I am a student. ' + 'I enjoy music and spending time with my friends. '.repeat(10)
      : exercise.kind === 'long-text' ? 'I talked about this with my partner.' : 'My answer.';
  }
  await page.addInitScript(({ slug, answers }) => sessionStorage.setItem(`teachers-room:temporary-class:v1:${slug}`, JSON.stringify({ page: 0, answers, marks: {} })), { slug: booklet.slug, answers });
  await page.goto('/class/m7q4rx');
  await expect(page.getByRole('heading', { name: 'B1 Workbook', exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByTestId('saved-booklet').locator('.class-answer-row')).toHaveCount(Object.keys(answers).length);
  if (testInfo.project.name === 'chromium') {
    const pdf = await page.pdf({ path: testInfo.outputPath('b1-full-answers.pdf'), preferCSSPageSize: true });
    const count = pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length || 0;
    expect(count).toBeGreaterThan(0); expect(count).toBeLessThanOrEqual(3);
  }
});
