# Trivia and Plinkemoji question-card comparison

Compared the current local implementation on 20 October 2026. Browser checks used the same test questions at 1440x1000 and 390x844, with a two-second timer. Written-answer checks used the same correct answer on mobile. No game behaviour was changed during this review. The test browser was closed afterward.

| Area | Trivia | Plinkemoji |
| --- | --- | --- |
| Shared foundation | SharedQuestionFlipCard | The same SharedQuestionFlipCard, with its own controller, theme and animation settings |
| Colours | Sky-blue question header; white body; dark text; pale answer options | Purple gradient header; cream body; purple text and options; gold borders and hover highlights |
| Header reward | Question point value (100 in the test) | Team emoji and one chip |
| Screen space | Question sits below the game score header (210px from top on test desktop, 135px on mobile) | Full-screen overlay starts at 0px; board and scoreboard are covered |
| Opening | Fade-in overlay; no sliding card movement | Card slides up from below the screen, overshoots slightly, tilts and springs into place; tilt settles over 0.85s |
| Answer flip | 180-degree horizontal flip with a 700ms CSS transition | 180-degree horizontal flip using spring motion, with a softer settling bounce |
| Closing | After Continue or marking the answer, waits 1.5s and removes the card; no downward card animation | Leans upward 26px and tilts -3 degrees for 0.22s, then slides downward with a spring and fades out; does not flip back first |
| Multiple choice | Select answer, flip, review result, press Continue | Same review-and-Continue flow |
| Written answers | Submit, review result, press Continue | Submit, review briefly, automatically start closing after 1.2s; Continue is hidden |
| Spoken/reveal questions | Check flips the card; teacher marks OK or Oops | Same controls, followed by the custom exit animation |
| Timer expiry | Shows Time's Up; leaves the question open and accepts an answer | Same advisory behaviour; no forced flip or automatic failure |
| Feedback | Same correct/incorrect symbol and small symbol bounce | Same shared feedback; question-card buttons also have extra hover lift and pressed scaling |
| Sounds (source inspection) | Tile-select, timeout and answer-result sounds; answer-result sound runs when the answer is confirmed | Custom card-in, card-flip, card-out, reveal and correct/wrong sounds; multiple-choice/written result sound runs on reveal; manual result sound runs when marked |
| Text fitting | Question/options fit available space; special answer fitting is mobile-only | Question/options use similar fitting; answer fitting also runs on desktop and reserves space for the correct/incorrect feedback block |
| Image zoom | Desktop-only image zoom, scaled within the game | Desktop-only image zoom in a separate full-screen viewer; image is constrained to the available screen |
| Card enlargement | Shared enlarge/shrink control | The same shared enlarge/shrink control |
| Reduced motion | Normal CSS flip path | Custom motion switches to short fades and a shorter flip |

## Main findings

1. The clearest classroom-use inconsistency is written answers: Plinkemoji moves on automatically, so teachers cannot pause indefinitely to discuss a typed answer as they can in Trivia.
2. Plinkemoji gives more screen space to the card. In the mobile comparison, all four short options fit on one line, whereas two Trivia options wrapped. This is partly a consequence of its full-screen layout and different available space, rather than a completely different card design.
3. The shared drawing component does not mean the behaviour is fully shared. TriviaGame and StandardQuestionCard each manage timer, marking, sound and text-fitting logic separately. That is where future inconsistencies can reappear.
4. Some useful Plinkemoji safeguards are absent in Trivia's answer-fitting logic: desktop fitting and accounting for the multiple-choice feedback height. This is a difference found in the source, not a claim that every Trivia answer currently clips.

## Recommended direction

Keep each game's own colours and animation personality. Align the teaching controls: manual progression after written answers, the same advisory timer rules and consistent feedback/image fitting. Reuse the common behaviour where practical so fixes apply to both games.

## Evidence

Browser screenshots in output/playwright:
- trivia-card-desktop.png / plinkemoji-card-desktop.png
- trivia-card-mobile.png / plinkemoji-card-mobile.png
- trivia-answer-mobile.png / plinkemoji-answer-mobile.png

Relevant implementation files:
- components/games/shared/SharedQuestionFlipCard.tsx
- components/games/TriviaGame.tsx
- components/games/shared/StandardQuestionCard.tsx
- components/games/plinko.css
- components/games/shared/useMobileQuestionViewport.ts

The browser sessions were muted. Sound differences above were checked in source, not by a listening test. Image zoom differences were inspected in source; this comparison did not repeat the separate aspect-ratio image tests.

## Changes implemented after this comparison

This table records the earlier comparison. Trivia now shares Plinkemoji's entrance, exit and card sounds, while retaining its own colours, score-header position and smooth flip. Both games now wait for Continue after written answers. The other differences described above remain unless changed separately.
