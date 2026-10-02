import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

// Exercise the actual server response seen by WhatsApp, without network or database writes.
const vite = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
const originalFetch = globalThis.fetch;
const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const id = '00000000-0000-4000-8000-000000000001';
const logo = readFileSync('public/assets/share-logo.png');
const requests = [];
let savedGame = null;
let studentShare = null;
let originalPublic = [];
let imageResponse = () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/png' } });
const jsonResponse = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });

try {
  const { default: handler } = await vite.ssrLoadModule('/api/share-preview.ts');
  const { default: uploadHandler } = await vite.ssrLoadModule('/api/game-cover.ts');
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  globalThis.fetch = async input => {
    const url = new URL(String(input));
    requests.push(url);
    if (url.pathname.endsWith('/saved_games')) return jsonResponse(url.searchParams.has('user_id') ? originalPublic : savedGame);
    if (url.pathname.endsWith('/student_game_shares')) return jsonResponse(studentShare);
    return imageResponse(url);
  };
  const request = async (query = {}, method = 'GET', endpoint = handler) => {
    const result = { headers: {}, status: 0, body: undefined };
    const response = {
      setHeader(key, value) { result.headers[key] = value; },
      status(code) { result.status = code; return this; },
      send(body) { result.body = body; return this; },
      json(body) { result.body = body; return this; },
      end() { return this; },
    };
    await endpoint({ method, query: { kind: 'teacher', id, ...query } }, response);
    return result;
  };
  const checkImage = (result, expected = logo) => {
    assert.equal(result.status, 200);
    assert.equal(result.headers['Content-Type'], 'image/png');
    assert.deepEqual(result.body, expected);
    assert.equal(result.headers['Cache-Control'], 'no-store');
  };

  // Titles are original content: encode markup and keep the game's language.
  savedGame = { title: 'Valencià <B2> & "$&"', user_id: 'teacher', cover: { source: 'stock', url: 'https://images.pexels.com/photos/123/test.png' } };
  const html = await request();
  assert.equal(html.status, 200);
  assert.ok(html.body.includes('<title>Valencià &lt;B2&gt; &amp; &quot;$&amp;&quot; | The Teachers\' Room</title>'));
  assert.ok(html.body.includes('property="og:title" content="Valencià &lt;B2&gt; &amp; &quot;$&amp;&quot;'));
  assert.ok(html.body.includes('name="twitter:title" content="Valencià &lt;B2&gt; &amp; &quot;$&amp;&quot;'));
  assert.ok(html.body.includes(`/api/share-preview?kind=teacher&amp;id=${id}&amp;image=1`));
  assert.ok(html.body.includes(`property="og:url" content="https://www.theteachersroom.app/share/game/${id}"`));
  assert.ok(/<script[^>]*src=/.test(html.body));
  assert.equal(html.headers['X-Robots-Tag'], 'noindex, nofollow');
  assert.ok(requests[0].searchParams.get('select').includes('cover:config->coverImage'));
  assert.equal(requests[0].searchParams.get('is_public'), 'eq.true');
  assert.ok(!requests[0].searchParams.get('select').includes('questions'));
  checkImage(await request({ image: '1' }), Buffer.from([1, 2, 3]));

  // Proxied stock covers are resolved to their approved provider, not fetched as arbitrary URLs.
  savedGame.cover = { source: 'stock', provider: 'pixabay', thumbUrl: '/api/stock-image-proxy?url=https%3A%2F%2Fcdn.pixabay.com%2Fphoto%2Ftest.png' };
  checkImage(await request({ image: '1' }), Buffer.from([1, 2, 3]));
  assert.equal(requests.at(-1).hostname, 'cdn.pixabay.com');
  savedGame.cover.url = 'https://127.0.0.1/private.png';
  delete savedGame.cover.thumbUrl;
  const countBefore = requests.length;
  checkImage(await request({ image: '1' }));
  assert.equal(requests.length, countBefore + 1);
  savedGame.cover.url = 'https://images.pexels.com/photos/123/test.png';
  imageResponse = () => new Response(null, { status: 302, headers: { Location: 'http://127.0.0.1/private' } });
  checkImage(await request({ image: '1' }));
  assert.ok(requests.every(url => url.hostname !== '127.0.0.1'));
  imageResponse = () => new Response('<html>Unavailable</html>', { headers: { 'Content-Type': 'text/html' } });
  checkImage(await request({ image: '1' }));
  imageResponse = () => new Response(null, { status: 404 });
  checkImage(await request({ image: '1' }));

  // Uploads use stored, ownership-checked paths, never expiring signed URLs.
  imageResponse = () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/png' } });
  savedGame = { title: 'Uploaded cover', user_id: 'teacher', cover: { source: 'upload', storagePath: 'games/teacher/draft/game-cover-test.png', url: 'https://expired.invalid/image' } };
  checkImage(await request({ image: '1' }), Buffer.from([1, 2, 3]));
  assert.ok(requests.at(-1).pathname.includes('games/teacher/draft/game-cover-test.png'));
  savedGame.user_id = 'other-teacher';
  const beforePrivate = requests.length;
  checkImage(await request({ image: '1' }));
  assert.equal(requests.length, beforePrivate + 2); // No storage request for another teacher's private cover.
  originalPublic = [{ id }];
  checkImage(await request({ image: '1' }), Buffer.from([1, 2, 3]));
  // The existing library endpoint retains the same upload access rules.
  const storedGame = savedGame;
  savedGame = { ...storedGame, config: { coverImage: storedGame.cover } };
  const upload = await request({}, 'GET', uploadHandler);
  assert.equal(upload.status, 200);
  savedGame = storedGame;

  // Student links use the same cover and honour a selection's title and expiry.
  studentShare = { game_id: id, title: 'Repàs de valencià', expires_at: null, revoked_at: null };
  const student = await request({ kind: 'student-share' });
  assert.ok(student.body.includes('<title>Repàs de valencià | The Teachers\' Room</title>'));
  assert.ok(student.body.includes(`property="og:url" content="https://www.theteachersroom.app/student/share/${id}"`));
  assert.ok(student.body.includes('Your teacher has shared a practice game'));
  checkImage(await request({ kind: 'student', image: '1' }), Buffer.from([1, 2, 3]));
  studentShare.expires_at = '2020-01-01T00:00:00Z';
  checkImage(await request({ kind: 'student-share', image: '1' }));
  studentShare.expires_at = null;
  studentShare.revoked_at = '2020-01-01T00:00:00Z';
  checkImage(await request({ kind: 'student-share', image: '1' }));

  // Missing covers, private/deleted games, outages and absent storage setup use the logo.
  savedGame = { title: 'No cover', user_id: 'teacher', cover: null };
  assert.ok((await request()).body.includes('property="og:image" content="https://www.theteachersroom.app/assets/share-logo.png"'));
  checkImage(await request({ image: '1' }));
  savedGame = null;
  checkImage(await request({ image: '1' }));
  assert.ok((await request()).body.includes('A Classroom Game Shared With You'));
  globalThis.fetch = async () => { throw new Error('Storage outage'); };
  checkImage(await request({ image: '1' }));
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  checkImage(await request({ image: '1' }));
  assert.equal((await request({}, 'HEAD')).body, undefined);
  assert.equal((await request({ id: '../private' })).status, 400);
  assert.equal((await request({ kind: 'toString' })).status, 400);
  assert.equal((await request({}, 'POST')).status, 405);
  console.log('Share preview validation passed: original game titles, stock/uploaded covers, yellow-logo fallbacks, active student links and private-cover protection.');
} finally {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  await vite.close();
}
