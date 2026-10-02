# Game covers

Community cards use `config.coverImage`, independently of question images. The
editor selects a cover on opening a game without one; the library save path also
does this, so saving directly from Preview is supported. Search uses the existing
Pexels-first/Pixabay-fallback provider integration. Covers persist until replaced.
Signed-in accounts with AI access use the existing authenticated, usage-tracked
`/api/generate` action `game-cover`. A bounded sample of ten questions across the
game (including grouped rounds), title and categories produces three concrete
visual search ideas. Files, image bytes and teacher profile details are excluded.
Guests, accounts without AI access and AI outages use content-based rules and
visual metaphors rather than a shared books query.

Search considers up to 40 results per phrase and avoids provider IDs present in
the 500 most recent public games and this browser session's selections. If a scene
has no unused images, it tries another relevant idea before reusing the least-used
match. This discourages repetition; it is not a global uniqueness guarantee under
concurrent creation. No browsing-time AI or stock searches run for saved covers.
Missing results or provider outages use an illustrated fallback and do not prevent
saving. `selectionVersion` tracks the algorithm and `visualTheme` records its idea.

The editor supports stock search, JPG/PNG/WebP uploads (10 MB input limit), and
direct image positioning: tap/click the cover, drag to move, and pinch or use the mouse wheel to zoom (1?4?). Keyboard users can use arrow keys and +/?. Uploaded files are resized and stored in the
existing private `worksheet-assets` bucket. Creator choices and cropping survive
saving; cover edits do not count as question-content edits for remix publishing.

`/api/game-cover` serves uploaded covers for public games without relying on
temporary signed URLs. It requires the existing server-only
`SUPABASE_SERVICE_ROLE_KEY`. It validates that the file belongs to the game's
owner, or is a cover made public by its original owner. No database schema change
or public storage bucket is needed. Stock covers use the existing image proxy.

Teacher and student share links are served by `/api/share-preview`, using the
built app shell so the normal sign-in and game screens still work. Social crawlers
receive the original game title and an image address specific to that link before
JavaScript runs. Selected student links use their saved share title and respect
expiry and revocation. The image endpoint reads only public game cover data,
reuses upload ownership checks, and allows stock images only from Pexels/Pixabay.
Missing or unavailable covers use `/assets/share-logo.png`, the yellow website
logo. The endpoint requires the same existing server-only
`SUPABASE_SERVICE_ROLE_KEY`; without it, links still load with generic wording and
the logo. Previews are not indexed and do not expose quiz questions or answers.
`npm run share:validate` checks this behaviour as part of every build.

## Existing games

Run `node scripts/backfill-game-covers.mjs --refresh-automatic` to list missing and
outdated automatic covers. Add `--plan` to prepare AI themes in batches of eight
and choose stock images without writing to the database. Review the resumable
`cover-preview.local/cover-refresh-plan.json`, then use `--apply` to save it.
The plan is reused when the game revision and previous cover still match. The
script reads `.env.local`, caches provider searches, accounts for existing and
planned photo IDs, and skips concurrent creator saves. Only the cover is changed;
questions and ordering dates stay unchanged. Creator choices are always excluded.

## Validation

- `npm run build`
- `npx playwright test tests/e2e/game-covers.spec.ts --project=chromium --project=mobile-chromium --workers=2`
- `npx playwright test tests/e2e/game-cover-api.spec.ts tests/e2e/game-image-preparation.spec.ts --project=chromium --workers=2`
- `npx playwright test tests/e2e/game-cover-plans.spec.ts --project=chromium --workers=2`

`/test/game-cover-smoke` is a development-only fixture; it is unavailable in production.
