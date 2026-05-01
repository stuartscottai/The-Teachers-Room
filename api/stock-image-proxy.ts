const isAllowedImageHost = (host: string): boolean => /(^|\.)pixabay\.com$/i.test(host);

const normalizeTargetUrl = (value: string): URL | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (!/^https?:$/i.test(parsed.protocol)) return null;
    if (!isAllowedImageHost(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const buildWeservFallbackUrl = (target: URL): URL => {
  const fallback = new URL('https://images.weserv.nl/');
  fallback.searchParams.set('url', `${target.hostname}${target.pathname}${target.search}`);
  return fallback;
};

const fetchImage = async (target: URL): Promise<
  | { ok: true; contentType: string; bytes: Buffer }
  | { ok: false; status: number; error: string }
> => {
  const upstream = await fetch(target.toString(), { method: 'GET', redirect: 'follow' });
  if (!upstream.ok) {
    return { ok: false, status: upstream.status, error: `Image fetch failed (${upstream.status})` };
  }

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  if (!contentType.toLowerCase().startsWith('image/')) {
    return { ok: false, status: 415, error: 'Unsupported content type' };
  }

  const bytes = Buffer.from(await upstream.arrayBuffer());
  return { ok: true, contentType, bytes };
};

const fetchImageWithFallback = async (target: URL) => {
  const direct = await fetchImage(target);
  if (direct.ok) return direct;

  const viaWeserv = await fetchImage(buildWeservFallbackUrl(target));
  if (viaWeserv.ok) return viaWeserv;

  return direct;
};

export default async function handler(req: any, res: any) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const requested = Array.isArray(req.query?.url) ? req.query.url[0] : req.query?.url;
  const target = normalizeTargetUrl(String(requested || ''));
  if (!target) {
    res.status(400).json({ error: 'Invalid image URL' });
    return;
  }
  const requestedFallback = Array.isArray(req.query?.fallback) ? req.query.fallback[0] : req.query?.fallback;
  const fallbackTarget = normalizeTargetUrl(String(requestedFallback || ''));

  try {
    const primary = await fetchImageWithFallback(target);

    if (!primary.ok && fallbackTarget) {
      const fallback = await fetchImageWithFallback(fallbackTarget);
      if (fallback.ok) {
        res.setHeader('Content-Type', fallback.contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=2592000');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('X-Stock-Image-Fallback', '1');
        res.status(200).send(fallback.bytes);
        return;
      }
    }

    if (!primary.ok) {
      res.status(primary.status).json({ error: primary.error });
      return;
    }

    res.setHeader('Content-Type', primary.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=2592000');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.status(200).send(primary.bytes);
  } catch (error: any) {
    console.error('Stock image proxy error:', error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
