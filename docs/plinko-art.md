# Plinko artwork

Created with the built-in `image_gen` tool. The game uses generated raster artwork for the cabinet, token and pegs; its moving elements and changing score labels are separate overlays.

## Final saved assets

- `public/assets/games/plinko/cabinet-v4-transparent.png` â€” complete cabinet cutout with a transparent exterior, including the bottom fascia and safe margins on all sides.
- `public/assets/games/plinko/token-v2.png` â€” gold and violet token with a transparent background.
- `public/assets/games/plinko/peg-v2.png` â€” cyan glass and metal peg with a transparent background.

The tightly framed `cabinet-v2.png` is retained as the source for the framing correction; it is not used by the game.

## Background removal prompt

Background extraction only. Remove ONLY the black studio background OUTSIDE the outer silhouette of this Plinko cabinet, replacing it with genuine alpha transparency. Keep the entire cabinet, its complete lower base, gold metal frame, blue-violet lights, internal dark navy glass playing surface and all seven scoring channels fully opaque and unchanged. Preserve exactly the same image dimensions, scale, placement, silhouette and every internal divider and blank score plate; this asset has code-aligned interactive overlays so do not move, resize, crop, redraw, redesign or change perspective. Keep the original transparent margin area matching the former black margin on all four sides. Internal dark glass is part of the object and MUST NOT be removed. No new objects, no pegs, no token, no letters, no numbers. Deliver the isolated complete cabinet on transparent background, without ground plane, without a black rectangle, without studio backdrop.

Input: `cabinet-v3.png`. Output: `cabinet-v4-transparent.png`, generated using built-in `image_gen` with transparency enabled. Dimensions remain 1174 Ã— 1340. The exterior corner has zero alpha; the internal glass remains opaque. Gameplay uses a single charcoal backdrop, without the former title block, side panel or boxed counter.

## Cabinet framing prompt

Edit this production Plinko board asset to fix its excessively tight framing. Zoom OUT so the ENTIRE complete cabinet is visibly contained within the image, including both side protrusions, all four rounded exterior corners, and the COMPLETE lower front fascia and bottom edge. Add generous uniform dark studio-black breathing room on ALL FOUR sides, especially BELOW the cabinet. The full cabinet should occupy approximately 88% of image width and 88% of image height, centered, with a clear 6% safe margin on each side. Nothing touches or crosses the image boundary. Show a finished continuous base under all seven scoring channels; no apparent crop at the bottom. Preserve the exact same premium champagne metal / indigo glass / violet blue light materials, the SEVEN scoring chutes, the empty central glass without pegs, the blank score plates, no lettering or numbers or chips. Keep the board symmetric and frontal, preserve inner geometry and relative proportions. This is a framing correction, not a new design. The original cabinet plus its missing tiny outer edge should all fit comfortably inside the canvas. Full object product photograph, no clipping, do not crop in.

Input: `cabinet-v2.png`, inspected at full size before editing.

## Token prompt

Use case: stylized-concept. Asset type: single transparent game sprite. One circular luxury arcade token, perfectly front-facing and centered, takes up 82% of a square canvas, fully visible on genuinely transparent background. Photorealistic polished champagne gold rim with machined concentric ridges, deep glossy blue-violet enamel inset, a simple raised gold four-point diamond star in the center (no letters, no numbers). Thick metal edge subtly visible bottom-right to give real 3D thickness, warm white studio highlights from upper-left, soft occlusion in rim. Elegant premium game-show hardware, beautifully modeled PBR materials, crisp silhouette, no surrounding objects, no extra coins, no background, no ground plane.

## Peg prompt

Use case: stylized-concept. Asset type: ONE transparent game peg sprite. A single small round polished chrome and champagne metal pin for a premium Plinko arcade board, viewed straight-on with subtle 3D depth. Perfect circular rounded cap, luminous cyan glass center, tiny upper-left white specular reflection, beveled metal rim, short cylindrical stem subtly visible underneath, soft contact shadow directly behind. Centered on transparent square canvas, object occupies 65 percent of canvas, isolated, no text no other objects. Rich realistic PBR metallic materials, visually readable when scaled down to 16 pixels. Not a coin, not a button UI, a tactile physical pin.

## Alignment

`utils/plinko.ts` keeps collisions in board coordinates and projects their positions onto the cabinet artwork. The same projection places pegs, chip, trail and scoring lanes. The chip narrows vertically as it rolls into the angled scoring chutes. Do not independently move artwork or change its crop without adjusting this projection and checking the visible landing against the awarded score.

`SharedQuestionFlipCard.tsx` contains the original Trivia flip-card presentation. Trivia and Plinko both render that component. Plinko replaces the question-points label with its one-chip reward.

## Modular board revision

Gameplay now uses `public/assets/games/plinko/cabinet-modular-v1.png`, an uninterrupted indigo glass backplate inside a gold frame. Built-in `image_gen` edited `cabinet-v4-transparent.png` into this new sibling asset, with genuine alpha outside the complete uncropped cabinet. The original image remains preserved. Entry slots and 3D scoring boxes are drawn from the same coordinates as the physics, rather than fixed dividers baked into an image.

There are always ten entry slots. The scoring boxes grow from three in round one by one each round; peg grids grow from five rows alternating five/four pegs, through six and seven rows, to a maximum eight rows alternating eight/seven pegs. Both zigzag sides are permanently super-bouncy blue electric rails. Red braking sides have been removed.

Each box starts the turn with an intact roof. First contact breaks the roof into falling fragments and bounces the ball upward. A later descent can enter the open box. Roof and peg state is shared across both bonus balls and resets for the next turn. The physics uses the same roof plane and opening boundaries as the rendering; the ball cannot slip sideways from an open mouth into a closed box. Front faces cover balls and fragments as they drop inside, giving the boxes depth.

Turn points accumulate above the board as pegs are hit and balls land. At the end, those points fly to the active team's score and the total counts up. The right panel contains the four game controls at the top, team names and scores in the middle, and the next-turn button anchored at the bottom. The next-turn button remains disabled until the turn and score transfer finish. The faint vertical aimer still only covers the initial fall and disappears on release.

Round one starts at 10, 20 and 30 points. Each later round adds the configured increase (50 by default) to the base values and adds another scoring box. Pocket boundaries, roof contacts, dividers, landing centres and labels use the same actual box count.

### Modular frame generation prompt

Edit target: supplied Plinko cabinet image. Produce a new modular EMPTY cabinet frame using the same sophisticated champagne gold metal, indigo glass and restrained blue-violet illumination. This is a production game asset on genuine transparent background. Straight-on orthographic front view, symmetric rounded rectangle, width:height about 560:640. ENTIRE cabinet visible, continuous complete base, 2% transparent safety margin all around. Remove ALL top entry dividers and ALL bottom scoring channels, ramps and score plates. No fixed slots anywhere. Instead make ONE uninterrupted flat, dark indigo glass inset, rectangular with lightly rounded corners, occupying inner x 6% through 94% and inner y 4% through 96%; it runs continuously from just beneath the top rim almost to the bottom rim. Thin polished metallic gold outer frame with a thin blue-violet light seam, no bulging lower extensions. Minimal reflections inside the glass so code can overlay pegs, entry boxes and variable scoring boxes anywhere. No pegs, no chips, no numbers, no text, no zigzags, no decoration inside the playing field, no subdivision, no top header panel, no bottom ramp, no pre-drawn entry or exit geometry. This is a beautiful EMPTY frame/backplate that permits changing entry and exit counts in code. Material quality and lighting should match reference. Preserve complete uncropped silhouette and genuine alpha outside frame.

## Plinkemoji: emoji chips, stars and creature bonuses

The visible game name is **Plinkemoji**. The stored type remains `Plinko` so existing saved games still open correctly.

Each team chooses a distinct face from six expressions inside the team sidebar before the first turn; Random assigns distinct available faces to every unassigned team at once and starts the round, preserving manually chosen faces. The chosen face appears in its score row, question reward and ordinary drops. The full cabinet, left bonus panel and right score/control panel fit the viewport without page or panel scrolling, including six teams.

Approximately 75% of boxes contain one, two or three stars; the others contain none. Whole-box rounding always leaves at least one box without stars. Their positions rotate each round and remain identical for every team within that round. On an eligible landing, the box's stars fly to the team's star balance. The same box only awards its stars once per turn. Stars reveal that many distinct random bonus options on the team's next correct-answer turn. The team chooses ONE of those options and ALL its stars are consumed. Stars are not prices or individual spending credits; an incorrect answer leaves existing stars available for a later turn.

The left panel appears only during bonus selection and contains only that team's randomly offered icons. It disappears after choosing. Its left-hand space remains reserved on desktop so the board stays centred. Hovering or focusing an offered icon opens a small speech bubble describing its effect. The selected icon also becomes the special chip on the board. Two Balls continues to use the team's chosen face for both moving chips.

- Two Balls: two eligible chips share the peg removals and broken lids.
- Extra Bouncy Ball: stronger peg rebounds.
- Dynamite: a three-second fuse, then a blast destroys nearby pegs. Even an unusually early landing must wait for the fuse and the full 1.15-second blast to finish.
- Lizard: a tongue reaching up to 205 physics units grabs distant pegs. Above the lizard, pegs become temporary anchors for a constrained pendulum swing; release collects the peg. The rendered tongue starts at the mouth using the same rotation, scale and depth as its chip, and follows drifting anchor pegs.
- Chicken: ten bouncy eggs collect pegs; only the chicken earns box points and stars.
- Russian Doll: up to five peg-triggered splits, each releasing two halves and a smaller doll. Every piece can earn peg points. Only the smallest whole doll actually released earns box points and stars.
- Dragon: repeated directional fire bursts scorch pegs.
- Tornado: pulls nearby pegs into its path and recoils as it destroys them.

Both permanently blue electric sides gain one zigzag each round, from one in round one to a maximum of five. Their visible geometry and actual collisions use the same points.

### Generated bonus artwork

All eight icons were made individually with the built-in `image_gen` tool, with transparent backgrounds. The original PNGs and lightweight 512-pixel WebP copies are saved in `public/assets/games/plinko/bonuses/`, named `{bonus}-v1.png` and `{bonus}-v1.webp`. Alpha transparency was checked for every original. The WebP copies preserve that transparency and are used for the panel and moving special chips. Originals and previous cabinet art remain intact.

The complete prompts and saved paths for every icon are recorded in [plinkemoji-icon-prompts.json](plinkemoji-icon-prompts.json). All share a glossy, friendly, rounded 3D emoji style, a fully visible centered silhouette, generous margins, and no lettering, tiles or surrounding background.

Validation: `node scripts/test-plinko.mjs` covers every bonus over eight rounds, every entry, unique shared peg scoring, previously broken roofs, helper scoring restrictions, doll generations, the fuse, zigzag counts, star counts, and distinct random offers. Browser checks cover six face choices, a complete six-team first round, star awards, the exact number of round-two options, consuming all stars, a chicken turn and layout at 1440x900, 1280x720, 1024x600, 390x844 and 844x390.

### Playful motion

Plinkemoji enables an optional spring animation on the shared question card: it rises from beneath the viewport with a small tilt and overshoot, flips to reveal the answer, then automatically slides down after a 1.2-second answer preview, keeping the answer face visible. Entrance rotation skids gently before settling. The exit first leans up 26 pixels with a small tilt, then drops below the screen using a slower spring. Teacher-marked answers exit after OK or Oops; no extra Continue button is needed. The turn is committed only when that exit finishes. The explicit entrance controls keep this animation working even though route transitions disable inherited initial animations. Other games keep their existing card behavior. Dialogs and bonus offers pop in, interactive controls lift and squash, entry labels hop, bonus icons wiggle, and scoring numbers pop during hits and tallying. Reduced-motion preferences use short fades and disable decorative bounce and hover movement.

Browser validation additionally checks the actual entrance moving from below the viewport and overshooting before settling, the deferred slide-down exit, only earned bonus offers appearing, speech bubbles on hover/focus, an empty-star box, and all six teams fitting at five viewport sizes without a permanent bonus panel.

The right control box has a rounded purple rim, raised buttons and consistent team row heights sized for six teams, with unused room below smaller groups. Between turns the next team name overlays its large chosen emoji in the centre of the board. The top counter has no label and stays empty until the first scoring event. Eligible box landings emit rising dust, gold light and sparkles. Bonus choices show only the heading and floating icons, with names and effects in hover/focus speech bubbles.

### Illustrated stage and upgraded effects

The shared stage now sits within a single rounded translucent purple container over the generated arcade backdrop. Desktop reserves equal left and right columns, keeping the board centred whether bonus choices are present or absent. Six-team layout checks pass at 1440x900, 1280x720, 1024x600, 390x844 and 844x390 with no scrolling.

The new explosion combines generated transparent fire/smoke artwork with a short hot flash, expanding shockwave, drifting smoke, ballistic embers, destroyed-peg fragments and a brief board rumble. The lizard swings on a peg for up to 0.68 seconds before pulling it free; ordinary collisions do not remove its anchor early. Floor contact releases the tether. Its tongue remains attached to the moving mouth throughout extension, latch and retraction. Reduced motion disables the decorative cabinet shake.

New built-in image_gen assets are saved as `public/assets/games/plinko/explosion-v2.png` and `arcade-background-v1.png`, with compressed `.webp` copies used in the game. The explosion alpha channel was verified (0–255). Full generation prompts are recorded in [plinkemoji-icon-prompts.json](plinkemoji-icon-prompts.json).
Browser attachment checks compare the tongue start with the actual transformed mouth across 77 animation positions, including rotation, swing and the final shrink into a box. Maximum separation was below 0.001 pixels. Physics checks cover 2,160 turns, retained swing anchors, longer tongue reach and complete explosion playback after early landings.

### Reference-style boxes, round counter and dragon breath

The scoring boxes use the user's reference for the joined 3D shape, while retaining the original champagne-gold faces and roofs, indigo openings and dark purple score numbers. Stars sit at the bottom of each front face. Roof breakage and entry scoring keep the existing shared physics. The round counter reads `Round 2/5` and sits directly above Next turn in the right control container.

The dragon moving chip uses the new open-mouth `public/assets/games/plinko/bonuses/dragon-v2.webp` sprite, with the original preserved. Its separate textured flame asset is `public/assets/games/plinko/dragon-fire-v1.webp`; both original PNGs are retained alongside their web copies. Both were created with built-in image_gen with transparency enabled. Prompts and saved paths are in [plinkemoji-dragon-prompts.json](plinkemoji-dragon-prompts.json).

A shared attachment helper transforms the dragon mouth through position, rotation, scale and landing depth. Fire rendering and collisions use the same growing directed stream, emitting from that moving mouth. Breath grows over 0.12 seconds, flickers, then retracts at the end of a 0.62-second burst. Pegs burn progressively inside the visible stream, rather than disappearing along an old stationary cone. The dragon faces its burst direction while breathing. Fire stops on entry into a box.

Browser checks compared the actual chip-mouth transform with the flame root across 62 animation positions, with separation below 0.001 pixels. Physics checks cover flame growth, forward direction, rejecting pegs outside/behind the stream, rotated breath and stopping inside boxes, alongside the existing 2,160 simulated turns.


### Joined perspective, tornado wind and closer side panels

Box fronts share exact boundaries. Their roofs share a single tapered back edge, inset 12 physics units at each outer end, so every internal divider meets the adjacent roof without a gap. The outer roof slopes use the same perspective as the internal seams. Stars sit seven board units above the front bottom, and score numbers are raised to leave room.

Falling tornadoes carry two layers of wind ribbons, softly shaded orbiting cloud puffs, haze and dust. Back layers sit behind the emoji chip and front layers cross in front of it. Both follow the same position and final sinking transform as the chip, and fade as it enters a box. The existing peg-attraction physics is unchanged.

Desktop columns now hug the centred cabinet instead of spreading across the screen. The gaps account for the cabinet artwork's transparent margins, leaving approximately one centimetre of visible space. Bonus choices align towards the board. The team container uses an asymmetric rounded outline, a slight tilt and a chunky raised gold/purple edge. Compact screens keep their no-scroll arrangement.

Browser checks confirm shared roof/front boundaries and bottom stars for 3, 4, 7 and 22 boxes. Wind attachment checks cover 40 falling positions with no separation. Layout checks cover six teams at 1920x1080, 1440x900, 1280x720, 1024x600, 390x844 and 844x390, with no scrolling or overlap between teams, round counter and Next turn.

### Three sidebar boxes and smooth landings

The right sidebar is a transparent grid of three independent raised surfaces: menu controls, team rows, and round/Next turn. Its combined height and gaps match the visible cabinet rather than the image canvas. `cabinet-modular-v1.png` has a 1174x1340 canvas; an alpha threshold of 32 places the visible cabinet at vertical pixels 38–1270. CSS uses those proportions for sidebar height and bottom offset. The compact phone layout stacks the three surfaces below the board. Team row height is capped and sized against space for six teams, using the team panel's container height; fewer teams keep the same row size and leave room below them.

Only the active team's name pulses, with scale and a soft glow. The pulse transfers on Next turn and is disabled for reduced-motion preferences. The transparent stage now sizes to its grid contents and centres in the viewport, retaining the left bonus space while removing spare full-width background.

An open box gently slows a descending chip near its entry, then gives it a 1.1-second eased settle with a smooth, damped hop and roll. The final sinking transform uses a shared smoothstep curve, so chips, mouth-attached effects and tornado wind remain aligned. The landing burst has three expanding gold rings, twelve staggered shaded dust clouds, eighteen sparkles and a soft rising glow. The score transfers only once the landing completes.

Checks: 2,160 simulated turns cover the full settle, monotonic eased sink, scoring and creature effects. Browser checks verify three separate surfaces, active-name pulse transfer, six-team fit, and sidebar/visible-cabinet alignment within 0.01 pixels at desktop and landscape sizes. The stage shrinks to about 1539px wide on a 1920px display. Portrait-phone checks retain all controls without scrolling.


### Round introductions, sound palette and matching cards

After chip selection, and once at the start of each later round, a Round X banner flies into the board, settles and flies out. Only then does the next team's emoji and Start turn button appear. The intro lasts 2.1 seconds, or a short 0.6-second fade for reduced motion. It does not repeat between teams in the same round.

Chip selection now lives inside the existing team 3D panel, with six face choices and a Random button. Random shuffles the unclaimed faces, assigns all remaining teams at once and starts the round. Any faces already chosen manually are preserved. The mobile starting layout makes extra room for the picker without page scrolling. The generated backdrop uses a darker overlay; only the Plinkemoji instance of the shared question card adopts indigo/purple headers and answer options, cream faces and gold trim. Option text is cream on dark buttons and dark on the gold hover/focus state.

`utils/plinkoAudio.ts` supplies procedural game audio through one lazily unlocked AudioContext, a shared mute bus and compressor. Browser autoplay rules are respected: the first pointer/keyboard action unlocks sound. Mute immediately cuts existing and scheduled sounds; unmount closes the context. No external audio downloads are required.

The ten shuffled, nonrepeating peg sounds are rubber boing, bubble pop, mouse squeak, duck quack, toy laser, tiny giggle, jaw harp, slide whistle, hiccup and wooden bonk. Other cues cover cracking roofs, correct/wrong answers, manual answer reveal, card entrance/flip/exit, quiet button hover, pitched entry-point hover, release, round fanfare, score-flight swoosh and successive coin-stack ticks. Electric rails, landings, stars and bonus choices also have distinct cues. Hover and collision sounds are throttled; a voice limit and compressor control overlap.

The card controller plays answer sounds on the actual flip/marking event, rather than waiting for the card to disappear. Teacher reveal questions play reveal first and correctness only when marked. Score transfer uses its own coin sounds rather than replaying the answer jingle.

Validation: `node scripts/test-plinko-audio.mjs` verifies all ten unique peg sounds in each shuffle cycle and no immediate boundary repeats across 100 cycles. Browser offline-audio rendering verifies all 27 sound definitions produce finite, unclipped samples and a muted scheduled fanfare produces exact silence. Live checks cover one audio context, correct/wrong/reveal timing, hover/drop/roof/peg/coin events, mute throughout a turn, two round introductions across two teams, unique random chips, card contrast and picker layouts from 1920x1080 down to 375x667 and 844x390.
