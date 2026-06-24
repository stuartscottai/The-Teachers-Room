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

type PexelsPhoto = {
  id: number;
  width?: number;
  height?: number;
  url?: string;
  photographer?: string;
  alt?: string;
  src?: {
    original?: string;
    large2x?: string;
    large?: string;
    medium?: string;
    small?: string;
    landscape?: string;
    tiny?: string;
  };
};

type PexelsResponse = {
  total_results?: number;
  photos?: PexelsPhoto[];
};

type StockImageItem = {
  id: string;
  url: string;
  thumbUrl: string;
  alt: string;
  kind: string;
  tags: string;
  width?: number;
  height?: number;
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
  items: StockImageItem[],
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

const mapPexelsPhotos = (photos: PexelsPhoto[], query: string): StockImageItem[] =>
  photos
    .filter((item) => item?.src?.medium || item?.src?.large || item?.src?.original)
    .map((item) => {
      const alt = (item.alt || query || 'Pexels photo').trim();
      const photographer = String(item.photographer || '').trim();
      return {
        id: `pexels:${item.id}`,
        url: toProxyUrl(item.src?.large2x || item.src?.large || item.src?.original || item.src?.medium),
        thumbUrl: toProxyUrl(item.src?.landscape || item.src?.medium || item.src?.small || item.src?.tiny || item.src?.large),
        alt,
        kind: 'photo',
        tags: [alt, photographer, 'pexels'].filter(Boolean).join(', '),
        width: parseOptionalDimension(item.width),
        height: parseOptionalDimension(item.height),
      };
    })
    .filter((item) => item.url);

const mapPixabayHits = (hits: PixabayHit[], query: string, imageId?: string): StockImageItem[] =>
  hits
    .filter((item) => item.previewURL || item.webformatURL || item.largeImageURL)
    .map((item) => ({
      id: String(item.id),
      url: toProxyUrl(item.largeImageURL || item.webformatURL || item.previewURL),
      thumbUrl: toProxyUrl(item.webformatURL || item.previewURL || item.largeImageURL),
      alt: (item.tags || query || imageId || '').split(',')[0]?.trim() || query || imageId || 'Pixabay image',
      kind: item.type || 'photo',
      tags: item.tags || '',
      width: parseOptionalDimension(item.imageWidth),
      height: parseOptionalDimension(item.imageHeight),
    }))
    .filter((item) => item.url);

const fetchPexelsById = async (imageId: string, apiKey: string): Promise<{ items: StockImageItem[]; totalHits: number }> => {
  const id = imageId.replace(/^pexels:/i, '').trim();
  if (!/^\d+$/.test(id) || !apiKey) return { items: [], totalHits: 0 };

  const response = await fetch(`https://api.pexels.com/v1/photos/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: { Authorization: apiKey },
  });
  if (!response.ok) return { items: [], totalHits: 0 };

  const photo = (await response.json()) as PexelsPhoto;
  const items = mapPexelsPhotos(photo ? [photo] : [], imageId);
  return { items, totalHits: items.length };
};

const searchPexels = async (
  query: string,
  apiKey: string,
  page: number,
  perPage: number,
  strict: boolean
): Promise<{ items: StockImageItem[]; totalHits: number }> => {
  if (!apiKey || !query) return { items: [], totalHits: 0 };

  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('page', String(page));
  url.searchParams.set('orientation', 'landscape');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Authorization: apiKey },
  });
  if (!response.ok) return { items: [], totalHits: 0 };

  const data = (await response.json()) as PexelsResponse;
  const baseItems = mapPexelsPhotos(data.photos || [], query);
  const items = strict && query ? strictSort(baseItems, query) : baseItems;
  return {
    items,
    totalHits: Math.max(0, data.total_results || baseItems.length || 0),
  };
};

const fetchPixabayById = async (imageId: string, apiKey: string): Promise<{ items: StockImageItem[]; totalHits: number }> => {
  if (!/^\d+$/.test(imageId) || !apiKey) return { items: [], totalHits: 0 };

  const url = new URL('https://pixabay.com/api/');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('id', imageId);
  url.searchParams.set('safesearch', 'true');
  url.searchParams.set('image_type', 'all');

  const response = await fetch(url.toString(), { method: 'GET' });
  if (!response.ok) return { items: [], totalHits: 0 };

  const data = (await response.json()) as PixabayResponse;
  const items = mapPixabayHits(data.hits || [], imageId, imageId);
  return { items, totalHits: Math.max(0, data.totalHits || items.length || 0) };
};

const searchPixabay = async (
  query: string,
  apiKey: string,
  page: number,
  perPage: number,
  strict: boolean
): Promise<{ items: StockImageItem[]; totalHits: number }> => {
  if (!apiKey || !query) return { items: [], totalHits: 0 };

  const url = new URL('https://pixabay.com/api/');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('q', query);
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('page', String(page));
  url.searchParams.set('safesearch', 'true');
  url.searchParams.set('image_type', 'all');

  const response = await fetch(url.toString(), { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Pixabay search failed (${response.status})`);
  }

  const data = (await response.json()) as PixabayResponse;
  const baseItems = mapPixabayHits(data.hits || [], query);
  const items = strict && query ? strictSort(baseItems, query) : baseItems;
  return {
    items,
    totalHits: Math.max(0, data.totalHits || 0),
  };
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
    const imageId = String(req.query?.id || '').trim();
    if (!query && !imageId) {
      res.status(400).json({ error: 'Missing query parameter: q or id' });
      return;
    }

    const pexelsApiKey = process.env.PEXELS_API_KEY || '';
    const pixabayApiKey = process.env.PIXABAY_API_KEY || process.env.VITE_PIXABAY_API_KEY || '';
    if (!pexelsApiKey && !pixabayApiKey) {
      res.status(500).json({ error: 'Missing PEXELS_API_KEY or PIXABAY_API_KEY' });
      return;
    }

    const page = parsePositiveInt(req.query?.page, 1, 1, 500);
    const perPage = parsePositiveInt(req.query?.perPage, 24, 3, 50);
    const strict = String(req.query?.strict || '').toLowerCase() === 'true';

    if (imageId) {
      const pexelsResult = /^pexels:/i.test(imageId)
        ? await fetchPexelsById(imageId, pexelsApiKey)
        : { items: [], totalHits: 0 };
      const pixabayResult = !pexelsResult.items.length
        ? await fetchPixabayById(imageId, pixabayApiKey)
        : { items: [], totalHits: 0 };
      const items = pexelsResult.items.length ? pexelsResult.items : pixabayResult.items;
      res.status(200).json({
        items,
        totalHits: pexelsResult.items.length ? pexelsResult.totalHits : pixabayResult.totalHits,
        page,
        perPage,
      });
      return;
    }

    const pexelsResult = await searchPexels(query, pexelsApiKey, page, perPage, strict);
    const pixabayResult = pexelsResult.items.length
      ? { items: [], totalHits: 0 }
      : await searchPixabay(query, pixabayApiKey, page, perPage, strict);
    const items = pexelsResult.items.length ? pexelsResult.items : pixabayResult.items;

    res.status(200).json({
      items,
      totalHits: pexelsResult.items.length ? pexelsResult.totalHits : pixabayResult.totalHits,
      page,
      perPage,
    });
  } catch (error: any) {
    console.error('Stock image API error:', error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
