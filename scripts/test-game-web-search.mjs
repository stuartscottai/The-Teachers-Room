import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { unlink } from 'node:fs/promises';
const outfile = `.web-search-test-${process.pid}.mjs`;
await build({ entryPoints: ['api/aiRuntime.ts'], outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external' });
const originalFetch = globalThis.fetch;
const originalKey = process.env.OPENAI_API_KEY;
try {
  const { createAiRuntime } = await import(`../${outfile}`);
  if (process.argv.includes('--live')) {
    process.loadEnvFile('.env.local');
    const runtime = createAiRuntime({ provider: 'openai', action: 'game' });
    const result = await runtime.generateContent({ contents: 'Create one quiz question about the year the Premier League began. Verify against the official Premier League website.', config: {
      webSearch: true, maxOutputTokens: 3000,
      responseSchema: { type: 'OBJECT', properties: { question: { type: 'STRING' }, answer: { type: 'STRING' } }, required: ['question', 'answer'] },
    } });
    assert.ok(JSON.parse(result.text).answer);
    assert.ok(result.webSearch.sources.length);
    console.log(JSON.stringify({ model: runtime.model, result: JSON.parse(result.text), sources: result.webSearch.sources, status: result.status }, null, 2));
  } else {
    process.env.OPENAI_API_KEY = 'test-only';
    let request;
    let search = true;
    globalThis.fetch = async (_url, init) => {
      request = JSON.parse(init.body);
      return new Response(JSON.stringify({ id: 'test-response', output_text: '{"answer":"1992"}', model: 'test-model', status: 'completed', output: [
        ...(search ? [{ type: 'web_search_call', status: 'completed', action: { sources: [{ url: 'https://www.premierleague.com/', title: 'Premier League' }, { url: 'javascript:alert(1)' }] } }] : []),
        { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: '{"answer":"1992"}', annotations: [] }] },
      ], usage: { input_tokens: 10, output_tokens: 10 } }), { headers: { 'Content-Type': 'application/json' } });
    };
    const runtime = createAiRuntime({ provider: 'openai', action: 'game' });
    const params = { contents: 'A game', config: { responseSchema: { type: 'OBJECT', properties: { answer: { type: 'STRING' } }, required: ['answer'] } } };
    for (const value of [undefined, false, 'true']) {
      const result = await runtime.generateContent({ ...params, config: { ...params.config, webSearch: value } });
      assert.equal(request.tools, undefined);
      assert.equal(result.webSearch, undefined);
    }
    const result = await runtime.generateContent({ ...params, config: { ...params.config, webSearch: true } });
    assert.equal(request.tools[0].type, 'web_search');
    assert.equal(request.tools[0].external_web_access, true);
    assert.equal(request.tool_choice, 'required');
    assert.equal(request.text.format.type, 'json_schema');
    assert.ok(request.instructions.includes('do not silently substitute an older season'));
    assert.equal(result.webSearch.sources.length, 1);
    assert.equal(JSON.parse(result.text).answer, '1992');
    search = false;
    await assert.rejects(() => runtime.generateContent({ ...params, config: { webSearch: true } }), /Web search did not complete/);
    console.log('PASS: search off, explicit opt-in, required live search, structured output, safe source links, and failure without silent fallback.');
  }
} finally {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
  await unlink(outfile);
}
