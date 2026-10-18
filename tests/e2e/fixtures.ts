import { test as base, expect } from '@playwright/test';

// Ordinary browser tests use empty database responses by default. Individual
// tests can provide page.route fixtures, which take precedence over this route.
// Tests against the real service belong in the separate prod-smoke suite.
export const test = base.extend<{ offlineSupabase: void }>({
  offlineSupabase: [async ({ context }, use) => {
    await context.route(/^https?:\/\/[^/]+\.supabase\.co\//, async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '*/0' },
        body: request.method() === 'HEAD' ? '' : path.endsWith('/get_game_library_page') ? '{"data":[],"count":0}' : path.startsWith('/auth/') ? JSON.stringify({ user: null, session: null }) : '[]',
      });
    });
    await use();
  }, { auto: true }],
});

export { expect };
export type { Page, Locator } from '@playwright/test';
