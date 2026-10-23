# Trivia style picker

The flip-card games offer Classic, Comic Pop, Pinball Chrome, Toy Blocks, Paper Cut and Candy Circuit. The dropdown shows an actual CSS miniature next to each name, with the chosen miniature retained in the closed field. It uses the existing PlayfulSelect keyboard, focus and touch behaviour; the optional rich-option and popup-sizing props do not alter ordinary selects. There is no explanatory copy or extra confirmation step.

`GameConfig.triviaStyle` is the saved preference; `GameRunOptions.triviaStyle` is the current run's choice. Runtime values take precedence. Unknown/missing values fall back to Classic. The common AI/manual configurator defaults to Classic, and the normal library-save preparation also writes that default for Trivia games created through other paths. The eligible modes are Trivia, Jeopardy, Pub Quiz, Darts, Snakes & Ladders, Stop the Fire, Word Wheel and Block Beaters.

Selecting a style immediately updates setup and its parent game's in-memory config. Existing guest-library entries are updated locally. For signed-in owners, the preference saver reads the latest saved config, merges only `triviaStyle`, and updates with both game-id and owner-id filters. Questions, images, titles, visibility and ownership are untouched. Shared/temporary games can use a session style without editing their creator's saved game. A later Save/copy retains the choice through normal game config. Unsaved games are not auto-created by selecting a style.

Rapid selections are saved in order; Start waits for the latest request. A failed save leaves the chosen runtime style available and shows the existing save-failure message. No schema migration is required: this is metadata in the existing config document. Query shape follows the [Supabase update API](https://supabase.com/docs/reference/javascript/update).

All skins and thumbnails use CSS. No new bitmap assets, rendering engine or library was added. Classic keeps the original game appearance; the other options style scores, controls, numbered tiles, question/answer faces and game dialogs. Rules, scoring and card sounds/motion stay shared.

## Checks

- `node scripts/test-trivia-styles.mjs`: five allowed values, Classic fallback, local round-trip, owner filters, fresh metadata preservation, shared/unsaved/converted-game protection and failure handling.
- Browser: AI/manual fixtures saved through the real library helper default to Classic; selecting and reopening setup restores the choice; all five dropdown options contain previews; keyboard selection and the 320px-wide dropdown work.
- Browser: mocked Supabase REST read/update verifies the SDK query and payload without writing to live user data.
- Browser: all five skins complete desktop multiple-choice turns and team editing; six-player mobile layouts at 320 × 568 and 390 × 844 complete written answers and Continue.
- Production build and normal non-Trivia dropdown regression checks. Browser sessions close after verification.

Development preview: `/test/game-smoke?mode=trivia&setup=1&promo=1&playSetup=1`. The optional `styleFixture=1` uses the isolated `trivia-style-smoke` guest fixture to inspect persistence.

## In-game options

Trivia's scoreboard cog opens Game options with the same preview picker and sound toggle. Changes apply immediately and save through the same owner-aware preference helper. The timer pauses while options are open. Closing restores keyboard focus. The dropdown renders inside the fullscreen element when needed.

Runtime options and the parent game's saved appearance stay synchronized for replay and returning to setup. Question initialization depends on the question list rather than the whole game object, so changing appearance cannot reshuffle questions, randomize points or replace bonuses mid-turn.

Checked all five style switches on an active question, timer pause, completing a turn, fullscreen selection, and the picker at 320px width.

Trivia now uses an options-only scoreboard header: the sole top-right cog contains style choice, sound, fullscreen, Quit and End Game. Other games keep their existing header controls. Confirmation dialogs still guard quitting/ending, and the timer remains paused during those confirmations.

Style rendering loads with the Trivia module via its CSS imports. There are no per-style asset requests during a switch. The three added style/preview source files currently total 34,497 bytes, or 5,217 bytes when concatenated and gzip-compressed (an indicative source measurement, not the entire production bundle). Owned saved games still persist each selection through one config read plus one update returning only the ID. Those API responses count as Supabase database egress; guest choices use local storage. Style assets themselves are website static files, not database rows.

Verified desktop fullscreen, sound toggles, Quit/End cancellation, current question/timer preservation, no style downloads on guest switching, and the 320px six-team cog/menu layout. Browser sessions closed after checks.

## Trial sidebar layout

Trivia's question grid starts below site navigation, with the teams and sole options cog in a boxed panel on the right. All five skins apply to the panel. On phones the grid stays full-width and teams sit underneath in two columns; the play area can scroll rather than shrinking the board. Desktop question cards are constrained to the board area so the scoreboard stays visible. Phone question cards use the full game viewport. The shared viewport helper accepts an optional board selector; other games keep their existing header-based placement.

Checked six-team desktop layout, all skin switches during a question, fullscreen, zoom/restore, scoring and Continue, team editing, and 320px mobile board/question sizing.

## Current six-style shortlist

Classic, Comic Pop, Pinball Chrome, Toy Blocks, Paper Cut and Candy Circuit are available in setup and the in-game cog menu, with matching miniatures. Jelly Glass has been removed from the picker, type and Trivia styling; older saved selections fall back to Classic. The original Jelly preview stays in the separate comparison lab.

Paper Cut carries the teal/coral layered paper design through the grid, sidebar, cards and dialogs. Candy Circuit uses cream/raspberry outlines and striped headers. Toy Blocks now has raised cylindrical studs, saturated yellow/blue/red/green bricks, bevel highlights and stacked edges. Its comparison-lab panels and picker miniature match the refreshed brick appearance.

Checked each updated skin's multiple-choice turn, scoring/Continue, team dialog and mobile card; setup can launch a Candy Circuit game. Persistence checks now cover all six IDs.

## Raised brick silhouette

Toy Blocks now uses a shared decorative ToyBrickStuds component instead of interior dot patterns. Two rows of cylinders rise above a sloping top surface on every question tile, sidebar, team row, question/answer face, MCQ answer box and game dialog. The comparison lab uses the same shapes. Only Toy Blocks displays the component; other styles retain their existing appearance. Grid gaps, viewport padding and team-list padding allow protrusions to remain visible. Mobile tiles use smaller caps, while the board/sidebar gap leaves room for the panel studs. Studs are decorative, hidden from assistive technology and do not intercept clicks.

## Toy Blocks restored

The original blue/yellow Toy Blocks design is restored, including its softer tile colours and small interior stud highlights. The raised-silhouette experiment and its shared decoration component were removed. Original spacing, clipping and comparison-lab boxes are restored; Paper Cut, Candy Circuit and the other selected skins remain available.

Clarification: Toy Blocks is restored to the first LEGO-like revision: saturated red/blue/yellow/green tiles and one row of interior stud highlights. The original softer colour version is superseded. Protruding studs and the two-row variation remain removed.


## Shared rollout and mobile layout (21 October 2026)

`utils/flipGameStyles.ts` defines the eight supported modes. `FlipGamePresentation` supplies the seven non-Trivia games with the same style tokens, score sidebar and options menu. `FlipGameHeader` moves only the score display; every game retains its own scoring, turn rules and board artwork. Question timers pause while the shared menu is open. Local style changes do not replace gameplay props or reinitialize a board; the parent preference is synchronized when leaving, finishing or replaying. Saved preferences use the same owner-aware storage helper immediately.

Desktop scoreboards remain on the right and vertically centred, with a minimum half-height panel for fewer teams. On mobile **all eight modes, including Trivia, keep a compact top team bar**. Six teams wrap into two rows. The cog contains style, mute, fullscreen, quit and end-game actions. Cards cover the board area while keeping the team bar visible. `flip-mobile-scorebar.css` controls this arrangement; `useMobileQuestionViewport` measures the actual board edges, including for Pub Quiz and Word Wheel's previously separate overlays.

Styles are CSS already shipped with the application; switching does not download artwork or load a database layout. Saving an owned game's preference uses a small config read/update; guests use their existing local library. No new library or schema is required. Original Toy Blocks uses one interior row of studs, not protruding container edges.

Rollout verification: all eight games on desktop and mobile; all six styles switched in each without changing scores; two-team desktop panels centred at half height; six-team mobile bars above the board; all seven question overlays below the mobile bar; mocked persistence coverage across all eight game types. Browser screenshots are in `output/playwright/` and are not production assets.


## Plinkemoji styles

Plinkemoji is now the ninth supported style mode; Time Bomb remains excluded and unchanged. Plinkemoji keeps its cabinet, board physics and existing responsive layout rather than mounting the generic scoreboard shell. Its setup uses the shared six-option picker and Classic default. A new cog action in the existing desktop toolbar/mobile dropdown opens the same preview picker during play. Selection updates the current run and parent preference immediately without rebuilding pegs, chips, scores, stars or turn state, then saves through the existing owner-aware helper. Question timers pause if the style options are open.

`plinko-styles.css` maps the shared skin tokens to Plinkemoji's score/menu/round panels, popups, chip selector, buttons and bonus tooltips. Its shared question card uses the existing skin styles. Classic uses brand-blue headers and highlights, yellow buttons and white/light-blue panels, distinct from Pinball Chrome. Selected alternatives restyle the surrounding UI without replacing the cabinet artwork. Toy Blocks keeps its single interior stud row.

Validation includes all six style switches with an edited score and stars retained, desktop question-card appearance, a complete question/drop/tally turn, six-player mobile menu selection, setup-to-game style handoff, and persistence tests for all nine supported types. Time Bomb is explicitly asserted unsupported by the style registry.


Plinkemoji's menu actions now live exclusively in its cog dialog on desktop and mobile. The desktop toolbar contains one cog; the mobile cog opens the same dialog directly, without a second dropdown. Quit and End Game close options before opening confirmation. Classic is explicitly skinned with the site's sky-blue, yellow and navy colours, including the question card, chip selector, round displays and team panels. The cabinet artwork and gameplay remain shared across styles.


## Navigation and shared UI follow-up (22 October 2026)

Removed Plinkemoji's old rule hiding `.playful-navbar` and its fixed full-window game root. Normal play now uses a relative surface below navigation and a viewport-height variable that subtracts the navigation space. Fullscreen sets that available height back to the whole window; leaving fullscreen restores the normal layout. Browser checks confirm navigation is visible and clickable on desktop/mobile across all twelve game modes.

`TeamEditDialog` is now shared by Trivia, Jeopardy, Pub Quiz, Darts, Snakes & Ladders, Stop the Fire, Word Wheel and Block Beaters. It uses the same skin classes, labelled fields, keyboard focus handling and Save/Cancel controls. Plinkemoji retains its themed editor with its additional Stars field. Snakes updates the team's actual board square (1?100), not a disconnected score. Stop the Fire edits displayed totals while preserving any pending round-review contribution. Existing game scoring remains owned by each game.

Timer fill, track and readout use explicit data attributes and `game-ui-style.css` palettes for all six styles, including Classic. Game-specific widths, countdowns and warning behaviour remain unchanged. Stop the Fire's animated flame effects are neutralised in colour so the selected palette supplies the timer colour. Snakes' turn-order, dice-roll and turn-complete popup uses the shared panel styles too. Verified all nine styled-game timers, all six Darts timer choices, all nine editors across six skins, plus fullscreen exit and mobile board-position editing. Production build and translation validation pass.


## Desktop scoreboard fallback

The presentation context now lives in `shared/FlipGamePresentationContext.ts`, separate from React component refresh boundaries. Its identity is retained through Vite hot-module replacement, so providers and score headers continue sharing the same layout connection when an already-open game receives code updates. The silent legacy top-header fallback has been removed; the header requires the shared presentation provider supplied by the game runner.

Verified all nine styled games with all six choices: desktop scoreboard stays on the right with no visible legacy Quit/End header buttons. The eight shared-scoreboard games retain the requested mobile top bar; Plinkemoji retains its own mobile arrangement. With all seven presentation-provider games open simultaneously, updated both the context and presentation modules, then verified one sidebar header per game and retained edited names/scores. Snakes & Ladders and Darts are included in these checks.


Jeopardy category headings use a uniform category colour per style, distinct from the question-tile palette: Classic keeps its existing sky blue; Comic Pop uses deep purple, Pinball Chrome violet, Toy Blocks navy, Paper Cut teal and Candy Circuit berry. `jeopardy-styles.css` styles only the marked category boxes and anchors block studs to their own question tiles. Browser checks cover uniform headings, distinction from every question-tile colour, mobile fit and the retained desktop sidebar across all six styles.


## Text contrast

`shared/game-text-contrast.css`, imported by `LazyGameRunner`, keeps foreground/background pairs together for the nine styled games. Pub Quiz marks its quick-score panel, round headings, answer review and scoring screens explicitly; those surfaces and buttons use the current style's paired colours. Header badges, answer letters, result feedback, written-answer placeholders, turn summaries and Block Beaters counters receive the same treatment. Labels over artwork have opaque backing so the artwork cannot undermine contrast.

Chrome and Candy controls use deeper gradients behind light text. Classic uses deeper blue behind small white lettering, dark ink on bright grid tiles, and a light sidebar heading in dark appearance. Toy Blocks retains its studs with a solid face behind the number and a deeper green block. Plinkemoji dialogs use paper surfaces rather than the blue outer Toy Blocks frame. Correct/incorrect feedback keeps its status meaning with separate colours for light and dark cards.

Browser checks compare visible text against rendered surface colours, including gradient stops, using 4.5:1 for normal text and 3:1 for large text. They cover desktop question/answer states, mobile boards/options/team editors, Pub Quiz review/scoring and quick-score hover in dark appearance. Artwork, outlined SVG text and disabled controls require visual review rather than treating this sampling check as a full accessibility certification.


## Seasonal Halloween style

`halloween` is a seventh shared skin for all nine eligible games. The shared decoration component contains local SVG spiders, bats, a moon, a ghost and a pumpkin; `halloween-style.css` supplies cobweb corners, tile mascots, orange/black panels, readable cream text and orange controls. Decorations ignore pointer input, are hidden from screen readers, scale down on mobile and stop moving under reduced-motion preferences. The existing nav, sidebar/mobile scorebar and game mechanics stay in their shared layouts. Jeopardy categories and timer palettes include Halloween.

`HALLOWEEN_STYLE_END` in `utils/triviaStyles.ts` ends the new-game offer at 00:00 UTC on 2 November 2026. Classic remains the default. The picker hides the seasonal option after that date, while normalization, saved-game loading and the current-value picker keep existing Halloween games valid. Changing the end-date constant extends the offer without changing saved content. No remote decoration assets or new runtime dependencies are used.


### Haunted scene motion

Halloween now adds three shaded SVG spiders with individually articulated legs, moving highlights, perspective and cast shadows. They traverse the board in opposite directions and downwards on staggered 34/43/49-second loops. Two translucent ghosts emerge, lunge towards the viewer and retreat for roughly three seconds on staggered 37/53-second loops, beginning after 9/28 seconds. Fog, watching eyes, passing bats and lantern glow complete the scene. These effects share the existing `HalloweenDecorations` component across the nine games; no game-state changes, downloaded assets or JavaScript scheduling timers are involved.

The scene ignores pointer input, stays inside the game area, scales down on mobile, and unmounts when switching styles. Reduced motion hides travelling creatures and scares and stops the remaining movement. Browser checks cover spider travel, the ghost's hidden/visible/hidden sequence, unique SVG shading IDs, mobile width, reduced motion and switching away from Halloween; all nine eligible games pass.


## Neon Lights

The permanent eighth style, `neon-lights`, uses dark purple/black surfaces with pink, cyan and lime light-tube frames and glowing sign-style lettering. `neon-lights.css` supplies the palette and presentation; it uses existing fonts and CSS shadows without remote assets or runtime dependencies. The shared picker, saved-game normalization, timers, question/answer cards, menus, team editors, Plinkemoji panels and Jeopardy category headings include the new choice. Classic stays the default, and Neon Lights remains available after the Halloween seasonal cutoff.

The game-style blog post at `/blog/8` includes the new style in English and Spanish. Its cover and inline comparison use an equal-sized four-by-two grid of the eight actual UI styles.


### Neon colour and lighting update

Neon Lights now uses a thicker multicolour cabinet frame, four separately tinted answer choices and six team palettes (cyan, pink, lime, orange, violet and blue). The same item colours carry through answer-letter circles, score buttons, relevant menu buttons and Plinkemoji team cards. A bright white inner core, coloured tube borders and stronger local glow create a brighter sign effect without changing Trivia's question grid.

Only the decorative inner tube on question faces and team cards flickers: two brief partial-opacity dips on staggered 17/23-second cycles. Text, images and panel backgrounds stay steady; the effect ignores pointer input and is disabled by reduced-motion preferences. Browser checks verify six distinct team borders, four distinct answer borders, a 4px desktop frame, partial decorative dimming, steady question text, mobile fit and reduced motion. Contrast checks pass for the nine games' question/answer states and mobile options/editors.

### Halloween 3D creatures

HalloweenDecorations lazy-loads HalloweenScene and the existing Three.js engine only when Halloween is selected. One transparent WebGL canvas renders lit, shadow-casting spiders with articulated legs, ribbed pumpkins, extruded flapping bat wings and ghosts with deforming cloth geometry. Panel cobwebs remain lightweight vector artwork. No external models or textures are downloaded. Drawing is capped at 30 frames per second and pixel density at 1.5; hidden pages pause, reduced-motion uses a static scene, and switching styles disposes the renderer, geometries, materials and shadow map. Devices without WebGL retain the themed panels without the animated creatures.

Plinkemoji's desktop and mobile cog controls both display the translated Menu label.


### Compact mobile teams

Below 768 px the shared team header is one horizontally scrollable row, with a fixed 44 px cog at the right and no Menu label. There is no separate menu row. Active teams retain their style's highlight plus a focus-colour outline. `useActiveTeamScroll` adjusts only the strip's horizontal scroll position on a turn change or resize, keeping the active team visible without moving the page or question card. Desktop sidebars and labelled menus remain unchanged. Plinkemoji uses the same scrolling helper in a one-row top strip; its board stays full width, and its question card begins immediately below the team strip.
