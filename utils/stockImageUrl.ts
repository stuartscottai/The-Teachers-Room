const PIXABAY_HOST = /(^|\.)pixabay\.com$/i;

const normalizeHttps = (value: string): string => value.replace(/^http:\/\//i, 'https://');

const parseUrl = (value: string): URL | null => {
  try {
    return new URL(value, 'https://local.invalid');
  } catch {
    return null;
  }
};

const isPixabayHost = (host: string): boolean => PIXABAY_HOST.test(host);

const coerceLikelyPixabayUrl = (value: string): string | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  if (/^\/?get\//i.test(raw)) {
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    return `https://pixabay.com${path}`;
  }

  if (/^\/\/[^/]+/i.test(raw)) {
    return normalizeHttps(`https:${raw}`);
  }

  if (/^(?:[a-z0-9-]+\.)*pixabay\.com\//i.test(raw)) {
    return normalizeHttps(`https://${raw}`);
  }

  return null;
};

const decodeIfEncoded = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const extractPixabaySourceUrl = (value: string, depth = 0): string | null => {
  if (depth > 4) return null;
  const raw = String(value || '').trim();
  if (!raw) return null;

  const hinted = coerceLikelyPixabayUrl(raw);
  if (hinted) {
    const hintedParsed = parseUrl(hinted);
    if (hintedParsed && isPixabayHost(hintedParsed.hostname)) return hinted;
  }

  const parsed = parseUrl(raw);
  if (!parsed) return null;

  if (parsed.pathname.startsWith('/api/stock-image-proxy')) {
    const nestedParam = parsed.searchParams.get('url');
    if (!nestedParam) return null;
    const nested = extractPixabaySourceUrl(nestedParam, depth + 1);
    if (nested) return nested;
    const decodedNested = decodeIfEncoded(nestedParam);
    if (decodedNested !== nestedParam) {
      return extractPixabaySourceUrl(decodedNested, depth + 1);
    }
    return null;
  }

  if (isPixabayHost(parsed.hostname)) {
    if (!/^https?:\/\//i.test(raw)) {
      return normalizeHttps(`https://${parsed.hostname}${parsed.pathname}${parsed.search}${parsed.hash}`);
    }
    return normalizeHttps(raw);
  }

  if (parsed.hostname.toLowerCase() === 'images.weserv.nl') {
    const nestedParam = parsed.searchParams.get('url');
    if (!nestedParam) return null;
    const nested = extractPixabaySourceUrl(nestedParam, depth + 1);
    if (nested) return nested;
    const decodedNested = decodeIfEncoded(nestedParam);
    if (decodedNested !== nestedParam) {
      return extractPixabaySourceUrl(decodedNested, depth + 1);
    }
    return null;
  }

  return null;
};

export const buildStockImageProxyPath = (pixabayUrl: string, fallbackPixabayUrl?: string): string => {
  const params = new URLSearchParams();
  params.set('url', normalizeHttps(pixabayUrl));
  if (fallbackPixabayUrl) {
    params.set('fallback', normalizeHttps(fallbackPixabayUrl));
  }
  return `/api/stock-image-proxy?${params.toString()}`;
};

export const buildStockImageIdProxyPath = (stockId: string, fallbackPixabayUrl?: string): string => {
  const params = new URLSearchParams();
  params.set('id', stockId);
  if (fallbackPixabayUrl) {
    params.set('url', normalizeHttps(fallbackPixabayUrl));
  }
  return `/api/stock-image-proxy?${params.toString()}`;
};

export const buildWeservProxyUrl = (pixabayUrl: string): string => {
  const normalized = normalizeHttps(pixabayUrl).replace(/^https?:\/\//i, '');
  return `https://images.weserv.nl/?url=${encodeURIComponent(normalized)}`;
};

export const toCoepSafeStockImageUrl = (value: string, preferServerProxy: boolean): string => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const pixabaySource = extractPixabaySourceUrl(raw);
  if (!pixabaySource) return normalizeHttps(raw);
  return preferServerProxy ? buildStockImageProxyPath(pixabaySource) : buildWeservProxyUrl(pixabaySource);
};
