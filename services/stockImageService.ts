export type StockImageResult = {
  id: string;
  url: string;
  thumbUrl: string;
  alt: string;
  kind?: 'photo' | 'illustration' | 'vector';
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
  opts?: { page?: number; perPage?: number; signal?: AbortSignal }
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
    }))
    .filter((item) => item.url);

  return {
    items,
    totalHits: Math.max(0, data.totalHits || 0),
    page,
    perPage,
  };
};
