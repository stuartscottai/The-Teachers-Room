import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { downloadPublicGameUpload } from '../server/publicGameCover.js';
import { extractPixabaySourceUrl } from '../utils/stockImageUrl.js';
import { getSharePreviewImage, SHARE_ID_PATTERN, SHARE_LOGO_IMAGE, SHARE_ORIGIN, SHARE_PATHS, type ShareKind } from '../utils/sharePreview.js';

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const queryValue = (value: unknown) => typeof value === 'string' ? value : '';
const maxImageBytes = 10 * 1024 * 1024;
type PreviewCover = { source?: string; storagePath?: string; provider?: string; url?: string; thumbUrl?: string };

const loadPublicGame = async (id: string, kind: ShareKind) => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  const client = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://xsefgwhywcuzfnawtyru.supabase.co', key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(6000) }) },
  });
  let gameId = id;
  let shareTitle = '';
  if (kind === 'student-share') {
    const { data: share, error } = await client.from('student_game_shares')
      .select('game_id,title,expires_at,revoked_at').eq('id', id).maybeSingle();
    if (error || !share || share.revoked_at || (share.expires_at && !(Date.parse(share.expires_at) > Date.now()))) return null;
    gameId = share.game_id;
    shareTitle = share.title;
  }
  // Do not read questions, answers, account details or private games for previews.
  const { data, error } = await client.from('saved_games').select('title,user_id,cover:config->coverImage')
    .eq('id', gameId).eq('is_public', true).maybeSingle();
  if (error || !data) return null;
  const cover = data.cover && typeof data.cover === 'object' && !Array.isArray(data.cover) ? data.cover as PreviewCover : undefined;
  return { client, game: { ...data, title: shareTitle || data.title, config: { coverImage: cover } } };
};

const allowedStockUrl = (value: string): URL | null => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443')
      && /(^|\.)(pexels|pixabay)\.com$/i.test(url.hostname) ? url : null;
  } catch { return null; }
};

const downloadStockCover = async (value: string) => {
  let target = allowedStockUrl(extractPixabaySourceUrl(value) || '');
  const signal = AbortSignal.timeout(4000);
  for (let attempt = 0; target && attempt < 3; attempt++) {
    const response = await fetch(target, { redirect: 'manual', signal });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      target = location ? allowedStockUrl(new URL(location, target).toString()) : null;
      continue;
    }
    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!response.ok || !['image/jpeg', 'image/png', 'image/webp'].includes(contentType)
      || Number(response.headers.get('content-length')) > maxImageBytes) {
      await response.body?.cancel();
      return null;
    }
    const reader = response.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value: chunk, done } = await reader.read();
      if (done) break;
      size += chunk.length;
      if (size > maxImageBytes) { await reader.cancel(); return null; }
      chunks.push(chunk);
    }
    return size ? { contentType, bytes: Buffer.concat(chunks) } : null;
  }
  return null;
};

// Both people and social crawlers receive the same HTML, including the app scripts.
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const id = queryValue(req.query?.id);
  const requestedKind = queryValue(req.query?.kind);
  if (!Object.hasOwn(SHARE_PATHS, requestedKind) || !SHARE_ID_PATTERN.test(id)) {
    return res.status(400).json({ error: 'Invalid share link' });
  }
  const kind = requestedKind as ShareKind;
  let shared: Awaited<ReturnType<typeof loadPublicGame>> = null;
  try { shared = await loadPublicGame(id, kind); } catch { /* Keep the link usable during a storage outage. */ }
  if (req.query?.image === '1') {
    let image: { bytes: Buffer; contentType: string } | null = null;
    try {
      const cover = shared?.game.config.coverImage;
      if (shared && cover?.source === 'upload') {
        const uploaded = await downloadPublicGameUpload(shared.client, shared.game);
        if ('bytes' in uploaded) image = uploaded;
      } else if (cover?.source === 'stock') {
        const candidates = cover.provider === 'pixabay' ? [cover.thumbUrl, cover.url] : [cover.url, cover.thumbUrl];
        for (const value of [...new Set(candidates)]) {
          if (typeof value !== 'string') continue;
          try { image = await downloadStockCover(value); } catch { /* Try the stored backup. */ }
          if (image) break;
        }
      }
    } catch { /* Missing, expired or unavailable covers use the website logo. */ }
    image ||= { bytes: readFileSync(join(process.cwd(), 'public/assets/share-logo.png')), contentType: 'image/png' };
    res.setHeader('Content-Type', image.contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    return req.method === 'HEAD' ? res.status(200).end() : res.status(200).send(image.bytes);
  }
  const prefix = SHARE_PATHS[kind];
  const pathname = `${prefix}/${id}`;
  const shell = kind === 'teacher' ? 'teacher-game.html' : 'student-game.html';
  let html = readFileSync(join(process.cwd(), 'dist', shell), 'utf8');
  // Replace template URLs before inserting original titles, which may themselves contain links.
  const shellPrefix = kind === 'teacher' ? SHARE_PATHS.teacher : SHARE_PATHS.student;
  html = html.replaceAll(`${SHARE_ORIGIN}${shellPrefix}`, `${SHARE_ORIGIN}${pathname}`);
  if (typeof shared?.game.title === 'string' && shared.game.title.trim()) {
    const title = escapeHtml(`${shared.game.title.trim()} | The Teachers' Room`);
    html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${title}</title>`)
      .replace(/(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*(")/g, (_match, before, after) => `${before}${title}${after}`);
  }
  const imageUrl = escapeHtml(`${SHARE_ORIGIN}${shared?.game.config.coverImage ? getSharePreviewImage(pathname) : SHARE_LOGO_IMAGE}`);
  html = html.replace(/(<meta (?:property="og:image"|name="twitter:image") content=")[^"]*(")/g, (_match, before, after) => `${before}${imageUrl}${after}`);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return req.method === 'HEAD' ? res.status(200).end() : res.status(200).send(html);
}
