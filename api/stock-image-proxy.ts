const isAllowedImageHost = (host: string): boolean => /(^|\.)pixabay\.com$/i.test(host) || /(^|\.)pexels\.com$/i.test(host);

type ImageFetchResult =
  | { ok: true; contentType: string; bytes: Buffer }
  | { ok: false; status: number; error: string };

const decodeIfEncoded = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const coerceLikelyStockImageUrl = (value: string): string | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  if (/^\/?get\//i.test(raw)) {
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    return `https://pixabay.com${path}`;
  }

  if (/^\/\/[^/]+/i.test(raw)) {
    return `https:${raw}`.replace(/^http:\/\//i, 'https://');
  }

  if (/^(?:[a-z0-9-]+\.)*pixabay\.com\//i.test(raw)) {
    return `https://${raw}`.replace(/^http:\/\//i, 'https://');
  }

  if (/^(?:[a-z0-9-]+\.)*pexels\.com\//i.test(raw)) {
    return `https://${raw}`.replace(/^http:\/\//i, 'https://');
  }

  return null;
};

const extractStockImageUrl = (value: string, depth = 0): string | null => {
  if (depth > 5) return null;
  const raw = String(value || '').trim();
  if (!raw) return null;

  const hinted = coerceLikelyStockImageUrl(raw);
  if (hinted) return hinted;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    const decoded = decodeIfEncoded(raw);
    return decoded !== raw ? extractStockImageUrl(decoded, depth + 1) : null;
  }

  if (isAllowedImageHost(parsed.hostname)) {
    parsed.protocol = 'https:';
    return parsed.toString();
  }

  if (parsed.pathname.startsWith('/api/stock-image-proxy') || parsed.hostname.toLowerCase() === 'images.weserv.nl') {
    const nested = parsed.searchParams.get('url');
    if (!nested) return null;
    return extractStockImageUrl(nested, depth + 1);
  }

  return null;
};

const normalizeTargetUrl = (value: string): URL | null => {
  const raw = extractStockImageUrl(String(value || '')) || String(value || '').trim();
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

const normalizePixabayImageUrl = (value: string | undefined): string => {
  if (!value) return '';
  return value.replace(/^http:\/\//i, 'https://');
};

const normalizePexelsImageUrl = normalizePixabayImageUrl;

type StockImageResolution = { target: URL | null; status: number };

const resolvePexelsImageById = async (imageId: string): Promise<StockImageResolution> => {
  const id = String(imageId || '').replace(/^pexels:/i, '').trim();
  if (!/^\d+$/.test(id)) return { target: null, status: 400 };

  const apiKey = process.env.PEXELS_API_KEY || '';
  if (!apiKey) return { target: null, status: 503 };

  const response = await fetch(`https://api.pexels.com/v1/photos/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: { Authorization: apiKey },
  });
  if (!response.ok) return { target: null, status: response.status };

  const data = await response.json().catch(() => null);
  const imageUrl = normalizePexelsImageUrl(
    data?.src?.landscape || data?.src?.large || data?.src?.medium || data?.src?.large2x || data?.src?.original
  );
  const target = normalizeTargetUrl(imageUrl);
  return { target, status: target ? 200 : 404 };
};

const resolvePixabayImageById = async (imageId: string): Promise<StockImageResolution> => {
  const id = String(imageId || '').trim();
  if (!/^\d+$/.test(id)) return { target: null, status: 400 };

  const apiKey = process.env.PIXABAY_API_KEY || process.env.VITE_PIXABAY_API_KEY || '';
  if (!apiKey) return { target: null, status: 503 };

  const apiUrl = new URL('https://pixabay.com/api/');
  apiUrl.searchParams.set('key', apiKey);
  apiUrl.searchParams.set('id', id);
  apiUrl.searchParams.set('safesearch', 'true');
  apiUrl.searchParams.set('image_type', 'all');

  const response = await fetch(apiUrl.toString(), { method: 'GET' });
  if (!response.ok) return { target: null, status: response.status };

  const data = await response.json().catch(() => null);
  const hit = Array.isArray(data?.hits) ? data.hits[0] : null;
  const imageUrl = normalizePixabayImageUrl(hit?.largeImageURL || hit?.webformatURL || hit?.previewURL);
  const target = normalizeTargetUrl(imageUrl);
  return { target, status: target ? 200 : 404 };
};

const resolveStockImageById = async (imageId: string): Promise<StockImageResolution> => {
  const id = String(imageId || '').trim();
  if (/^pexels:/i.test(id)) return resolvePexelsImageById(id);
  return resolvePixabayImageById(id);
};

const buildWeservFallbackUrl = (target: URL): URL => {
  const fallback = new URL('https://images.weserv.nl/');
  fallback.searchParams.set('url', `${target.hostname}${target.pathname}${target.search}`);
  return fallback;
};

const fetchImage = async (target: URL): Promise<ImageFetchResult> => {
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

const isFetchError = (result: ImageFetchResult): result is Extract<ImageFetchResult, { ok: false }> => !result.ok;

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
  const requestedId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  const freshResolution = requestedId ? await resolveStockImageById(String(requestedId || '')) : null;
  const target = freshResolution?.target || normalizeTargetUrl(String(requested || ''));
  if (!target) {
    const status = freshResolution?.status || 400;
    res.status(status).json({ error: [400, 404, 410].includes(status) ? 'Image is no longer available' : 'Image is temporarily unavailable' });
    return;
  }
  const requestedFallback = Array.isArray(req.query?.fallback) ? req.query.fallback[0] : req.query?.fallback;
  const fallbackTarget = normalizeTargetUrl(String(requestedFallback || ''));

  try {
    const primary = await fetchImageWithFallback(target);

    if (isFetchError(primary) && fallbackTarget) {
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

    if (isFetchError(primary)) {
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
