type PixabayHit = {
  id: number;
  tags?: string;
  previewURL?: string;
  webformatURL?: string;
  largeImageURL?: string;
  type?: 'photo' | 'illustration' | 'vector';
  imageWidth?: number;
  imageHeight?: number;
};

type PixabayResponse = {
  totalHits?: number;
  hits?: PixabayHit[];
};

const normalizeUrl = (value: string | undefined): string => {
  if (!value) return '';
  return value.replace(/^http:\/\//i, 'https://');
};

const toProxyUrl = (value: string | undefined): string => {
  const normalized = normalizeUrl(value);
  if (!normalized) return '';
  return `/api/stock-image-proxy?url=${encodeURIComponent(normalized)}`;
};

const parsePositiveInt = (value: any, fallback: number, min: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
};

const parseOptionalDimension = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.floor(parsed);
};

const strictSort = (
  items: Array<{ id: string; url: string; thumbUrl: string; alt: string; kind: string; tags: string; width?: number; height?: number }>,
  query: string
) => {
  if (!items.length) return items;

  const queryTokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (!queryTokens.length) return items;

  const minMatches = Math.max(1, Math.ceil(queryTokens.length * 0.5));
  const primaryToken = queryTokens[0] || '';

  const filtered = items.filter((item) => {
    const haystack = `${item.alt} ${item.tags}`.toLowerCase();
    const matchCount = queryTokens.reduce((acc, token) => acc + (haystack.includes(token) ? 1 : 0), 0);
    return matchCount >= minMatches;
  });

  const scored = filtered.map((item) => {
    const haystack = `${item.alt} ${item.tags}`.toLowerCase();
    const score = queryTokens.reduce((acc, token) => {
      if (!token) return acc;
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const exact = new RegExp(`\\b${escaped}\\b`, 'i').test(haystack);
      if (exact) return acc + 3;
      if (haystack.includes(token)) return acc + 1;
      return acc;
    }, 0);
    const width = item.width || 0;
    const height = item.height || 0;
    const ratio = width > 0 && height > 0 ? width / height : 0;
    const orientationScore = ratio >= 1.2 ? 1 : ratio > 0 && ratio < 0.95 ? -1 : 0;
    const primaryExact = primaryToken
      ? new RegExp(`\\b${primaryToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(haystack)
      : false;
    return { item, score: score + orientationScore, primaryExact };
  });

  const hasPrimaryExact = scored.some((entry) => entry.primaryExact);
  return (hasPrimaryExact ? scored.filter((entry) => entry.primaryExact) : scored)
    .sort((a, b) => {
      if (a.primaryExact !== b.primaryExact) return a.primaryExact ? -1 : 1;
      return b.score - a.score;
    })
    .map(({ item }) => item);
};

export default async function handler(req: any, res: any) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const query = String(req.query?.q || '').trim();
    if (!query) {
      res.status(400).json({ error: 'Missing query parameter: q' });
      return;
    }

    const apiKey = process.env.PIXABAY_API_KEY || process.env.VITE_PIXABAY_API_KEY || '';
    if (!apiKey) {
      res.status(500).json({ error: 'Missing PIXABAY_API_KEY' });
      return;
    }

    const page = parsePositiveInt(req.query?.page, 1, 1, 500);
    const perPage = parsePositiveInt(req.query?.perPage, 24, 3, 50);
    const strict = String(req.query?.strict || '').toLowerCase() === 'true';

    const url = new URL('https://pixabay.com/api/');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('q', query);
    url.searchParams.set('per_page', String(perPage));
    url.searchParams.set('page', String(page));
    url.searchParams.set('safesearch', 'true');
    url.searchParams.set('image_type', 'all');

    const response = await fetch(url.toString(), { method: 'GET' });
    if (!response.ok) {
      res.status(response.status).json({ error: `Stock image search failed (${response.status})` });
      return;
    }

    const data = (await response.json()) as PixabayResponse;
    const baseItems = (data.hits || [])
      .filter((item) => item.previewURL || item.webformatURL || item.largeImageURL)
      .map((item) => ({
        id: String(item.id),
        url: toProxyUrl(item.largeImageURL || item.webformatURL || item.previewURL),
        thumbUrl: toProxyUrl(item.webformatURL || item.previewURL || item.largeImageURL),
        alt: (item.tags || query).split(',')[0]?.trim() || query,
        kind: item.type || 'photo',
        tags: item.tags || '',
        width: parseOptionalDimension(item.imageWidth),
        height: parseOptionalDimension(item.imageHeight),
      }))
      .filter((item) => item.url);

    const items = strict ? strictSort(baseItems, query) : baseItems;

    res.status(200).json({
      items,
      totalHits: Math.max(0, data.totalHits || 0),
      page,
      perPage,
    });
  } catch (error: any) {
    console.error('Stock image API error:', error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
