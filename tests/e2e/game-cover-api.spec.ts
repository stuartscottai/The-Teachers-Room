import { expect, test } from '@playwright/test';
import handler from '../../api/game-cover';

test('public upload endpoint refuses invalid and private games without reading assets', async () => {
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalFetch = globalThis.fetch;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  const requests: string[] = [];
  globalThis.fetch = async input => {
    requests.push(String(input));
    return new Response('null', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  let status = 0;
  const response = { setHeader() {}, status(code: number) { status = code; return this; }, json() { return this; } };
  try {
    await handler({ method: 'GET', query: { id: '../../private' } }, response);
    expect(status).toBe(400);
    expect(requests).toHaveLength(0);
    await handler({ method: 'GET', query: { id: '00000000-0000-4000-8000-000000000001' } }, response);
    expect(status).toBe(404);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain('is_public=eq.true');
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
});

test('public upload endpoint serves only the stored cover path', async () => {
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalFetch = globalThis.fetch;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  const requests: string[] = [];
  globalThis.fetch = async input => {
    const url = String(input); requests.push(url);
    return url.includes('/rest/v1/')
      ? new Response(JSON.stringify({ user_id: 'teacher', config: { coverImage: { source: 'upload', storagePath: 'games/teacher/draft/game-cover-test.png' } } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      : new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'Content-Type': 'image/png' } });
  };
  let status = 0; let bytes: Buffer | undefined;
  const headers: Record<string, string> = {};
  const response = { setHeader(k: string, v: string) { headers[k] = v; }, status(code: number) { status = code; return this; }, json() { return this; }, send(body: Buffer) { bytes = body; return this; } };
  try {
    await handler({ method: 'GET', query: { id: '00000000-0000-4000-8000-000000000001', path: 'private/other.png' } }, response);
    expect(status).toBe(200);
    expect(bytes?.length).toBe(3);
    expect(headers['Content-Type']).toBe('image/png');
    expect(requests[1]).toContain('games/teacher/draft/game-cover-test.png');
    expect(requests.join('')).not.toContain('private/other.png');
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
});

test('a public game cannot expose another teachers private cover', async () => {
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalFetch = globalThis.fetch;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  const requests: string[] = [];
  globalThis.fetch = async input => {
    requests.push(String(input));
    const body = requests.length === 1
      ? { user_id: 'attacker', config: { coverImage: { source: 'upload', storagePath: 'games/teacher/private/game-cover-secret.png' } } }
      : [];
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  let status = 0;
  const response = { setHeader() {}, status(code: number) { status = code; return this; }, json() { return this; } };
  try {
    await handler({ method: 'GET', query: { id: '00000000-0000-4000-8000-000000000001' } }, response);
    expect(status).toBe(404);
    expect(requests).toHaveLength(2);
    expect(requests.every(url => url.includes('/rest/v1/saved_games'))).toBe(true);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
});
