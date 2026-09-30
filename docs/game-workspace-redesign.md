# Game workspace and account redesign

Implemented locally on 29 September 2026. Covers Configurator, Editor, Preview, Profile and Game Setup.

## Shared design

- Existing Fredoka headings, Quicksand body text, blue actions and yellow play buttons.
- A shared 1,248px content boundary, restrained borders, smaller headings and consistent spacing.
- Responsive layouts, visible keyboard focus and practical touch targets.
- Secondary actions in labelled menus or disclosures; important actions remain visible.

Shared styles and small interaction helpers live in `components/games/game-workspace.css` and `GameWorkspace.tsx`.

## Page changes

- **Configurator:** grouped details, question settings and sources; a compact summary with the creation action; inline validation. Existing game-specific settings remain available.
- **Editor:** editable title and compact action bar, expandable question rows, answer options with a correct-answer selector, and a collapsible cover editor. Collapsing a question preserves its draft. Editing a correct option updates the saved answer as well.
- **Preview:** smaller cover and metadata, separate selection/play toolbar, readable options without a duplicate answer column, and study cards with explicit answer reveal.
- **Profile:** smaller identity header, activity figures in a row, personal details alongside plan/school information, and expandable password and account maintenance sections. Existing account service handlers remain intact.
- **Game Setup:** compact heading, consistent teams/rules panels, relevant game options and a persistent Start action. Empty panels for unsupported features are removed.

## Validation

- Full `npm run build` passed, including privacy validation, prerendering and SEO checks.
- Existing cover/image tests: 15 passed, one desktop touch test skipped as expected.
- Existing create-game and Sound Lab layout checks passed on desktop and mobile. Two initial desktop timeouts passed on an individual rerun.
- Configurator and Editor checked across 12 game types on desktop; Configurator, Editor and Preview across 12 game types on mobile, without horizontal overflow or page errors.
- Setup checked at desktop and narrow phone widths. Profile activity and avatar dialog keyboard handling checked with a local test account.
- Intercepted Editor/Preview checks confirmed answer edits and saves, grouped answers, question expansion, selection, view switching and share selection. Network requests used test responses, not real account writes.
- Full TypeScript checking still reports unrelated existing errors; none are reported in the changed page/component files. This is not a clean repository-wide type check.
- An additional scripted Setup interaction check was blocked by automatic approval review with the reason `blocked by policy`; do not count it as passed.

## Local review

The existing development-only `/test/game-smoke` page now supports `workspace=config`, `workspace=editor` and `workspace=preview`, plus its existing `setup=1`. For example, `/test/game-smoke?mode=trivia&workspace=editor`. These fixtures do not replace testing with real game data before release.

Screenshots and temporary browser scripts are in the ignored `output/playwright` folder. Nothing has been deployed or published.
