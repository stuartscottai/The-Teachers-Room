import { expect, test } from '@playwright/test';

test('B2 lesson content, independent gap answers, references and refresh', async ({ page }) => {
  await page.goto('/class/v9k2fp');
  await expect(page.getByText('Starter · Let’s talk')).toBeVisible();
  await expect(page.getByText('Placeholder booklet', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Textbook page 8', { exact: true })).toBeVisible();
  await page.getByLabel('2. What’s your favourite subject?').selectOption('4. Education and work');
  await page.getByRole('button', { name: 'Page 2: Speaking & vocabulary · Emotions' }).click();
  await page.getByLabel('1. I come from … which is in …').selectOption('1. Where are you from?');
  await page.getByLabel('A. annoyed', { exact: true }).selectOption('5');
  await page.getByRole('button', { name: 'Page 3: Reading · Emojis' }).click();
  await page.getByLabel('2. What did you do last night?').selectOption('A');
  await page.getByRole('radio', { name: '2. There are a lot of benefits to using emojis.' }).check();
  const passage = page.getByTestId('reading-passage');
  await expect(passage).toContainText('Initially, I was a bit sceptical.');
  await passage.evaluate(root => {
    const range = document.createRange();
    range.setStart(root.firstChild!.firstChild!, 0); range.setEnd(root.firstChild!.firstChild!, 15);
    const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await page.getByRole('button', { name: 'Highlight', exact: true }).click();
  await page.getByRole('button', { name: 'Page 4: Reading & grammar · Present perfect review' }).click();
  await page.getByRole('group', { name: '1. At first, Miranda loved emojis and used them all the time.' }).getByRole('radio', { name: 'False', exact: true }).check();
  const section = page.locator('section[aria-labelledby="section-p11-grammar-3"]');
  await section.getByRole('textbox').first().fill('have been living here');
  await page.getByRole('button', { name: 'Grammar reference · 204', exact: true }).click();
  await expect(page.getByText('Grammar reference 1 of 2', { exact: true })).toBeVisible();
  await expect(page.getByText('Textbook page 204', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '← Previous' })).toBeDisabled();
  const referenceGaps = page.locator('section[aria-labelledby="section-ref204-practice-1"]');
  await referenceGaps.getByRole('textbox').nth(1).fill('have not finished');
  await page.reload();
  await expect(referenceGaps.getByRole('textbox').nth(1)).toHaveValue('have not finished');
  await expect(referenceGaps.getByRole('textbox').nth(0)).toHaveValue('');
  await referenceGaps.getByRole('textbox').nth(0).fill('have been preparing');
  await page.getByRole('checkbox', { name: 'This sentence is correct' }).first().check();
  await page.getByRole('button', { name: 'Next →' }).click();
  await expect(page.getByText('Textbook page 205', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '← Back to lesson' }).click();
  await expect(page.getByText('Page 4 of 6', { exact: true })).toBeVisible();
  await page.reload();
  await expect(section.getByRole('textbox').first()).toHaveValue('have been living here');
  await page.getByRole('button', { name: 'Grammar reference · 204', exact: true }).click();
  await expect(referenceGaps.getByRole('textbox').nth(0)).toHaveValue('have been preparing');
  await expect(referenceGaps.getByRole('textbox').nth(1)).toHaveValue('have not finished');
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'This sentence is correct' }).first()).toBeChecked();
  await page.getByRole('button', { name: '← Back to lesson' }).click();
  await expect(page.getByText('Page 4 of 6', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Read textbook page 10', exact: true }).click();
  await expect(page.locator('.class-highlight')).toHaveText('OK, I admit it.');
  await page.getByRole('button', { name: 'Page 1: Speaking · Getting to know your classmates' }).click();
  await expect(page.getByLabel('2. What’s your favourite subject?')).toHaveValue('4. Education and work');
});

test('B2 writing, deliberate mistakes, listening choices and whole booklet reset', async ({ page }) => {
  await page.goto('/class/v9k2fp');
  await page.getByRole('button', { name: 'Page 5: Listening & grammar · Communication' }).click();
  await expect(page.getByText('Your teacher will play the audio over Zoom.')).toBeVisible();
  await page.getByRole('radio', { name: 'B. living with other people.' }).check();
  await expect(page.locator('audio, video')).toHaveCount(0);
  await page.getByRole('button', { name: 'Next →' }).click();
  await expect(page.getByText('Page 6 of 6', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next →' })).toBeDisabled();
  const story = page.getByTestId('reading-passage');
  for (const word of ['brite', 'desided', 'adress', 'gorgous', 'frend', 'actualy', 'fergot', 'embarassed']) await expect(story).toContainText(word);
  await expect(story.locator('.class-highlight').first()).toHaveText('While');
  await expect(story.locator('.class-highlight').nth(1)).toHaveText('when');
  await page.getByLabel('Story. Your story', { exact: true }).fill('While I was walking down the street, I found a small, gold ring on the pavement.');
  await expect(page.getByText('16 words · Aim for 140–190 words')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Story. Your story', { exact: true })).toHaveValue('While I was walking down the street, I found a small, gold ring on the pavement.');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Reset booklet' }).click();
  await expect(page.getByText('Page 1 of 6', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Page 6: Grammar & writing · A story' }).click();
  await expect(page.getByLabel('Story. Your story', { exact: true })).toHaveValue('');
  await expect(story.locator('.class-highlight')).toHaveCount(2);
});

test('B2 lesson and reference layouts fit phones, tablets and desktops', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/class/v9k2fp');
    for (const number of [2, 3, 5, 6]) {
      await page.getByRole('button', { name: new RegExp(`^Page ${number}:`) }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`b2-${width}-page${number}.png`), fullPage: true });
      if (number === 3 || number === 6) {
        await page.getByTestId('reading-passage').scrollIntoViewIfNeeded();
        await page.screenshot({ path: test.info().outputPath(`b2-${width}-reading${number}.png`) });
      }
    }
    await page.getByRole('button', { name: /^Reference 204/ }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`b2-${width}-reference204.png`), fullPage: true });
    await page.getByRole('heading', { name: 'The two tenses are often very similar in their usage. However:' }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath(`b2-${width}-reference-detail.png`) });
  }
  expect(errors).toEqual([]);
});
