import { expect, test, type Page } from '@playwright/test';
import { expectNoBrowserErrors, installErrorGuards } from './helpers';

const startPractice = async (page: Page, name = 'Stu') => {
  await page.goto('/test/student-practice-smoke');
  await expect(page.getByRole('heading', { name: /Student practice smoke test/i })).toBeVisible();
  await page.getByPlaceholder(/Enter your name/i).fill(name);
  await page.getByRole('button', { name: /Start Game/i }).click();
};

const completeWithWrongAnswer = async (page: Page) => {
  await page.getByRole('button', { name: /^1$/ }).click();
  await expect(page.getByRole('button', { name: /Wrong A/i })).toBeVisible();
  await page.getByRole('button', { name: /Wrong A/i }).click();
  await expect(page.getByText(/Incorrect/i).first()).toBeVisible();
  await page.getByRole('button', { name: /Continue/i }).click();
  await expect(page.getByRole('heading', { name: /Finished, Stu/i })).toBeVisible({ timeout: 5_000 });
};

test('student practice start, final screen, review, retry, and exit work', async ({ page }) => {
  const errors = installErrorGuards(page);

  await startPractice(page);
  await completeWithWrongAnswer(page);

  await expect(page.getByText('0 / 1 correct')).toBeVisible();
  await page.getByRole('button', { name: /Review wrong answers/i }).click();
  await expect(page.getByText(/Which answer should be selected/i)).toBeVisible();
  await expect(page.getByText('Wrong A')).toBeVisible();
  await expect(page.getByText('Correct answer')).toBeVisible();
  await expect(page.locator('.bg-emerald-50').getByText('Correct', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Try again/i }).click();
  await expect(page.getByRole('button', { name: /^1$/ })).toBeVisible();

  await page.getByRole('button', { name: /^1$/ }).click();
  await page.getByRole('button', { name: /Wrong A/i }).click();
  await page.getByRole('button', { name: /Continue/i }).click();
  await expect(page.getByRole('heading', { name: /Finished, Stu/i })).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: /^Exit$/i }).click();
  await expect(page.getByRole('heading', { name: /Practice exited/i })).toBeVisible();

  expectNoBrowserErrors(errors);
});

test('student practice final screen sits below the site navigation on mobile', async ({ page }) => {
  const errors = installErrorGuards(page);

  await startPractice(page);
  await completeWithWrongAnswer(page);

  await expect(page.locator('nav')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Finished, Stu/i })).toBeVisible();

  const layout = await page.evaluate(() => {
    const nav = document.querySelector('nav')?.getBoundingClientRect();
    const heading = Array.from(document.querySelectorAll('h1')).find((item) => item.textContent?.includes('Finished'))?.getBoundingClientRect();
    return {
      navBottom: nav?.bottom ?? 0,
      headingTop: heading?.top ?? 0,
    };
  });

  expect(layout.headingTop).toBeGreaterThan(layout.navBottom);
  await expect(page.getByRole('button', { name: /Review wrong answers/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Try again/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Exit$/i })).toBeVisible();

  expectNoBrowserErrors(errors);
});
