# Plinkemoji classroom fixes — 20 October 2026

- The question timer is advisory. Zero shows TIME'S UP without flipping, failing the team, disabling written answers or changing the card layout.
- Multiple-choice answers stay visible until Continue. Correct/incorrect feedback plays once when the answer flips; Continue triggers the existing slide-out before awarding a chip or passing the turn. Written-answer preview timing remains unchanged.
- Enlarged question images render in a screen-sized overlay outside the transformed game camera. A reserved close-button row and a flexible image row contain portrait, landscape and square images, including in fullscreen.
- Lizard reach is capped at 80 board units, with shorter anchor selection and a 1.35-second recovery between tongue attempts. The renderer also caps the visible tongue and keeps it attached to the mouth.
- Round intro and the persistent round counter have compact gold/purple 3D plaques.
- Ten bonuses now enter the random offer pool. Sonic travels in straight, gravity-free segments at constant speed between impacts, rebounds from the top boundary, and resumes falling after the first roof hit or 5.5 seconds. Blob reaches mid-board, grows for 2.8 seconds, holds skin against pegs for 0.28 seconds before breaking them, bursts, flutters for 1.65 seconds and falls into an opened box. Only the original creature scores the box and stars.

## New artwork

Created with the built-in image generation tool. Optimised transparent WebP assets:

- `public/assets/games/plinko/bonuses/sonic-v1.webp`
- `public/assets/games/plinko/bonuses/blob-v1.webp`

Sonic prompt:

Create a single large transparent-background 3D emoji-style game bonus icon: Sonic, the recognisable speedy blue hedgehog, cobalt blue swept-back quills, tan muzzle and belly, big friendly green eyes, white gloves, red sneakers, confident cheeky smile. Compact curled running pose, turned slightly to the right, feet and spikes completely within the image with generous padding. Glossy polished toy rendering matching a playful gold-purple-blue classroom arcade game. No words, no letters, no background, no motion trail outside character. Square icon that remains clear when tiny.

Blob prompt:

Create a single large transparent-background 3D emoji-style game bonus icon: The Blob, an adorable lime-green stretchy slime blob with an irregular rounded jelly silhouette, big expressive eyes, a delighted open smile and tiny rounded arms. Translucent glossy elastic gel, brighter yellow-green highlights, rich emerald shadows, cute premium animated-film toy style. A single compact character, whole body fully visible with padding, no words, no background, no ground plane or large shadow, no other objects. Square isolated icon for a playful purple/gold arcade classroom game, clear at tiny size.

## Sonic spin-ball revision

The final chip and chooser icon use `public/assets/games/plinko/bonuses/sonic-v2.webp`. Sonic rotates at 1,100 degrees per second while airborne. Smoke clouds follow sampled positions from the real movement timeline, independently of his rotation, so the trail follows each rebound correctly.

Built-in image generation prompt, with the user's curled Sonic image as pose reference:

Create a transparent-background game sprite based on the attached reference of Sonic curled into a compact spinning ball. Keep the recognisable cobalt blue hedgehog quills, tan muzzle, large friendly eyes, white glove and red sneaker all tucked tightly into one ROUND compact rolling silhouette, no extended arms or legs. The reference shows the desired curled pose; render a fresh polished glossy 3D emoji-style toy version matching a playful purple/gold classroom arcade game. Show his face peeking from inside the curl with a confident smile. Entire round character within a square canvas, generous transparent margin, no purple rectangle, no caption, no words, no other objects. Do NOT bake smoke or motion trails into the sprite: those will be animated separately. Circular shape must stay recognisable when rotated quickly.

## Pinball Chrome theme and opening chip selector

- Applied the selected Pinball Chrome treatment to the menu, team panel, round panel, turn introduction, round announcement, confirmation and team-edit dialogs, question cards, bonus tooltips and image viewer. The theme is scoped to Plinkemoji.
- Moved emoji selection into a native modal before round one. Background controls are blocked until every team has a chip. Manual choices remain unique; Random assigns all remaining teams at once, preserving earlier choices.
- Removed the old chip-selection sidebar sizing. The scoreboard stays visible behind the opening modal and shows a question-mark chip until a team has chosen.
- Checked desktop, portrait and landscape sizing, six-team selection, team editing, confirmation, question/image viewing, bonus selection and a complete scoring turn. The landscape editor uses paired score/star fields to stay within the screen. Closed the browser after testing. Production build and validation passed.

## Compact mobile layout

Portrait phones use a full-width board near the top of the screen and a compact control stack below it. The team panel has one, two or three rows according to the actual team count, without reserved empty rows. Round information and Next turn share one row. Chrome borders are lighter, entry numbers are brighter, and the selected entry has a cyan highlight. Bonuses float temporarily over the board and do not change its width. Desktop and landscape layout rules are preserved.

Verified 2- and 6-team layouts at 320x568, 375x667, 390x844 and 430x932, plus landscape and desktop. All six teams and the bottom controls fit without page scrolling. Checked a complete mobile turn, bonus choice, point transfer and Next turn, and compared desktop dimensions with the mobile stylesheet enabled/disabled. Closed the browser after testing.

## Board-first mobile sizing

The portrait board now always uses the full available width, independent of player count. Taller screens retain full-width team rows; screens up to 740px high use two columns when there are at least four teams. The score panel can scroll while Round and Next turn remain outside that scroll area. The active team is revealed automatically by scrolling only the score panel, leaving the board in place. If even the full-width board and minimum controls cannot fit vertically, the game area can scroll rather than reducing the board.

Verified full-width boards at 320x568, 375x667, 390x844, 430x932 and 620x600. Two and six players both produce the same 308px board width at 320px screen width. Checked access to the last team, five successive turn changes to Player 6, and that only the score panel moves. Desktop controls remain intact. Application type checking passed; test browsers were closed.

## Shared card motion and written-answer Continue

Trivia now opts into the same upward spring entrance and leaning downward exit as Plinkemoji. It retains its blue/white theme, score-header placement and existing smooth flip. Both games share card cue timing through `useQuestionCardSounds`: entrance, flip, reveal, correct/incorrect and departure sounds. Trivia's question buttons also use the same hover cue. Its audio player skips loading the peg-hit clips.

Trivia commits the answered tile and advances the turn after the exit animation completes, including the final question, with a synchronous guard against duplicate score submissions. Plinkemoji written answers now always wait for Continue; the 1.2-second automatic close has been removed.

Validated Trivia on desktop/mobile with multiple-choice, written and spoken/reveal questions, timer expiry, flip-back, double-click protection, the final-question exit and reduced motion. Confirmed both correct and incorrect Plinkemoji written answers remain open until Continue. Production build and audio checks passed. Test browsers closed.
