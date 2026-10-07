import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modules = new Map();
const user = { id: '00000000-0000-4000-8000-000000000001', email: 'test@example.com', user_metadata: { account_type: 'teacher' } };
const logs = [], aiRequests = [], statFilters = [];
let allowed = true, authenticated = true, aiResult;
const client = {
  auth: { getUser: async () => ({ data: { user: authenticated ? user : null }, error: null }) },
  rpc: async (name, args) => { assert.equal(name, 'reserve_question_replacement'); assert.equal(args.p_user_id, user.id); return { data: allowed, error: null }; },
  from: table => ({
    insert: async row => { assert.equal(table, 'generation_usage'); logs.push(row); return { error: null }; },
    select: () => {
      const filters = [];
      const query = {
        eq: (key, value) => { filters.push([key, value]); return query; },
        order: () => query, limit: () => query,
        maybeSingle: async () => { statFilters.push(filters); return { data: { created_at: '2026-01-01' }, error: null }; },
        then: resolve => { statFilters.push(filters); return Promise.resolve({ count: 2, error: null }).then(resolve); },
      };
      return query;
    },
  }),
};
function load(relative) {
  const filename = path.resolve(relative);
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} }; modules.set(filename, module);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const localRequire = specifier => {
    if (specifier === '@supabase/supabase-js') return { createClient: () => client };
    if (specifier === '@google/genai') return { Type: { OBJECT: 'OBJECT', STRING: 'STRING', ARRAY: 'ARRAY', NUMBER: 'NUMBER', INTEGER: 'INTEGER' } };
    if (specifier === 'mammoth') return {};
    if (specifier === 'word-extractor') return class {};
    if (specifier.endsWith('/aiRuntime.js')) return { createAiRuntime: () => ({ provider: 'gemini', model: 'gemini-2.5-flash', countTokens: async () => 0,
      generateContent: async params => { aiRequests.push(params); return { text: JSON.stringify(aiResult), usageMetadata: { promptTokenCount: 2000, candidatesTokenCount: 100, thoughtsTokenCount: 200, totalTokenCount: 2300 } }; } }) };
    if (specifier.endsWith('/gameCoverBrief.js')) return {};
    if (specifier.startsWith('.')) return load(path.resolve(path.dirname(filename), specifier.replace(/\.js$/, '.ts')));
    return require(specifier);
  };
  vm.runInNewContext(source, { exports: module.exports, module, require: localRequire, process: { env: { SUPABASE_SERVICE_ROLE_KEY: 'fixture-only', AI_PROVIDER: 'gemini' } },
    console: { log() {}, info() {}, warn() {}, error() {} }, Buffer, Date, URL, setTimeout, clearTimeout }, { filename });
  return module.exports;
}
const { sanitizeReplacementRequest, validateReplacement, applyQuestionReplacement, isReplacementSourceRequired } = load('utils/questionReplacement.ts');
const original = { id: 7, question: 'Which tense fits?', answer: 'Present perfect', options: ['Present perfect', 'Past simple', 'Future simple'], points: 300, isBonus: true, category: 'Grammar', image: { url: 'old-image.png' }, imageKeywords: ['old'], answerAliases: ['Old alias'] };
assert.equal(isReplacementSourceRequired({ type: 'Jeopardy', topic: 'Animals', webSearch: true }, original), false);
assert.equal(isReplacementSourceRequired({ type: 'Jeopardy', topic: 'Animals', files: [] }, original), false);
assert.equal(isReplacementSourceRequired({ type: 'Jeopardy', files: [{ name: 'source.pdf' }] }, original), true);
assert.equal(isReplacementSourceRequired({ type: 'Survey Showdown', surveyScoreMode: 'statistics' }, original), true);
const request = sanitizeReplacementRequest({ config: { type: 'Jeopardy', topic: 'B2 grammar', customInstructions: 'Use English', files: [{ data: 'large-private-file' }] }, original, category: 'Grammar', reason: 'ambiguous', feedback: 'Two answers fit.', otherPrompts: ['Existing question'] });
assert.equal(request.config.files, undefined);
assert.equal(request.original.image, undefined);
assert.equal(request.feedback, 'Two answers fit.');
aiResult = { question: 'Which tense describes experience up to now?', answer: 'Present perfect', options: ['Past simple', 'Present perfect', 'Future simple'] };
const proposal = validateReplacement(aiResult, request);
const applied = applyQuestionReplacement(original, proposal);
assert.equal(applied.id, 7); assert.equal(applied.points, 300); assert.equal(applied.isBonus, true); assert.equal(applied.category, 'Grammar');
assert.equal(applied.image, undefined); assert.equal(applied.answerAliases, undefined); assert.equal(original.image.url, 'old-image.png');
assert.throws(() => validateReplacement({ ...aiResult, answer: 'Not an option' }, request), /matching correct/);
assert.throws(() => validateReplacement({ ...aiResult, options: ['Present perfect', 'Present perfect', 'Future simple'] }, request), /distinct options/);
assert.throws(() => validateReplacement({ ...aiResult, question: 'Existing question' }, request), /repeated/);
assert.throws(() => sanitizeReplacementRequest({ ...request, sourceRequired: true }), /source passage/);
const letterRequest = sanitizeReplacementRequest({ ...request, config: { type: 'Word Wheel', topic: 'Animals', wordWheelLetterRule: 'starts-with' }, original: { ...original, options: undefined, letter: 'B' } });
assert.throws(() => validateReplacement({ question: 'A small feline?', answer: 'Cat' }, letterRequest), /letter/);
assert.equal(validateReplacement({ question: 'A flying mammal?', answer: 'Bat' }, letterRequest).letter, 'B');
const surveyRequest = sanitizeReplacementRequest({ ...request, config: { type: 'Survey Showdown', topic: 'Fruit', surveyScoreMode: 'survey' }, original: { ...original, options: undefined } });
assert.throws(() => validateReplacement({ question: 'Name a fruit', answer: 'Apple', surveyScoreMode: 'survey', surveyAnswers: [] }, surveyRequest), /exactly 10/);

const handler = load('api/generate.ts').default;
const invoke = async body => {
  const response = { code: 0, headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(payload) { this.body = payload; return this; } };
  await handler({ method: 'POST', body, headers: { authorization: 'Bearer fixture' } }, response);
  return response;
};
const body = { action: 'question-replacement', ...request };
let response = await invoke(body);
assert.equal(response.code, 200); assert.equal(aiRequests.length, 1); assert.equal(logs.length, 1);
assert.equal(logs[0].action, 'question-replacement'); assert.equal(logs[0].status, 'success');
assert.equal(logs[0].prompt_tokens, 2000); assert.equal(logs[0].output_tokens, 100); assert.equal(logs[0].thoughts_tokens, 200); assert.equal(logs[0].total_tokens, 2300);
assert.equal(logs[0].estimated_cost_usd, 0.00135);
assert.equal(response.headers['X-Generation-Usage-Log'], 'written');
assert.equal(aiRequests[0].config.maxOutputTokens, 2048); assert.equal(aiRequests[0].config.thinkingConfig.thinkingBudget, 512); assert.equal(aiRequests[0].config.webSearch, undefined);
assert.equal(logs[0].meta.feedback, undefined); assert.equal(logs[0].meta.sourceExcerpt, undefined);
aiResult = { ...aiResult, answer: 'Not an option' };
response = await invoke(body); assert.equal(response.code, 502); assert.equal(logs[1].status, 'error'); assert.equal(logs[1].estimated_cost_usd, 0.00135);
assert.equal(aiRequests.length, 2, 'Invalid output must not trigger automatic paid retries');
allowed = false;
response = await invoke(body); assert.equal(response.code, 429); assert.equal(aiRequests.length, 2);
authenticated = false;
response = await invoke(body); assert.equal(response.code, 401); assert.equal(aiRequests.length, 2);
authenticated = true;
const statsHandler = load('api/my-ai-generation-stats.ts').default;
const statsResponse = { setHeader() {}, status() { return this; }, json(body) { this.body = body; } };
await statsHandler({ method: 'GET', headers: { authorization: 'Bearer fixture' } }, statsResponse);
assert.equal(statsResponse.body.totalAiGenerations, 2);
assert.equal(statFilters.length, 2);
for (const filters of statFilters) assert.ok(filters.some(([key, value]) => key === 'action' && value === 'game'), 'Both generation count and latest generation must exclude repairs');
const sql = fs.readFileSync('supabase/question_replacements.sql', 'utf8');
assert.match(sql, /on conflict \(user_id, hour_start\) do update/);
assert.match(sql, /request_count < 20/);
assert.match(sql, /grant execute on function public.reserve_question_replacement\(uuid\) to service_role/);
console.log('Question replacement validation passed: formatting, source/letter/survey rules, slot preservation, bounded AI request, success/failure usage logging, allowance/auth rejection and generation counters. No external AI calls made.');
