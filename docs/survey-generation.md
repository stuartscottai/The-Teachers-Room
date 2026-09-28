# Survey Showdown generation rules

Normal new AI-generated rounds contain exactly ten distinct answers, ordered by score, with positive integer points totalling exactly 100. They are simulated survey-style scores unless real survey data is supplied.

When a teacher explicitly asks for factual statistics in the score boxes, the model marks that round `surveyScoreMode: statistics`. Actual numeric values are preserved rather than normalised to 100. Ties remain separate answers; only ten entities are selected. Topic alone (including football) must not switch the scoring mode. Normal rounds are marked `surveyScoreMode: survey`.

Both server and direct Gemini generation share `utils/surveyGeneration.ts` instructions and validation. The server and direct path retry invalid survey output once, then return an error rather than accepting a malformed board. Schema constraints require ten entries and a scoring mode. OpenAI schema conversion accepts the string array bounds used by the Gemini SDK.

Validation checks count, nonempty and distinct texts, numeric values, score order and the normal-mode total. It rejects obvious semicolon/newline grouped statistics. It cannot reliably identify every possible multi-entity phrase or verify factual accuracy, or independently prove the model interpreted the teacher's scoring intent correctly. Prompts explicitly prohibit grouping players and inventing data; teachers should provide dated source information for statistical questions and review results.

File import now retains up to ten answers instead of truncating at eight. Existing saved games and manual editing are unchanged. These generation fixes do not repair previously created eight-answer games. No web search was enabled.

Validation: `tests/e2e/survey-generation.spec.ts` covers normal totals, preserved statistical values, ties, wrong counts, duplicates, blank entries, invalid values, ordering and obvious grouped entries.


## Explicit scoring choice
The AI configuration form now offers Survey points (default) and Actual statistics. The selected `config.surveyScoreMode` overrides ambiguous or conflicting scoring instructions for every round. Server and client validation reject a returned mode that differs from this choice, using the existing retry mechanism. Actual values are never normalised to 100. Web search remains a separate opt-in. Older callers without a selected mode retain their instruction-based behaviour; existing saved games are not altered.
