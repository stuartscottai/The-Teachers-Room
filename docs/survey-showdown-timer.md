# Survey Showdown answer timer

Uses the existing GameRunOptions.timerSeconds. Zero hides the timer and keeps untimed play. Each guess gets a fresh countdown, even when the same team is the only team left. The footer shows seconds and a shrinking bar (sky, amber at 10 seconds, red at 5). It does not flash. At zero, the existing strike sound/overlay appears with Time's up, then the turn passes after the strike animation. Existing mute control applies.

Teachers can pause/resume. Team editing, host preview, enlarged images/answers and quit/end confirmations automatically pause the countdown. Round/game completion and unmount stop it. Repeated submissions during a strike are blocked and the delayed strike transition is cleaned up on exit.

Verified in the local dev-only /test/survey-showdown-capture fixture, optionally ?timer=3. Nothing is saved to the database. Mobile and desktop screenshots: output/playwright/survey-timer-mobile.png and survey-timer-desktop.png.

Browser checks can be run with an open Playwright CLI session using run-code --filename scripts/check-survey-timer.cjs and scripts/check-survey-timer-turns.cjs. Checks cover pause/resume, expiry, successful-answer reset, no-timer mode, modal pause, six strikes eliminating two teams, sole remaining team reset, and round completion. npm run build passed.


Projector layout update: the timer is now 40px tall on desktop and 32px on mobile (reduced by 50% at the user?s request), with large high-contrast seconds inside the remaining-time bar. The clock and label sit inside the left end; pause/resume sits to the right. Manual pause permits typing, submitting and awarding answers; the next turn automatically starts a fresh, running countdown after either a correct answer or the incorrect-answer strike animation. Strike overlays still prevent duplicate submissions. Browser verification covered a correct answer entered while paused, points awarded, automatic timer resumption on the next turn, and both viewport sizes. Build passed.

The label and clock now overlay the full-width countdown fill rather than occupying a separate left-hand panel. The fill shrinks behind both label and seconds; pause/resume remains outside on the right.
