import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { expectNoBrowserErrors, installErrorGuards } from '../helpers';

const PLACEHOLDER_VALUES = new Set([
  '',
  'https://your-real-project.supabase.co',
  'your-real-anon-key',
  'your-test-teacher-email@example.com',
  'your-test-teacher-password',
]);

const getEnv = (key: string) => process.env[key]?.trim() || '';
const hasRealValue = (value: string) => !PLACEHOLDER_VALUES.has(value);

const prodSmokeEnv = {
  baseURL: getEnv('PLAYWRIGHT_BASE_URL') || 'https://www.theteachersroom.app',
  supabaseUrl: getEnv('VITE_SUPABASE_URL'),
  supabaseAnonKey: getEnv('VITE_SUPABASE_ANON_KEY'),
  teacherEmail: getEnv('E2E_TEACHER_EMAIL'),
  teacherPassword: getEnv('E2E_TEACHER_PASSWORD'),
  libraryGameTitle: getEnv('E2E_LIBRARY_GAME_TITLE') || '[E2E TEST] Private Library Smoke Game',
};

const isConfigured =
  hasRealValue(prodSmokeEnv.supabaseUrl) &&
  hasRealValue(prodSmokeEnv.supabaseAnonKey) &&
  hasRealValue(prodSmokeEnv.teacherEmail) &&
  hasRealValue(prodSmokeEnv.teacherPassword);

test.describe('production smoke checks', () => {
  test.skip(!isConfigured, 'Fill .env.prod-smoke before running production smoke checks.');

  const dismissTourPopup = async (page: import('@playwright/test').Page) => {
    const closeButton = page.getByRole('button', { name: /Close tour popup/i });
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
      return;
    }

    const skipButton = page.getByRole('button', { name: /Skip tour/i });
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
    }
  };

  const loginThroughUi = async (page: import('@playwright/test').Page) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^Login$/i }).click();
    await expect(page.getByRole('heading', { name: /Welcome Back/i })).toBeVisible();
    await page.getByPlaceholder(/name@school\.edu/i).fill(prodSmokeEnv.teacherEmail);
    await page.getByPlaceholder(/Enter your password/i).fill(prodSmokeEnv.teacherPassword);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.getByRole('button', { name: /^Login$/i })).toBeHidden({ timeout: 15_000 });
    await dismissTourPopup(page);
  };

  test('production homepage loads without browser errors', async ({ page }) => {
    const errors = installErrorGuards(page);

    await page.goto('/');
    await expect(page.getByRole('link', { name: /The Teachers' Room/i }).first()).toBeVisible();
    await expect(page.locator('body')).toBeVisible();

    expectNoBrowserErrors(errors);
  });

  test('real Supabase public game stats query is readable', async () => {
    const supabase = createClient(prodSmokeEnv.supabaseUrl, prodSmokeEnv.supabaseAnonKey);

    const { count, error: countError } = await supabase
      .from('saved_games')
      .select('id', { count: 'exact', head: true });

    expect(countError, countError?.message || '').toBeNull();
    expect(typeof count).toBe('number');

    const { data, error: playCountError } = await supabase
      .from('saved_games')
      .select('play_count')
      .limit(5);

    expect(playCountError, playCountError?.message || '').toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  test('production generation API accepts a token from a CAPTCHA-protected UI login', async ({ page, request }) => {
    await loginThroughUi(page);

    const accessToken = await page.evaluate(() => {
      const authStorageKey = Object.keys(window.localStorage).find(
        (key) => key.startsWith('sb-') && key.endsWith('-auth-token')
      );
      if (!authStorageKey) return null;

      try {
        const storedSession = JSON.parse(window.localStorage.getItem(authStorageKey) || 'null');
        return storedSession?.access_token || storedSession?.currentSession?.access_token || null;
      } catch {
        return null;
      }
    });

    expect(accessToken).toBeTruthy();

    const response = await request.post('/api/generate', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        action: '__auth_smoke__',
        clientEnv: 'prod-smoke',
      },
    });

    expect(response.status()).toBe(400);
    await expect(await response.json()).toEqual({ error: 'Invalid action' });
  });

  test('dedicated teacher can log in through the production UI', async ({ page }) => {
    const errors = installErrorGuards(page);

    await loginThroughUi(page);

    expectNoBrowserErrors(errors);
  });

  test('dedicated teacher private saved game appears in the production library UI', async ({ page }) => {
    const errors = installErrorGuards(page);

    await loginThroughUi(page);
    await page.goto('/games');
    await page.getByRole('button', { name: /My Library/i }).click();
    await expect(page.getByRole('heading', { name: /My Saved Games/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Loading library/i)).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText(/Showing \d+-\d+ of \d+ games?/i).first()).toBeVisible();
    await expect(page.getByText(prodSmokeEnv.libraryGameTitle, { exact: true })).toBeVisible({ timeout: 15_000 });

    expectNoBrowserErrors(errors);
  });
});
