# Testing Workflow

## Fast Local Checks

Run the browser smoke suite against the local Vite app:

```powershell
npm run test:e2e
```

If you already have a dev server running and want a fresh test server on another port:

```powershell
$env:PLAYWRIGHT_PORT='5174'
npm run test:e2e
Remove-Item Env:\PLAYWRIGHT_PORT
```

For debugging a failing browser test:

```powershell
npm run test:e2e:ui
```

## Isolated Supabase Testing

The normal local app still falls back to the production Supabase project unless environment variables override it. For safer database-backed tests, create a separate Supabase project and copy `.env.e2e.example` to `.env.e2e` with that project's URL and anon key.

Then run:

```powershell
$env:PLAYWRIGHT_VITE_MODE='e2e'
npm run test:e2e
Remove-Item Env:\PLAYWRIGHT_VITE_MODE
```

This starts Vite in `e2e` mode, so Vite loads `.env.e2e`. Keep production data out of this project and seed it with disposable fixtures.

## CI

GitHub Actions runs:

```powershell
npm ci
npm run build
npm run test:e2e
```

The CI job uploads Playwright traces, screenshots, videos, and the HTML report when useful for debugging.

## Deliberate Production Smoke Checks

Production smoke checks are separate from the normal test suite. They are intended for deliberate checks when you suspect a live Supabase wiring problem.

Fill `.env.prod-smoke` locally:

```powershell
PLAYWRIGHT_BASE_URL=https://www.theteachersroom.app

VITE_SUPABASE_URL=https://your-real-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-real-anon-key

E2E_TEACHER_EMAIL=your-test-teacher-email@example.com
E2E_TEACHER_PASSWORD=your-test-teacher-password
E2E_LIBRARY_GAME_TITLE=[E2E TEST] Private Library Smoke Game
```

Then run:

```powershell
npm run test:e2e:prod-smoke
```

The current production smoke checks are intentionally non-destructive. They verify:

- the production homepage loads without browser console errors
- the production Supabase anon key can read the public saved-game stats data
- the dedicated teacher account can authenticate against production Supabase
- the production generation API accepts the dedicated teacher auth token
- the dedicated teacher can log in through the production website UI
- the dedicated teacher can see the private `[E2E TEST] Private Library Smoke Game` in the saved-games library

Do not commit real credentials. `.env.prod-smoke` is ignored by Git; `.env.prod-smoke.example` is the committed template.
