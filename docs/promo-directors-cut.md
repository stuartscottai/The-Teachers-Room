# Separate full-HD promo edit

The approved cut is now the homepage video. The original MP4 remains available
as an archive. Review the approved version at `/assets/promo/directors-cut.html`; its download is
`/assets/promo/classroom-games-directors-cut.mp4`.

The new edit follows the requested order: title; twelve boards in quick succession;
Trivia Q&A; Time Bomb Q&A; Snakes and Ladders Q&A; Word Wheel Q&A; Millionaire Maker
Q&A; dart flight; radioactive barrel; moving board piece; Survey Showdown X;
Live Quiz teacher and phone; scoreboard; winners; final brand page.
There are no added game titles, promotional messages, stickers or popup overlays.

## Capture and editing

Run the local development server on port 5174, then:

```powershell
node scripts/capture-promo-directors-cut.mjs
python scripts/render-promo-directors-cut.py
```

To update only the soundtrack while preserving the last rendered picture:
`python scripts/render-promo-directors-cut.py --audio-only`.

Capture can also select modes, for example `node scripts/capture-promo-directors-cut.mjs darts`.
Run captures sequentially. Each take is saved in ignored
`output/playwright/promo-directors-cut/`, with a frame manifest and per-process
recovery manifests. Python requires Pillow and imageio-ffmpeg.

The recorder creates 1920 × 1080 JPEG frames at quality 97, at 30 animation steps
per output second. The camera/game clock advances one frame at a time; slow
computer drawing therefore does not become repeated video frames. CSS transitions
and native video effects are advanced alongside the game clock. The two-renderer
Snakes scene uses an explicit timer/animation-frame scheduler to avoid a fake-clock
stall. Its complete room, furniture, board and pieces are retained.

Board overviews are native full-HD PNGs. They last 22/23 frames each, alternating
to give a nine-second opening montage. Animated scenes use freshly captured game
frames, rather than the previous browser WebM recordings. The export is H.264 at
CRF 16, full HD, 30 fps, with stereo AAC at 256 kb/s and a streaming index at the
start of the file. No game viewport is cropped or enlarged past its capture size.

Live Quiz uses the production teacher and student components with development-only
local sample data. The mobile question matches the teacher’s question. It is
composited at its native 390 × 844 size next to the entire teacher screen. The
capture sends no quiz answers to a real classroom or database. Regular student
smoke tests retain their existing fixtures.

The renderer writes `timeline.json` alongside the raw frames. Optional descriptive
captions describe the action; they are not burned into the video. The final page
contains only the closing slogan, logo and brand name. The renderer verifies that the previous
homepage MP4 has the same SHA-256 fingerprint before and after rendering.

## Music

“Upbeat Forever” by Kevin MacLeod (incompetech.com), 164 BPM, bass/guitar/drums/horns.
[Creator’s track page](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1500063).
Licensed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).
The edit uses an excerpt with fades and adds short game sound effects. Attribution
appears in the metadata, review page and downloadable credits, with none in the
video picture. When publishing elsewhere, retain the attribution in the video's
description or accompanying credits as allowed by the creator's FAQ.
The source music download remains in ignored working files.

## Validation

The completed export is 61 seconds, 1920 × 1080, 30 fps, approximately 24.1 MB,
with stereo 48 kHz AAC audio. A complete decode of its video and audio passed.
All 27 scenes were sampled from the final MP4 for visual review, including the
full room, action shots, device composite, winners and uncropped end page.
Desktop playback started successfully with no dropped frames in the playback
sample; seeking to the closing page passed. The review page fits a 390 px mobile
viewport without horizontal overflow. Browser checks reported no page errors.

The normal build and TypeScript checks passed, along with all six existing
desktop/mobile Live Quiz smoke tests. A preview student answer visibly submitted
without sending a classroom write request. The homepage still loads
`classroom-games.mp4?v=3` after clicking play. Its original SHA-256 fingerprint,
`3FD7F753C4F56C5EFAC9CE5B15893050617F9250475820568828F1E424703FA8`, is unchanged.

At the user's request the revised closing frame has no visible music credits;
the soundtrack and gameplay edit remain unchanged. Attribution remains directly
below the review player and in the accompanying credits file and metadata.

A direct Trivia comparison at the same 1920 × 1080 viewport found identical
normal and recording option styling: 1 px `rgb(226,232,240)` borders, 6 px gaps
between options, 567 px option width, and approximately 209 px from the bottom of
this short question text to the first option. Recording moves the whole card up
when removing the navigation, without changing those internal measurements.
Those measurements describe only the inside of the card. They did not account
for the larger outer gaps above and below the card; the earlier explanation
incorrectly treated the two as the same issue.

The updated Trivia, Time Bomb, Snakes question, Word Wheel and dart recordings
use a 1536 × 864 browser viewport with 1.25 device pixel density, producing native
1920 × 1080 frames. This uses the normal website card proportions at a tighter
viewing size without overriding card styling, stretching, cropping or enlarging
video frames. Trivia's outer vertical gaps are now approximately 45 output
pixels, compared with approximately 144 in the previous recording. Single-take
capture preserves the other approved boards and action sequences.

The new dart take aims at the actual canvas centre and requires a bullseye
result. The landed dart must remain visible in the centre of the board.

The replacement export passed complete audio/video decoding and browser playback
checks. Before/after images from the final MP4 confirm all four cards' tighter
framing and the full landed dart, including its flights, inside the playing area.
Decoded frame samples for the other 22 scenes are identical to the approved cut,
and the soundtrack was unchanged during that framing revision. No game source
changes were needed.

## Superseded soundtrack trial validation

The later soundtrack replacement preserves the entire encoded video stream
exactly (matching SHA-256 hashes). The decoded AAC audio measures -18.07 LUFS
with a -3.26 dB true peak and zero clipped samples. The 120 Hz low-pass comparison
measures the new low band at -29.8 dB mean versus -19.2 dB in the former mix;
relative to overall level, it is 6.5 dB lower. The new mix uses a 120 Hz high-pass
filter and two-pass loudness adjustment targeting -18 LUFS / -3 dB true peak.
These checks verify digital levels; no claim is made about an individual speaker's
acoustic response. Credits remain outside the video picture.


## Final music choice

The user preferred the previous ska track. The complete approved file from before
the Life of Riley trial has been restored exactly, verified by SHA-256. It retains
the corrected question-card framing, the bullseye throw, and the closing page
without visible credits. The renderer and all accompanying music credits again
use Upbeat Forever. The review source uses `?v=5` to refresh cached playback.

## Homepage integration

The user approved this version for the homepage. The player now uses the final
MP4 and poster, displays 61 seconds, and loads its optional English or Spanish
captions. The archived 90-second MP4 remains available but is no longer the
homepage source. The user subsequently removed the tagline, text description and
music credit link beneath the player while deciding the final credit placement.
The credit file, metadata and review-page attribution remain available.
Desktop English and mobile Spanish playback checks passed, including 27 caption
cues per language, the correct 61-second source, controls and click-to-load
behaviour. The full production build passed after this change.
