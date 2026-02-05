export type StockImageResult = {
  id: string;
  url: string;
  thumbUrl: string;
  alt: string;
  kind?: 'photo' | 'illustration' | 'vector';
  tags?: string;
};

export type StockImageSearchResult = {
  items: StockImageResult[];
  totalHits: number;
  page: number;
  perPage: number;
};

const PIXABAY_API_KEY = import.meta.env.VITE_PIXABAY_API_KEY || '';

export const searchStockImages = async (
  query: string,
  opts?: { page?: number; perPage?: number; signal?: AbortSignal; strict?: boolean }
): Promise<StockImageSearchResult> => {
  const trimmed = query.trim();
  if (!trimmed) return { items: [], totalHits: 0, page: 1, perPage: 0 };
  if (!PIXABAY_API_KEY) {
    throw new Error('Missing VITE_PIXABAY_API_KEY');
  }

  const page = Math.max(1, Math.floor(opts?.page ?? 1));
  const perPage = Math.max(3, Math.min(50, Math.floor(opts?.perPage ?? 24)));

  const url = new URL('https://pixabay.com/api/');
  url.searchParams.set('key', PIXABAY_API_KEY);
  url.searchParams.set('q', trimmed);
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('page', String(page));
  url.searchParams.set('safesearch', 'true');
  url.searchParams.set('image_type', 'all');

  const response = await fetch(url.toString(), {
    method: 'GET',
    signal: opts?.signal,
  });

  if (!response.ok) {
    throw new Error(`Stock image search failed (${response.status})`);
  }

  const data = (await response.json()) as {
    totalHits?: number;
    hits?: Array<{
      id: number;
      tags?: string;
      previewURL?: string;
      webformatURL?: string;
      largeImageURL?: string;
      type?: 'photo' | 'illustration' | 'vector';
    }>;
  };

  const normalizeUrl = (value: string | undefined) => {
    if (!value) return '';
    return value.replace(/^http:\/\//i, 'https://');
  };

  const items = (data.hits || [])
    .filter((item) => item.previewURL || item.webformatURL || item.largeImageURL)
    .map((item) => ({
      id: String(item.id),
      url: normalizeUrl(item.largeImageURL || item.webformatURL || item.previewURL),
      thumbUrl: normalizeUrl(item.previewURL || item.webformatURL || item.largeImageURL),
      alt: (item.tags || trimmed).split(',')[0]?.trim() || trimmed,
      kind: item.type || 'photo',
      tags: item.tags || '',
    }))
    .filter((item) => item.url);

  const strict = Boolean(opts?.strict);
  if (!strict || !items.length) {
    return {
      items,
      totalHits: Math.max(0, data.totalHits || 0),
      page,
      perPage,
    };
  }

  const queryTokens = trimmed
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const hasTokens = queryTokens.length > 0;
  const minMatches = Math.max(1, Math.ceil(queryTokens.length * 0.5));
  const primaryToken = queryTokens[0] || '';
  const filtered = hasTokens
    ? items.filter((item) => {
        const haystack = `${item.alt} ${item.tags}`.toLowerCase();
        const matchCount = queryTokens.reduce((acc, token) => acc + (haystack.includes(token) ? 1 : 0), 0);
        return matchCount >= minMatches;
      })
    : items;

  const scored = filtered
    .map((item) => {
      const haystack = `${item.alt} ${item.tags}`.toLowerCase();
      const score = queryTokens.reduce((acc, token) => {
        if (!token) return acc;
        const exact = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'i').test(haystack);
        if (exact) return acc + 3;
        if (haystack.includes(token)) return acc + 1;
        return acc;
      }, 0);
      const primaryExact = primaryToken
        ? new RegExp(`\\b${primaryToken.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'i').test(haystack)
        : false;
      return { item, score, primaryExact };
    });

  const hasPrimaryExact = scored.some((entry) => entry.primaryExact);
  const ordered = (hasPrimaryExact ? scored.filter((entry) => entry.primaryExact) : scored)
    .sort((a, b) => {
      if (a.primaryExact !== b.primaryExact) return a.primaryExact ? -1 : 1;
      return b.score - a.score;
    })
    .map(({ item }) => item);

  return {
    items: ordered,
    totalHits: Math.max(0, data.totalHits || 0),
    page,
    perPage,
  };
};
