# Plinkemoji peg-hit audio

The seven specific Pixabay effects selected by the user are stored locally in `public/assets/audio/plinkemoji/pegs/`. The general `/sound-effects/search/hit/` link was a search page, so no extra sound was selected from it.

| Effect | Creator | Original |
| --- | --- | --- |
| Spring Boing | Universfield | https://pixabay.com/sound-effects/film-special-effects-spring-boing-229170/ |
| Mouse animal sound | Soumages | https://pixabay.com/sound-effects/nature-mouse-animal-sound-367490/ |
| Punch Impact Hit | Universfield | https://pixabay.com/sound-effects/film-special-effects-punch-impact-hit-567196/ |
| Umph! | freesound_community | https://pixabay.com/sound-effects/film-special-effects-umph-47201/ |
| Bewilderment Animal Crossing SFX | Chroma_mod | https://pixabay.com/sound-effects/film-special-effects-bewilderment-animal-crossing-sfx-233483/ |
| Pig Grunt | qubodup / freesound_community | https://pixabay.com/sound-effects/nature-pig-grunt-100272/ |
| horn | digitalstore07 | https://pixabay.com/sound-effects/film-special-effects-horn-430368/ |

Downloaded using the public download buttons on 20 October 2026. Source pages identify the assets under the [Pixabay Content License](https://pixabay.com/service/license-summary/). Full source URLs, creator names, crop offsets, durations and volume adjustments are recorded in `public/assets/audio/plinkemoji/pegs/sources.json`.

Processing: remove leading silence, keep one short sound (0.24-0.85 seconds), add 3ms/45ms edge fades, adjust toward -19dB RMS without exceeding a -5dB source peak, and encode mono 44.1kHz MP3 at 96kbps. The seven game files total roughly 47KB. Full-length downloaded originals are retained only in the ignored local test-artifact folder.

Playback: decode local files once after sound is unlocked; shuffle through all seven without repeating at the shuffle boundary. Route clips through the existing master mute and compressor. Limit overlapping clip voices to four, fading the oldest tail during rapid hits. Existing synthetic effects remain a fallback while samples load or if a file fails. All other game sounds remain unchanged.

Validation: all seven MP3s decoded in the browser, with decoded peaks at or below roughly -5dB and durations under one second. A full game turn played the recorded samples on peg impacts. Rapid-hit testing confirmed at most four clip voices, immediate master mute after the audio rendering step, cleanup after tails finish, synthetic fallback with missing buffers and safe disposal during loading. Shuffle tests passed 100 cycles; the production build and its validation checks passed. All test browsers were closed.
