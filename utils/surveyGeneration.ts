export const SURVEY_GENERATION_RULES = `
SURVEY SHOWDOWN RULES (apply to every round):
1. Provide EXACTLY 10 distinct surveyAnswers, each with text, score and alts. Never compress several answers into the last entry or use an "other" catch-all to fit the board.
2. Default surveyScoreMode is "survey": use positive whole-number survey-style points whose total is EXACTLY 100. These are illustrative game points, not evidence that a real survey was conducted. Do not claim real research unless supplied.
3. Use surveyScoreMode "statistics" ONLY when the teacher explicitly requests actual numerical statistics in the score boxes (for example each player's goals, country populations or measured values). Preserve those values in score; do not rescale them to 100. A sports topic or a request for popular/top answers alone does NOT change the default survey scoring.
4. In statistics mode, put ONE entity per answer: one player, country or item per box. Keep tied entities in separate entries with their individual values; never group tied players. Return exactly the top 10 individuals, not 10 rank groups. Break ties at the boundary alphabetically unless the teacher specifies otherwise.
5. Sort answers by score, highest to lowest. Include only spelling variants, aliases or genuine synonyms for THAT SAME answer in alts, never different entities.
6. For factual statistics, make the scope, period and cutoff date clear in the question. Use supplied source data when available. Never invent extra entities or values to reach 10, and never describe historical figures as current. If there is insufficient reliable information for 10 entries, return an empty surveyAnswers list so the app can report the problem instead of presenting an invented board.
`;

export function getSurveyGenerationRules(mode?: 'survey' | 'statistics'): string {
  if (!mode) return SURVEY_GENERATION_RULES; // Older callers retain their instruction-based behaviour.
  const choice = mode === 'statistics'
    ? 'The teacher selected ACTUAL STATISTICS. This is an explicit request for factual values in every score box. Set surveyScoreMode to "statistics" for every round. Preserve the actual values and units; never distribute or rescale to 100.'
    : 'The teacher selected SURVEY POINTS. Set surveyScoreMode to "survey" for every round and distribute exactly 100 illustrative game points across the ten answers. Do not present these points as goals, populations, or other factual measurements.';
  return `${SURVEY_GENERATION_RULES}\nEXPLICIT SCORING CHOICE (takes precedence over the default and any conflicting scoring instructions): ${choice}`;
}

// Validate new AI output only. Existing saved or manually edited games remain playable.
export function getSurveyGenerationError(data: any, expectedMode?: 'survey' | 'statistics'): string | null {
  if (!Array.isArray(data?.questions) || !data.questions.length) return 'Survey Showdown needs at least one round.';
  for (const [index, question] of data.questions.entries()) {
    const prefix = `Round ${index + 1}: `;
    const answers = question?.surveyAnswers;
    if (!Array.isArray(answers) || answers.length !== 10) return prefix + 'provide exactly 10 separate answers; do not group answers or invent missing data.';
    const names = answers.map((answer: any) => typeof answer?.text === 'string' ? answer.text.trim().toLowerCase() : '');
    if (names.some((name: string) => !name || name === '---') || new Set(names).size !== 10) return prefix + 'all 10 answers must be nonempty and distinct.';
    const mode = question.surveyScoreMode;
    if (expectedMode && mode !== expectedMode) return prefix + `use the teacher's selected scoring mode: ${expectedMode}. Do not switch scoring modes.`;
    if (mode !== 'survey' && mode !== 'statistics') return prefix + 'specify surveyScoreMode as survey (default) or statistics (only for explicitly requested factual values).';
    const scores = answers.map((answer: any) => answer?.score);
    if (scores.some((score: unknown) => typeof score !== 'number' || !Number.isFinite(score) || score < 0)) return prefix + 'every score must be a finite nonnegative number.';
    if (mode === 'survey' && (scores.some((score: number) => !Number.isInteger(score) || score <= 0) || scores.reduce((a: number, b: number) => a + b, 0) !== 100)) return prefix + 'normal survey points must be positive whole numbers totalling exactly 100.';
    if (scores.some((score: number, i: number) => i > 0 && score > scores[i - 1])) return prefix + 'order answers from highest score to lowest, keeping tied answers separate.';
    if (mode === 'statistics' && names.some((name: string) => /[;\n]|\b(?:tied players|other players|joint scorers)\b/.test(name))) return prefix + 'use one entity per statistics answer, not a list of tied entities.';
  }
  return null;
}
