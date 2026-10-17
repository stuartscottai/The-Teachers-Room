import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const modules = new Map();
function load(relative) {
  const filename = path.resolve(relative.endsWith('.ts') ? relative : `${relative}.ts`);
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    module, exports: module.exports, console,
    require: specifier => specifier.startsWith('.') ? load(path.resolve(path.dirname(filename), specifier)) : require(specifier),
  }, { filename });
  return module.exports;
}

const { GameType } = load('types.ts');
const { getAnswerMethod, getWrittenQuestionType, matchesWrittenAnswer, supportsWrittenAnswers, getAnswerEditorText, getAnswerEditorPatch } = load('utils/writtenAnswers.ts');
const { parseImportedGameContent, buildExternalLlmGamePrompt } = load('utils/gameImport.ts');
const config = { type: GameType.TRIVIA, questionType: 'mixed', questionCount: 4, topic: 'Test', isAI: false };
const question = { id: 1, question: 'The answer is ____.', answer: 'Café', answerAliases: ['Coffee shop'], points: 100, isBonus: false };

assert.equal(getAnswerMethod(config, {}), 'say');
assert.equal(getAnswerMethod({ ...config, answerMethod: 'write' }, {}), 'write');
assert.equal(getAnswerMethod({ ...config, answerMethod: 'write' }, { answerMethod: 'say' }), 'say');
assert.equal(getAnswerMethod({ ...config, answerMethod: 'say' }, { answerMethod: 'write' }), 'write');
assert.equal(getAnswerMethod({ ...config, answerMethod: 'either' }, {}), 'say', 'Removed legacy mode falls back to speaking');
assert.equal(getAnswerMethod({ ...config, type: GameType.BLOCK_BEATERS, blockBeatersMode: 'letters' }, {}), 'write');
assert.equal(getAnswerMethod({ ...config, type: GameType.BLOCK_BEATERS, blockBeatersMode: 'numbers' }, {}), 'say');

assert.equal(matchesWrittenAnswer('  CAFÉ!  ', question), true);
assert.equal(matchesWrittenAnswer('Cafe\u0301', question), true);
assert.equal(matchesWrittenAnswer('Coffee   SHOP.', question), true);
assert.equal(matchesWrittenAnswer('', question), false);
const lines = 'have\nhave got\n';
const patch = getAnswerEditorPatch(lines, question, config);
const edited = { ...question, ...patch };
assert.equal(getAnswerEditorText(edited, config), lines, 'Keep line breaks while editing');
assert.equal(matchesWrittenAnswer('HAVE GOT', edited), true);
assert.equal(matchesWrittenAnswer('have', edited), true);
assert.equal(matchesWrittenAnswer('wrong', edited), false);
assert.equal(matchesWrittenAnswer('hvae', edited), false, 'Spelling errors must be marked incorrect');
assert.equal(matchesWrittenAnswer('have go', edited), false, 'Incomplete alternatives must be marked incorrect');
assert.equal(matchesWrittenAnswer('have got', { ...question, answer: 'have\nhave got', answerAliases: [] }), true);
const openQuestion = { ...question, questionType: 'open', answer: 'First paragraph.\nSecond paragraph.' };
assert.equal(getAnswerEditorText(openQuestion, config), openQuestion.answer);
assert.equal(getAnswerEditorPatch(openQuestion.answer, openQuestion, config).answer, openQuestion.answer);
assert.equal(getAnswerEditorText(question, config), [question.answer, ...question.answerAliases].join('\n'), 'Existing accepted alternatives appear in the main answer field');

assert.equal(matchesWrittenAnswer('cafe', question), false, 'Accents can change the meaning of language answers');
assert.equal(matchesWrittenAnswer('coffee', question), false, 'Do not accept a partial answer');
assert.equal(matchesWrittenAnswer('12', { ...question, answer: '1.2' }), false);
assert.equal(matchesWrittenAnswer('2', { ...question, answer: '-2' }), false);
assert.equal(getWrittenQuestionType(question, config), 'gap-fill');
assert.equal(getWrittenQuestionType({ ...question, questionType: 'open' }, config), 'open');
assert.equal(getWrittenQuestionType({ ...question, question: 'Explain your answer.' }, config), 'open');
assert.equal(getWrittenQuestionType({ ...question, question: 'Fill this gap.' }, { ...config, questionType: 'gap-fill' }), 'gap-fill');
assert.equal(supportsWrittenAnswers(GameType.MILLIONAIRE), false);
assert.equal(supportsWrittenAnswers(GameType.WORD_WHEEL), false);

for (const type of [GameType.TRIVIA, GameType.JEOPARDY, GameType.PUB_QUIZ]) {
  const cfg = { ...config, type, answerMethod: 'write' };
  const sourceQuestion = { ...question, answerMethod: 'write', questionType: 'gap-fill' };
  const collection = type === GameType.JEOPARDY ? { jeopardyBoard: [{ name: 'Places', questions: [sourceQuestion] }] }
    : type === GameType.PUB_QUIZ ? { pubQuizRounds: [{ name: 'Round 1', questions: [sourceQuestion] }] }
    : { questions: [sourceQuestion] };
  const imported = parseImportedGameContent(JSON.stringify({ title: 'Test import', ...collection }), cfg);
  const restored = imported.jeopardyBoard?.[0].questions[0] || imported.pubQuizRounds?.[0].questions[0] || imported.questions[0];
  assert.equal(imported.config.answerMethod, 'write');
  assert.equal(restored.answerMethod, undefined, 'Individual questions cannot override the game answer method');
  assert.equal(restored.questionType, 'gap-fill');
  assert.equal(matchesWrittenAnswer('COFFEE SHOP', restored), true);
  assert.match(buildExternalLlmGamePrompt(cfg), /questionType: "gap-fill"/);
}
const invalid = parseImportedGameContent(JSON.stringify({ questions: [{ ...question, answerMethod: 'invalid', questionType: 'invalid' }] }), config);
assert.equal(invalid.questions[0].answerMethod, undefined);
assert.equal(invalid.questions[0].questionType, undefined);
console.log('Written-answer validation passed: game-wide defaults, setup overrides, matching and imported question settings.');
