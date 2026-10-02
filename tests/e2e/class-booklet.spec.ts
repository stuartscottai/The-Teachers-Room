import { expect, test, type Page } from '@playwright/test';
import { classBooklets } from '../../data/classBooklets';

async function selectText(page: Page, start: number, end: number) {
  await page.getByTestId('reading-passage').evaluate((root, offsets) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let node: Node | null;
    let offset = 0;
    let hasStart = false;
    while ((node = walker.nextNode())) {
      const length = node.textContent?.length || 0;
      if (!hasStart && offsets.start < offset + length) { range.setStart(node, offsets.start - offset); hasStart = true; }
      if (hasStart && offsets.end <= offset + length) { range.setEnd(node, offsets.end - offset); break; }
      offset += length;
    }
    const selection = window.getSelection()!;
    selection.removeAllRanges(); selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  }, { start, end });
}

for (const booklet of classBooklets) test(`${booklet.level} opens publicly without account requests`, async ({ page }) => {
  const accountRequests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).hostname.endsWith('.supabase.co') || /\/api\//i.test(request.url())) accountRequests.push(request.url()); });
  await page.goto(`/class/${booklet.slug}/`);
  await expect(page.getByRole('heading', { name: `${booklet.level} Workbook` })).toBeVisible();
  await expect(page.getByText('Page 1 of 6', { exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
  await expect(page.getByRole('button', { name: /Login|Sign Up/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '← Previous' })).toBeDisabled();
  await page.getByRole('button', { name: `Page 6: ${booklet.pages[5].title}` }).click();
  await expect(page.getByText('Page 6 of 6', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next →' })).toBeDisabled();
  await page.getByRole('button', { name: '← Previous' }).click();
  await expect(page.getByText('Page 5 of 6', { exact: true })).toBeVisible();
  expect(accountRequests).toEqual([]);
});

test('answers, overlapping marks, refresh, level isolation and reset', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const text = classBooklets.find(booklet => booklet.level === 'C2')!.pages[1].sections!.find(section => section.reading)!.reading!.text;
  await page.goto('/class/t6j5cs');
  await page.locator('#answer-c2-p8-changes-1').fill('My local answer');
  await page.locator('#answer-c2-p8-speaker-1').selectOption('gaining media attention');
  await page.getByRole('button', { name: /^Page 2:/ }).click();
  await selectText(page, 0, 24);
  await page.getByRole('button', { name: 'Highlight', exact: true }).click();
  await expect(page.locator('.class-highlight')).toHaveText(text.slice(0, 24));
  await selectText(page, 8, 24);
  await page.getByRole('button', { name: 'Underline', exact: true }).click();
  await expect(page.locator('.class-highlight.class-underline')).toHaveText(text.slice(8, 24));
  await selectText(page, 8, 19);
  await page.getByRole('button', { name: 'Remove marks', exact: true }).click();
  await expect(page.locator('.class-highlight.class-underline')).toHaveText(text.slice(19, 24));
  await expect(page.getByTestId('reading-passage')).toHaveText(text);
  await page.getByRole('radio', { name: 'B. providers', exact: true }).check();
  await page.locator('section[aria-labelledby="section-c2-p9-vocabulary-5"]').getByRole('textbox').nth(2).fill('A gap answer');
  await page.getByRole('button', { name: 'Next →' }).click();
  await page.getByRole('checkbox', { name: 'Modal verbs', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Passives', exact: true }).check();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Modal verbs', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Passives', exact: true })).toBeChecked();
  await page.getByRole('button', { name: /^Page 6:/ }).click();
  await page.locator('#answer-c2-p13-summary-3').fill('A longer response');
  await page.goto('/class/m7q4rx');
  await expect(page.getByLabel('A. Interest or activity', { exact: true })).toHaveValue('');
  await expect(page.locator('.class-highlight')).toHaveCount(0);
  await page.goto('/class/t6j5cs');
  await expect(page.locator('#answer-c2-p13-summary-3')).toHaveValue('A longer response');
  await page.getByRole('button', { name: /^Page 1:/ }).click();
  await expect(page.locator('#answer-c2-p8-changes-1')).toHaveValue('My local answer');
  await expect(page.locator('#answer-c2-p8-speaker-1')).toHaveValue('gaining media attention');
  await page.getByRole('button', { name: /^Page 2:/ }).click();
  await expect(page.locator('.class-highlight.class-underline')).toHaveText(text.slice(19, 24));
  await expect(page.getByRole('radio', { name: 'B. providers', exact: true })).toBeChecked();
  await expect(page.locator('section[aria-labelledby="section-c2-p9-vocabulary-5"]').getByRole('textbox').nth(2)).toHaveValue('A gap answer');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Reset booklet' }).click();
  await expect(page.locator('#answer-c2-p8-changes-1')).toHaveValue('');
  await expect(page.locator('.class-highlight, .class-underline')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#answer-c2-p8-changes-1')).toHaveValue('');
  await expect(page.locator('#answer-c2-p8-speaker-1')).toHaveValue('');
  await page.getByRole('button', { name: /^Page 3:/ }).click();
  await expect(page.getByRole('checkbox', { name: 'Modal verbs', exact: true })).not.toBeChecked();
  expect(errors).toEqual([]);
});

test('account pages and game creation still require an account after visiting a booklet', async ({ page }) => {
  await page.goto('/class/t6j5cs');
  await page.goto('/profile');
  await expect(page.getByText('Please log in to view your profile.')).toBeVisible();
  await page.goto('/school-admin');
  await expect(page.getByRole('heading', { name: 'School Admin Access' })).toBeVisible();
  await page.goto('/games?create=trivia');
  await expect(page.getByRole('heading', { name: 'Create A Free Teacher Account' })).toBeVisible();
  await expect(page.getByText('Sign in or create an account to make your own Trivia game.')).toBeVisible();
  await expect(page.getByPlaceholder('name@school.edu')).toBeVisible();
});

test('no class links in regular navigation and no level directory', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a[href^="/class/"]')).toHaveCount(0);
  await page.goto('/class/b1');
  await expect(page.getByRole('heading', { name: 'Booklet not found' })).toBeVisible();
  await page.goto('/class/');
  await expect(page.getByRole('heading', { name: 'Booklet not found' })).toBeVisible();
});

test('readable layout at phone, tablet and desktop sizes, including dark site preference', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('teachers-room-theme', 'dark'));
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/class/t6j5cs');
    await expect(page.getByRole('heading', { name: 'C2 Workbook' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('button', { name: /^Page 2:/ }).click();
    await selectText(page, 0, 24);
    await page.getByRole('button', { name: 'Highlight', exact: true }).click();
    await expect(page.locator('.class-highlight').first()).toBeVisible();
    await page.screenshot({ path: test.info().outputPath(`class-${width}.png`), fullPage: true });
  }
});

test('blocked session storage does not stop the booklet', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new Error('Storage disabled'); };
  });
  await page.goto('/class/t6j5cs');
  await expect(page.getByText(/Browser storage is unavailable/)).toBeVisible();
  await page.locator('#answer-c2-p8-changes-1').fill('Still usable');
  await page.getByRole('button', { name: 'Next →' }).click();
  await page.getByRole('button', { name: '← Previous' }).click();
  await expect(page.locator('#answer-c2-p8-changes-1')).toHaveValue('Still usable');
});
