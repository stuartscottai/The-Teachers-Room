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
  await page.goto('/class/m7q4rx');
  await page.getByLabel('1. Sample answer box', { exact: true }).fill('My local answer');
  await selectText(page, 0, 24);
  await page.getByRole('button', { name: 'Highlight', exact: true }).click();
  await expect(page.locator('.class-highlight')).toHaveText('This is placeholder text');
  await selectText(page, 8, 24);
  await page.getByRole('button', { name: 'Underline', exact: true }).click();
  await expect(page.locator('.class-highlight.class-underline')).toHaveText('placeholder text');
  await selectText(page, 8, 19);
  await page.getByRole('button', { name: 'Remove marks', exact: true }).click();
  await expect(page.locator('.class-highlight.class-underline')).toHaveText(' text');
  await expect(page.getByTestId('reading-passage')).toHaveText(classBooklets[0].pages[0].reading!.text);
  await page.getByRole('button', { name: 'Next →' }).click();
  await page.getByRole('radio', { name: 'Option B' }).check();
  await page.getByRole('button', { name: 'Next →' }).click();
  await page.getByLabel('1. Sample dropdown control').selectOption('Option C');
  await page.getByRole('checkbox', { name: 'Option A' }).check();
  await page.getByRole('checkbox', { name: 'Option C' }).check();
  await page.reload();
  await expect(page.getByLabel('1. Sample dropdown control')).toHaveValue('Option C');
  await expect(page.getByRole('checkbox', { name: 'Option A' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Option C' })).toBeChecked();
  await page.getByRole('button', { name: 'Page 4: Short answers' }).click();
  await page.getByLabel('2. Sample gap 2').fill('A gap answer');
  await page.getByRole('button', { name: 'Next →' }).click();
  await page.getByLabel('1. Sample open-answer control').fill('A longer response');
  await page.goto('/class/h3w8nz');
  await expect(page.getByLabel('1. Sample answer box', { exact: true })).toHaveValue('');
  await expect(page.locator('.class-highlight')).toHaveCount(0);
  await page.goto('/class/m7q4rx');
  await expect(page.getByLabel('1. Sample open-answer control')).toHaveValue('A longer response');
  await page.getByRole('button', { name: 'Page 1: Reading & annotations' }).click();
  await expect(page.getByLabel('1. Sample answer box', { exact: true })).toHaveValue('My local answer');
  await expect(page.locator('.class-highlight.class-underline')).toHaveText(' text');
  await page.getByRole('button', { name: 'Page 2: Multiple choice' }).click();
  await expect(page.getByRole('radio', { name: 'Option B' })).toBeChecked();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Reset booklet' }).click();
  await expect(page.getByLabel('1. Sample answer box', { exact: true })).toHaveValue('');
  await expect(page.locator('.class-highlight, .class-underline')).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('1. Sample answer box', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Page 3: Dropdowns & checkboxes' }).click();
  await expect(page.getByLabel('1. Sample dropdown control')).toHaveValue('');
  await expect(page.getByRole('checkbox', { name: 'Option A' })).not.toBeChecked();
  expect(errors).toEqual([]);
});

test('account pages and game creation still require an account after visiting a booklet', async ({ page }) => {
  await page.goto('/class/m7q4rx');
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
    await page.goto('/class/m7q4rx');
    await expect(page.getByRole('heading', { name: 'B1 Workbook' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
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
  await page.goto('/class/m7q4rx');
  await expect(page.getByText(/Browser storage is unavailable/)).toBeVisible();
  await page.getByLabel('1. Sample answer box', { exact: true }).fill('Still usable');
  await page.getByRole('button', { name: 'Next →' }).click();
  await page.getByRole('button', { name: '← Previous' }).click();
  await expect(page.getByLabel('1. Sample answer box', { exact: true })).toHaveValue('Still usable');
});
