# Spanish (Spain) interface translation

The full draft is written for you in **spanish-spain-review.csv**. There are no empty Spanish cells. The file is a reference and an optional review document; you do not need to translate the entries yourself.

The English/Spanish (Spain) selector in **Profile → Website settings → Language** now drives navigation, account and school screens, game setup, game controls and feedback, student practice, live quiz controls, and website-owned information pages. The preference updates immediately, survives a reload, and synchronises across tabs on the same browser. It is available without signing in. The initial default is English; it is not yet an account-wide or automatic browser-language preference.

## What stays in its original language

Teacher-written questions, answers, options, categories, titles, custom team names, uploaded teaching materials and saved games are never sent through the translation helper. Generated default names such as “Team 1” display as “Equipo 1”; custom names are retained. Built-in learning material and authored workbook lessons also keep their source language. Website controls use explicit translations and are protected from a second browser translation. The website name, The Teachers' Room, always stays in English, including the home-page hero.

Home-page play counts, all ten testimonial cards, plan descriptions, FAQ questions and answers (including search), and all six public blog articles now have Spanish versions. Blog titles, summaries, dates and complete article text are included in the review CSV. Their routes, images, article IDs and external links are unchanged.

All four public landing pages under “More for teachers” / “Más para docentes” also use Spanish for their badges, headings, introductions, benefits, examples and action links. Their content lists are explicitly checked during translation validation.

The temporary online-class workbooks under `/class/` are entirely English-only, regardless of the site language preference. This includes B1, B2, C1 and C2, their navigation, answer placeholders, reading tools, notices and saved/printed copies. The whole workbook document requests no browser translation; future lessons added to these levels inherit the same protection. Visiting a workbook does not change the saved website language, and leaving it restores the normal site's translation settings. Workbook-only wording is excluded from the Spanish dictionary and review export; shared phrases remain translated where used elsewhere on the website.

Translations remain a **contextual draft**, not a claim of independent human approval. Unexpected errors supplied by outside services and text embedded in existing images or audio are outside this dictionary. AI-generated teaching content follows the language requested when creating it.

## Wording choices

| English | Spanish (Spain) | Context |
| --- | --- | --- |
| Check / Check answer | Comprobar / Comprobar respuesta | Checking a response; never “controlar” |
| Reveal answer | Ver respuesta | Turning a card or showing its answer |
| Game / playing session | Juego / partida | Format versus a session in progress |
| Round | Ronda | A round within a game |
| Team / score | Equipo / puntuación | Default names and score displays |
| Quit / End game | Salir / Finalizar partida | Leaving versus ending play |
| Lifeline | Comodín | Millionaire Maker assistance |
| Steal | Robo / robar | Taking a tile or points from another team |
| Board bonuses | Bonus del tablero | Board effects; no added score where the rules say otherwise |
| Cats | Cat. | Short for categories in the game library |
| Starter / Teacher / School plan | Inicial / Docente / Centro | Account plans |
| Join Live | Unirse a Live Quiz | Joining the Live Quiz game; never website registration |

Call the live game **Live Quiz** in Spanish throughout navigation, setup, help and notices; do not translate its name as “cuestionario en directo”.

Use **tú** throughout. Keep The Teachers’ Room and named game formats unchanged. Prefer short, natural buttons, with longer explanations nearby. Preserve placeholders in braces: these represent names, scores or other values inserted by the website.

## Reviewing and maintaining the translations

The CSV includes English, proposed Spanish, purpose/context and current source locations. Review related phrases together when a sentence contains links or emphasis. Mark a row “Approved” when reviewed if useful. The dictionary already contains the translations; editing the CSV alone does not change the website.

- `data/i18n/spanish-spain.json` contains the broad runtime dictionary.
- `data/i18n/interface.json` contains context-specific compact navigation and Profile wording.
- `data/blogPosts.es.ts` contains complete Spanish editorial drafts for the blog, selected for display without modifying the English originals.
- `utils/interfaceLanguage.ts` applies translations only at explicit interface boundaries, without changing saved teaching content.
- Run `npm run i18n:inventory` to refresh the reference file from the runtime dictionaries, retaining review notes and source contexts.
- Run `npm run i18n:validate` to check for missing translations, invalid placeholders and accidental translation of teaching content. This check is included in the build.

For new controls, add English and contextual Spanish together, connect only the website-owned wording, and check it in both languages. If an English word needs a different translation in another context, use a complete phrase or a contextual key rather than applying a blanket substitution.
