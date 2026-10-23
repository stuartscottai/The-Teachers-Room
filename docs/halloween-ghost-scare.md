# Halloween full-screen ghost

Asset: `public/assets/games/halloween/ghost-scare-v1.webp` (1536 x 1024, alpha preserved, about 382 KiB). Generated with the built-in image-generation tool; converted to WebP for delivery. The original PNG remains in the Codex generated-images library.

Generation prompt:

> Create a single polished Halloween game overlay asset: an enormous screaming ghost FACE viewed directly head-on, filling almost the entire canvas, landscape 3:2 composition. Only the face and wispy edges, no body, no scenery, no text. Spectral milky white and pale icy lavender translucent mist, deep hollow black eye sockets with faint pale pupils, stretched open screaming mouth, expression spooky and startling but suitable for a classroom Halloween game, no blood or gore. Cinematic realistic volumetric smoke and sculpted ectoplasm, dramatic relief and subtle cold rim lighting. Eyes widely spaced across upper half, huge mouth lower centre. Face should be clearly readable over a dark purple game. Outer forehead and cheeks dissolve smoothly into genuinely transparent alpha background; internal mist partly translucent, not a solid rectangular background. High quality rendered ghost portrait, not a flat cartoon or icon. It will appear at large viewport size briefly. Do not add any checkerboard or background colour.

The first appearance is after 180 seconds with Halloween selected, repeated every 180 seconds. A fixed, click-through portal fills the viewport (or the fullscreen element) until the full recording finishes (about 3.31 seconds). The image remains still; repeating small opacity dips provide the flicker. Reduced-motion keeps the image steady. Hidden tabs skip an appearance instead of queuing one for later. Switching away from Halloween cancels both timers and closes its audio context.

Sound uses the user-supplied **Scary Scream** recording by **DRAGON-STUDIO**, from https://pixabay.com/sound-effects/film-special-effects-scary-scream-401725/ under the Pixabay Content License. The source MP3 stays in the user's Downloads folder. The game serves `public/assets/audio/halloween/scary-scream-401725-v2.mp3`: the full 3.31-second recording, retaining the original pitch/speed, reducing the peak to about -5 dB, and adding 5 ms / 30 ms fades to avoid clicks. Full source attribution and processing details are in `public/assets/audio/halloween/sources.json`. This independent audio bus follows the current game's mute state, including changes mid-effect. The recording preloads when Halloween mounts. Audio preparation recognises earlier player interaction (including the style-picker click), and each scare retries a suspended audio context before playback. A brief synthesised voiced scream covers a missing or still-loading recording. Unsupported or blocked audio does not interrupt gameplay.


## Immediate local preview

Visit `/test/halloween` in the local preview. Play ghost + scream triggers the identical full-length effect used by the three-minute timer. A mute checkbox and sound status allow quick checks. The page is development-only and excluded from the live production routes.

Playback checks measure non-zero audio samples through a real browser audio analyser for the recording and missing-recording fallback, as well as mute and resume after suspension. This verifies sound is actually produced, rather than only checking that a playback function was called.


The decoded recording duration controls the display time. Its actual playback-ended event removes the ghost; a short backup timer covers failed playback. Repeated previews stop the earlier sound, and old playback callbacks cannot dismiss a newer ghost. Muted playback shows the face for the same full duration.
