import { defineConfig, devices } from '@playwright/test';

const viteMode = process.env.PLAYWRIGHT_VITE_MODE || 'development';
const port = process.env.PLAYWRIGHT_PORT || '5173';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  // The Snakes & Ladders checks load a full WebGL room. GitHub's runner can
  // exhaust its graphics resources when several copies run at once, so CI
  // uses one worker while local development can remain fully parallel.
  fullyParallel: !process.env.CI,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    // Smoke tests verify game state rather than animation smoothness. This
    // also exercises the accessibility path intended for reduced motion.
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort --mode ${viteMode}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      // Keep the Pixel 5 viewport and touch behaviour, but avoid allocating a
      // multi-million-pixel WebGL buffer for functional smoke tests. Real
      // phones still receive the game's full high-density rendering.
      use: { ...devices['Pixel 5'], deviceScaleFactor: 1 },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
