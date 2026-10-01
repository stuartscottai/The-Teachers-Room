# Browser test investigation — 1 October 2026

## What the supplied report establishes

The GitHub run completed 405 checks: 358 passed, 41 were intentionally skipped,
and six failed. Those six failures represent three distinct problems, rather
than six separate broken features.

| Failure | Cause and user impact | Resolution |
| --- | --- | --- |
| Millionaire zoom, Chrome and Firefox | The game's outer container had no height because its contents are fixed to the screen. Zoom enabled clipping on that container, hiding the game and exposing the footer. The footer intercepted answer clicks. | Reserve the visible screen height while zoom is active, restore the original container style on exit, and keep the zoomed game above the footer. Normal card dimensions are unchanged. |
| Stop the Fire zoom, Chrome and Firefox | The transformed game could paint behind the following footer, which intercepted the zoom-out click. | The same shared zoom layer fix keeps the controls accessible. |
| Darts zoom, Firefox | The test requested a lightweight game, but Darts ignored that setting. The test waited for the 3D intro to complete on a runner whose graphics support is already excluded from the full 3D smoke checks. | Honour the development-only lightweight setting with a clickable bullseye that opens the real question controls. The normal production game still uses the 3D board. |
| Other scoreboard headers, Firefox | Five separate games shared one 30-second test budget. The report shows a timeout, not a failed measurement proving clipping. | Give each game its own test and use the lightweight Darts fixture when checking the header. Keep all containment and equal-size checks. |

The shared test configuration also placed `reducedMotion` at the wrong level.
That means the intended reduced-animation setting was not applied. It now uses
`use.contextOptions.reducedMotion`. Tests that specifically examine animation
still request normal motion themselves.

No forced clicks or additional skips were added to make these failures pass.
The original browser logs and a locally reproduced screenshot confirmed the
footer problem before the fixes. The Millionaire test now also checks that
zoom-out restores the container and does not enter browser fullscreen.

## Separate findings and recommended follow-up

These are confirmed in the current workspace; they cannot be attributed to
an unavailable earlier conversation.

1. **Code consistency is now checked in every build.** The original checker
   failed because React's code definitions were version 19 while the app uses
   React 18, and some descriptions of saved games, images, and test data were
   incomplete or outdated. Compatible React 18 definitions are now pinned,
   those data descriptions are corrected, and an unreachable duplicate live
   quiz button is removed. The website and Supabase server functions now have
   separate checks appropriate to their environments. Both pass, and
   `npm run build` runs them before preparing the website. The existing GitHub
   build therefore checks them too. This checks code without running the
   email function or sending any messages. See [testing.md](testing.md).
2. **Large downloads remain.** The production build warns about JavaScript
   bundles over 1 MB before compression. This can slow initial loading,
   especially on mobile connections. Inspect the large bundles and load heavy
   libraries only when the feature using them is opened. Raising the warning
   threshold would not improve loading speed.
3. **There are deliberate coverage gaps.** Phone zoom is intentionally absent.
   The live production checks are skipped without their dedicated test-account
   configuration, and full Darts/Snakes 3D checks are skipped on Firefox.
   A passing local suite therefore does not verify live account-email delivery
   or every device's 3D support. Keep lightweight functional checks and separately
   verify the full graphics on supported browsers and real devices.
   Some existing Snakes & Ladders mobile helpers also trigger button events
   directly because the sticky navigation can interfere with automatic test
   scrolling. They verify game behaviour but do not prove a finger tap is
   unobstructed. Add real tap checks on short phone screens when reviewing
   that layout; this is a coverage limitation, not a newly confirmed user bug.
4. **Browser compatibility metadata is old.** The Browserslist warning concerns
   an outdated list used to choose browser-compatible styling, not a page crash.
   Update the list in a separate dependency maintenance change and rerun the
   responsive checks.

## Verification

- Focused zoom and scoreboard checks: 41 passed, 13 intentional platform skips.
- Production build, privacy validation, and search-page validation: passed.
- Complete browser suite: 376 passed, 41 intentional skips, zero failures
  (417 checks across desktop Chrome, mobile Chrome, and Firefox; 11.6 minutes).
  The total increased from 405 because the five-game scoreboard test became
  five independent tests in each of the three browser projects.
- Website and Supabase code-consistency checks: passed after the cleanup.
- Follow-up checks after the code-consistency cleanup: 122 passed, four
  intentional platform skips, zero failures (126 checks across desktop Chrome,
  mobile Chrome, and Firefox; 3.4 minutes). These cover game launches, images,
  cover selection, survey imports, trending games, and live quiz test fixtures.
  The production build also passed with both new code checks enabled.
- GitHub/Linux verification must be rerun after the changes are pushed.

Changes have not been committed or deployed.
