import { toCoepSafeStockImageUrl } from '../utils/stockImageUrl';

export type StockImageResult = {
  id: string;
  url: string;
  thumbUrl: string;
  alt: string;
  kind?: 'photo' | 'illustration' | 'vector';
  tags?: string;
  width?: number;
  height?: number;
};

export type StockImageSearchResult = {
  items: StockImageResult[];
  totalHits: number;
  page: number;
  perPage: number;
};

const PUBLIC_PIXABAY_API_KEY = import.meta.env.VITE_PIXABAY_API_KEY || '';
const STOCK_IMAGE_API_URL = '/api/stock-images';

type PixabayApiPayload = {
  totalHits?: number;
  hits?: Array<{
    id: number;
    tags?: string;
    previewURL?: string;
    webformatURL?: string;
    largeImageURL?: string;
    type?: 'photo' | 'illustration' | 'vector';
    imageWidth?: number;
    imageHeight?: number;
  }>;
};

const normalizeUrl = (value: string | undefined) => {
  if (!value) return '';
  return value.replace(/^http:\/\//i, 'https://');
};

const normalizeDimension = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.floor(parsed);
};

const preferServerProxy = () => !import.meta.env.DEV;

const sanitizeResult = (item: StockImageResult): StockImageResult => {
  const primary = toCoepSafeStockImageUrl(item.url, preferServerProxy());
  const thumbBase = item.thumbUrl || item.url;
  const thumb = toCoepSafeStockImageUrl(thumbBase, preferServerProxy());
  return {
    ...item,
    url: primary,
    thumbUrl: thumb || primary,
  };
};

const orderStrict = (items: StockImageResult[], query: string): StockImageResult[] => {
  if (!items.length) return items;
  const queryTokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!queryTokens.length) return items;

  const minMatches = Math.max(1, Math.ceil(queryTokens.length * 0.5));
  const primaryToken = queryTokens[0] || '';

  const filtered = items.filter((item) => {
    const haystack = `${item.alt} ${item.tags || ''}`.toLowerCase();
    const matchCount = queryTokens.reduce((acc, token) => acc + (haystack.includes(token) ? 1 : 0), 0);
    return matchCount >= minMatches;
  });

  const scored = filtered.map((item) => {
    const haystack = `${item.alt} ${item.tags || ''}`.toLowerCase();
    const score = queryTokens.reduce((acc, token) => {
      if (!token) return acc;
      const exact = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'i').test(haystack);
      if (exact) return acc + 3;
      if (haystack.includes(token)) return acc + 1;
      return acc;
    }, 0);
    const width = item.width || 0;
    const height = item.height || 0;
    const ratio = width > 0 && height > 0 ? width / height : 0;
    const orientationScore = ratio >= 1.2 ? 1 : ratio > 0 && ratio < 0.95 ? -1 : 0;
    const primaryExact = primaryToken
      ? new RegExp(`\\b${primaryToken.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'i').test(haystack)
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

const mapPixabayPayload = (
  data: PixabayApiPayload,
  query: string,
  strict: boolean
): Pick<StockImageSearchResult, 'items' | 'totalHits'> => {
  const items = (data.hits || [])
    .filter((item) => item.previewURL || item.webformatURL || item.largeImageURL)
    .map((item) => ({
      id: String(item.id),
      url: normalizeUrl(item.largeImageURL || item.webformatURL || item.previewURL),
      thumbUrl: normalizeUrl(item.webformatURL || item.previewURL || item.largeImageURL),
      alt: (item.tags || query).split(',')[0]?.trim() || query,
      kind: item.type || 'photo',
      tags: item.tags || '',
      width: normalizeDimension(item.imageWidth),
      height: normalizeDimension(item.imageHeight),
    }))
    .filter((item) => item.url);

  return {
    items: (strict ? orderStrict(items, query) : items).map(sanitizeResult),
    totalHits: Math.max(0, data.totalHits || 0),
  };
};

export const searchStockImages = async (
  query: string,
  opts?: { page?: number; perPage?: number; signal?: AbortSignal; strict?: boolean }
): Promise<StockImageSearchResult> => {
  const trimmed = query.trim();
  if (!trimmed) return { items: [], totalHits: 0, page: 1, perPage: 0 };

  const page = Math.max(1, Math.floor(opts?.page ?? 1));
  const perPage = Math.max(3, Math.min(50, Math.floor(opts?.perPage ?? 24)));
  const strict = Boolean(opts?.strict);

  const proxyUrl = new URL(STOCK_IMAGE_API_URL, window.location.origin);
  proxyUrl.searchParams.set('q', trimmed);
  proxyUrl.searchParams.set('page', String(page));
  proxyUrl.searchParams.set('perPage', String(perPage));
  proxyUrl.searchParams.set('strict', strict ? 'true' : 'false');

  try {
    const response = await fetch(proxyUrl.toString(), {
      method: 'GET',
      cache: 'no-store',
      signal: opts?.signal,
    });

    if (response.ok) {
      const data = (await response.json()) as StockImageSearchResult;
      const items = Array.isArray(data?.items) ? data.items.map(sanitizeResult) : [];
      return {
        items,
        totalHits: Math.max(0, Number(data?.totalHits || 0)),
        page,
        perPage,
      };
    }

    // If server route exists but is misconfigured, surface the error when no client fallback is available.
    if (!PUBLIC_PIXABAY_API_KEY) {
      let message = `Stock image search failed (${response.status})`;
      try {
        const err = await response.json();
        if (typeof err?.error === 'string' && err.error.trim()) {
          message = err.error.trim();
        }
      } catch {
        // ignore parse failure
      }
      throw new Error(message);
    }
  } catch (serverErr) {
    if (!PUBLIC_PIXABAY_API_KEY) {
      throw serverErr instanceof Error ? serverErr : new Error('Stock image search failed.');
    }
  }

  // Local fallback path for Vite dev where /api may not be running.
  if (!PUBLIC_PIXABAY_API_KEY) {
    throw new Error('Missing PIXABAY_API_KEY on server (or VITE_PIXABAY_API_KEY for local fallback).');
  }

  const directUrl = new URL('https://pixabay.com/api/');
  directUrl.searchParams.set('key', PUBLIC_PIXABAY_API_KEY);
  directUrl.searchParams.set('q', trimmed);
  directUrl.searchParams.set('per_page', String(perPage));
  directUrl.searchParams.set('page', String(page));
  directUrl.searchParams.set('safesearch', 'true');
  directUrl.searchParams.set('image_type', 'all');

  const directResponse = await fetch(directUrl.toString(), {
    method: 'GET',
    cache: 'no-store',
    signal: opts?.signal,
  });
  if (!directResponse.ok) {
    throw new Error(`Stock image search failed (${directResponse.status})`);
  }
  const directData = (await directResponse.json()) as PixabayApiPayload;
  const mapped = mapPixabayPayload(directData, trimmed, strict);

  return {
    items: mapped.items,
    totalHits: mapped.totalHits,
    page,
    perPage,
  };
};
