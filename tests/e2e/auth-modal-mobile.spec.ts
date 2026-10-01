import { expect, test } from '@playwright/test';

test('signup dialog remains usable on a short phone with a school code', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  // This check covers the signup form, not the unrelated homepage tour prompt.
  await page.addInitScript(() => localStorage.setItem('teachersRoomTourPromptDisabled', '1'));
  await page.goto('/');
  const openMenu = page.getByRole('button', { name: 'Open menu', exact: true });
  await expect(openMenu).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 250));
  await openMenu.click();
  const mobileLogin = page.getByRole('button', { name: /Login \/ Sign Up/i });
  await expect(mobileLogin).toBeVisible();
  // Capture the page position immediately before opening the modal, after
  // Playwright has scrolled the expanded mobile-menu action into view.
  await mobileLogin.scrollIntoViewIfNeeded();
  const pageScrollBeforeOpening = await page.evaluate(() => window.scrollY);
  await mobileLogin.click();

  await page.getByRole('button', { name: /Sign Up/i }).click();

  const heading = page.getByRole('heading', { name: /Join the Community/i });
  const scrollArea = page.getByTestId('auth-modal-scroll-area');
  await expect(heading).toBeVisible();
  await expect(scrollArea).toBeVisible();
  await expect.poll(() => scrollArea.evaluate((element) => element.scrollTop)).toBe(0);

  await page.getByLabel(/I have a school code/i).check();

  const schoolCode = page.getByPlaceholder(/Enter school code/i);
  const createAccount = page.getByRole('button', { name: /Create Account/i });

  const initialScrollTop = await scrollArea.evaluate((element) => element.scrollTop);
  await scrollArea.hover();
  await page.mouse.wheel(0, 500);
  await expect.poll(() => scrollArea.evaluate((element) => element.scrollTop)).toBeGreaterThan(initialScrollTop);

  await expect(schoolCode).toBeVisible();
  await expect(createAccount).toBeVisible();

  const dimensions = await scrollArea.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight
  }));

  expect(dimensions.clientHeight).toBeLessThanOrEqual(643);
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);
  expect(await page.evaluate(() => window.scrollY)).toBe(pageScrollBeforeOpening);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
});
