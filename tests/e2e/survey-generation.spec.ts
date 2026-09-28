import { parseImportedGameContent } from '../../utils/gameImport';
import { GameType } from '../../types';
import { convertGeminiSchemaToOpenAI } from '../../api/aiRuntime';
import { test, expect } from '@playwright/test';
import { getSurveyGenerationError } from '../../utils/surveyGeneration';

const board = (mode = 'survey', scores = [25, 18, 15, 12, 10, 7, 5, 4, 3, 1]) => ({
  questions: [{ surveyScoreMode: mode, surveyAnswers: scores.map((score, i) => ({ text: `Answer ${i + 1}`, score, alts: [] })) }],
});

test('normal survey accepts exactly ten answers totalling 100 and rejects incorrect totals', () => {
  expect(getSurveyGenerationError(board())).toBeNull();
  expect(getSurveyGenerationError(board('survey', [26, 18, 15, 12, 10, 7, 5, 4, 3, 1]))).toContain('exactly 100');
  expect(getSurveyGenerationError(board('survey', [25.5, 17.5, 15, 12, 10, 7, 5, 4, 3, 1]))).toContain('whole numbers');
});

test('statistical totals remain unchanged and tied entities remain separate', () => {
  const data = board('statistics', [260, 213, 208, 187, 184, 177, 175, 163, 162, 162]);
  const original = JSON.stringify(data);
  expect(getSurveyGenerationError(data)).toBeNull();
  expect(JSON.stringify(data)).toBe(original);
});

test('eight or eleven answers, blank and duplicate entries are rejected in every mode', () => {
  for (const mode of ['survey', 'statistics']) {
    expect(getSurveyGenerationError(board(mode, [25, 18, 15, 12, 10, 7, 5, 4]))).toContain('exactly 10');
    expect(getSurveyGenerationError(board(mode, Array(11).fill(10)))).toContain('exactly 10');
    const duplicate = board(mode);
    duplicate.questions[0].surveyAnswers[9].text = ' Answer 1 ';
    expect(getSurveyGenerationError(duplicate)).toContain('distinct');
    duplicate.questions[0].surveyAnswers[9].text = '---';
    expect(getSurveyGenerationError(duplicate)).toContain('nonempty');
  }
});

test('invalid scores, unknown modes, unsorted scores and explicit grouped statistics are rejected', () => {
  expect(getSurveyGenerationError(board('unknown'))).toContain('surveyScoreMode');
  expect(getSurveyGenerationError(board('statistics', [30, 25, 20, 19, 18, 17, 16, 15, 14, NaN]))).toContain('finite');
  expect(getSurveyGenerationError(board('statistics', [30, 25, 20, 19, 18, 17, 16, 15, 14, -1]))).toContain('nonnegative');
  expect(getSurveyGenerationError(board('statistics', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))).toContain('highest');
  const grouped = board('statistics');
  grouped.questions[0].surveyAnswers[9].text = 'Player A; Player B; Player C';
  expect(getSurveyGenerationError(grouped)).toContain('one entity');
});


test('OpenAI keeps the ten-answer bounds from the Gemini schema', () => {
  const schema = convertGeminiSchemaToOpenAI({ type: 'ARRAY', minItems: '10', maxItems: '10', items: { type: 'STRING' } });
  expect(schema.minItems).toBe(10);
  expect(schema.maxItems).toBe(10);
});


test('import retains all ten answers rather than dropping the last two', () => {
  const data = board();
  const game = parseImportedGameContent(JSON.stringify({ title: 'Example', questions: data.questions.map(q => ({ ...q, id: 1, question: 'Name something.', answer: 'Answer 1', points: 100 })) }), { type: GameType.SURVEY_SHOWDOWN, topic: 'Example', questionCount: 1, questionType: 'open', isAI: false });
  expect(game.questions?.[0].surveyAnswers).toHaveLength(10);
  expect(game.questions?.[0].surveyAnswers?.[9].text).toBe('Answer 10');
});


test('explicit scoring choice rejects the wrong mode even when its numbers are otherwise valid', () => {
  expect(getSurveyGenerationError(board('survey'), 'statistics')).toContain("teacher's selected scoring mode");
  expect(getSurveyGenerationError(board('statistics'), 'survey')).toContain("teacher's selected scoring mode");
  // A real statistic may coincidentally total 100; the mode, not the sum, decides its meaning.
  expect(getSurveyGenerationError(board('statistics'), 'statistics')).toBeNull();
  const actualGoals = [260, 213, 208, 187, 184, 177, 175, 163, 162, 162];
  const data = board('statistics', actualGoals);
  expect(getSurveyGenerationError(data, 'statistics')).toBeNull();
  expect(data.questions[0].surveyAnswers.map(answer => answer.score)).toEqual(actualGoals);
});
