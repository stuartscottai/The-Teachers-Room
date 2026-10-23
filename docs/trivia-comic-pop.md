# Trivia: Comic Pop

Trivia's Comic Pop option uses the treatment from option 02 of the Plinkemoji box lab: dark purple ink outlines, offset shadows, cream paper, halftone dots, yellow controls and pink active teams. Numbered tiles retain a rotating cyan/yellow/pink/purple/orange palette. Question faces, answer choices, bonus cards, written-answer fields, team editing and confirmation dialogs follow the same family.

`components/games/trivia-comic.css` is loaded by Trivia and scoped to its `.trivia-comic` root. The skin stays readable under the site's light/dark appearance settings. Shared components only gain `aria-current` on the active team and an actions-section attribute for styling. Game rules, scoring, audio and card motion are unchanged.

Checked:

- Desktop multiple choice, Continue, score changes and team editing.
- Six-team mobile board and written answers at 390 × 844.
- Six-team board, all four multiple-choice options and end-game confirmation at 320 × 568.
- Dark-game written answers and readable inputs.
- Bonus reveal and Apply Effect, including dark lettering on the pink bonus face.
- Production build, translation/privacy checks, SEO and share-preview checks.

Browser captures are in ignored `output/playwright/trivia-comic-*.png`. Test browsers are closed after checks. Comic Pop is now one of five choices in Trivia's Game style selector; Classic is the default for new and legacy games.
