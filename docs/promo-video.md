# Homepage promotional video

The approved homepage video is now the 61-second Full HD cut with Upbeat Forever:
`classroom-games-directors-cut.mp4?v=5`, its new poster, and matching English/Spanish
optional captions. It has no promotional popups or visible music credits. At the
user's request the tagline, video description and music credit link below the
player have been removed; the user will decide the credit placement later.
See [the current edit documentation](promo-directors-cut.md).

The remaining notes describe the archived 90-second version.

The homepage places the video after the four benefits and before testimonials.
The player waits for an explicit click before mounting the MP4 source. It includes
native playback controls, English/Spanish caption tracks, a text description,
an error/retry flow, and a link to the games. No autoplay or looping.

## Deliverables

- `public/assets/promo/classroom-games.mp4`: 90 seconds, 1280 × 720, 24 fps,
  H.264 video / AAC audio, with the index at the start for streaming.
- `public/assets/promo/classroom-games-poster.webp`: stills from captured games.
- `public/assets/promo/captions-en.vtt` and `captions-es.vtt`.
- `scripts/capture-promo.mjs`: captures real game components through local test routes.
- `scripts/render-promo.py`: edits footage, renders brand graphics, composes the
  original soundtrack and exports the final assets.

The cut opens with “The Teachers Room”, introduces all twelve game modes, moves
into a four-game montage and closes with “Time to Gamify your classes”, the
existing graduation-cap logo and the brand name. Each game gets six seconds:
four seconds of its own board/overview followed by two seconds of gameplay.
Darts instead uses a shorter overview and question followed by a verified visible
throw and its landing result. A centred, professionally finished popup shows the
game name and message, with brand blue, restrained yellow accents, rounded
lettering, soft shadows and a smooth entrance. It disappears
after two seconds to leave the game unobstructed. The closing montage compares
four different complete boards for eight seconds.

All footage uses the entire 1920 × 1080 recording, proportionally reduced to
1280 × 720. There is no editorial cropping, zooming or panning. The recorder
fits the game to the browser viewport without entering native fullscreen,
which can clip headless Chromium's recorded surface despite correct screenshots.
QA must inspect frames extracted from the MP4, not just browser screenshots.
The Snakes recording retains the complete room, furniture, table, board and pieces.
The dice popup is briefly hidden for the overview, then restored before rolling.
Do not replace Math.random with a constant during WebGL capture: Three.js also
uses randomness for object identities, and duplicate identities corrupt the room.
Live Quiz uses the actual production host component with development-only local
session data, including its colourful answer tiles, timer, reveal and standings.
Both Live Quiz test entry points use this host, rather than the solo Trivia fallback.


`pages/promoGameData.ts` contains varied authored questions. Trivia has 24 tiles;
Jeopardy has a 5 × 5 board with 25 distinct questions; Pub Quiz has four rounds
with six questions each; Word Wheel has 26 different clues. Each filmed question
uses a different subject and answer. Regular automated tests retain their
original fixtures. Live Quiz has its own opt-in demonstration question.
Time Bomb uses a separate 24-question maths set because it advances immediately
after correct answers; its follow-on questions cannot repeat Trivia's content.

## Rebuild

Start the development server on port 5174:

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort
```

In another terminal, run:

```powershell
node scripts/capture-promo.mjs
python scripts/align-promo.py
python scripts/render-promo.py
```

Python needs Pillow and imageio-ffmpeg. Capture uses the installed Playwright
browser library, full animations, and the full 3D games. The test route's
`promo=1` flag substitutes demonstration teaching content; ordinary tests keep
their original fixtures. Capture does not log into accounts, generate paid
content, or save games. Failed modes can be recorded individually, e.g.
`node scripts/capture-promo.mjs darts livequiz`.

Run alignment before rendering and review `darts-flight-verified.png`. The
alignment pass detects the visible red dart and places the cut just before it. Wall-clock action timestamps can drift from
recorded frame times while the computer renders a complex 3D scene. Alignment
locates the recorded reference stills. Rendering normalizes the recording to a regular frame rate and decodes before trimming rather
than seeking into WebM recordings, whose seek points can select a different
moment during heavy 3D capture. The final MP4 still needs visual review.

Raw recordings, stills, the edit manifest, score WAV, intermediate clips and QA
screenshots live in ignored `output/playwright/promo-v2/`. Keep this folder if you
want to re-edit without recapturing. The final MP4 is tracked with the website.

## Credits

Gameplay and logo: existing The Teachers Room assets and game components.
Music: original programmatically composed and synthesized instrumental in
`scripts/render-promo.py`, with no third-party recordings or samples.
Typeface: [Fredoka](https://github.com/google/fonts/tree/main/ofl/fredoka),
available under the SIL Open Font License; the renderer downloads it for raster
title graphics. No separately licensed stock soundtrack is included.

## Validation

The complete website build passed, including browser/server type checks,
translations, privacy checks, page indexing checks and share-preview checks.
Browser QA covered 1440px desktop and 390px mobile: no early MP4 requests,
successful audible playback, duration 90s, playback completion, no horizontal
overflow and recovery after an intentionally failed video request.
All twelve recordings completed without browser exceptions.
Extracted frames from every exported section were compared against the complete
source recordings: all twelve retained the whole frame, with no clipped gray
recorder padding. Separate contact sheets verify the centred popups, clear
boards, and gameplay/question shots.

The shared question viewport reset now runs on desktops as well as phones. It
resets the game and every scrolling parent before the question paints, then
locks the page root until the overlay closes. Grid question backgrounds now
start at the measured scoreboard edge, avoiding gaps caused by fixed header
height estimates. Stop the Fire also resets when
moving into its scoring review. Regression checks open Trivia, Jeopardy and
Block Beaters after scrolling and exercise their zoom/fullscreen controls.
