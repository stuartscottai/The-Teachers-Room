# Plinkemoji box comparison and rotating pegs

Temporary local comparison page: `/test/plinkemoji-boxes`.

The page shows ten interactive box families with matching menu, team and round panels: Wonky Arcade, Comic Pop, Jelly Glass, Sticker Stack, Pinball Chrome, Inflatable, Toy Blocks, Prize Tickets, Neon Console and Cloud Club. It includes 2/4/6 team selectors, next-turn/active-team demonstrations and a large board preview for each family. The preview also switches between all five peg styles. Selections stay in the comparison page; they do not replace the game's current boxes.

The comparison route is development-only and outside the sitemap; its route metadata inherits the `/test` noindex policy. It does not require or write account data.

Peg artwork in the actual game cycles by round:

1. Arcade buttons
2. Jelly bumpers
3. Neon rings
4. Golden rivets
5. Crystal gems
6. Repeat from arcade buttons

`plinkoPegStyle(round)` owns the five-round cycle. The board uses it for live pegs, blast fragments, tornado pulls and Blob skin contacts. Geometry, scoring, movement and collision sizes stay unchanged. All styles use the same peg-centre coordinates. The neon style has separate blue/gold/red sprites; the other four styles use their blue source artwork with the game's colour filters for gold/red variants.

Seven transparent 256px WebP sprites live under `public/assets/games/plinko/pegs/`. They were created with the built-in image generation tool; exact prompts and paths are in `docs/plinkemoji-peg-prompts.json`.

Checks include all ten board previews, 50 peg-family/preview asset combinations, six-team fit, mobile widths, working next-turn controls, actual game progression through rounds 1–7 and the repeated sequence from round 6. Test browsers are closed after verification.

## Expanded style review

All original ten previews remain in their original order. Options 11-15 add Studio Modern, Holographic Orbit, Paper Cut, Space Mission and Candy Circuit. A jump link goes directly to the new examples. Each supports the same menu, 2/4/6 teams, active-team selection, Next turn and full board preview. They remain comparison-only.

Pinball Chrome (05) now has a thicker silver cabinet frame, cyan neon inlays and magenta active-team details, reflected in the live Trivia skin and dropdown miniature. Trivia's selectable shortlist is Classic, Comic Pop, Toy Blocks and Pinball Chrome. Older Jelly Glass settings fall back to Classic; the original Jelly Glass preview remains available for comparison. Other games have not been migrated.

Checked the retained original ten, all five new large previews, six-team interactions, 390px mobile fit, and live Trivia Chrome question/answer progression. Type checking and translation validation pass.
