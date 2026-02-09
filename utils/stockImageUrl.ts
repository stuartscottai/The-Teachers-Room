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

export const extractPixabaySourceUrl = (value: string): string | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const parsed = parseUrl(raw);
  if (!parsed) return null;

  if (parsed.pathname.startsWith('/api/stock-image-proxy')) {
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
    const nestedRaw = /^https?:\/\//i.test(nestedParam) ? nestedParam : `https://${nestedParam}`;
    const nested = parseUrl(nestedRaw);
    if (!nested || !isPixabayHost(nested.hostname)) return null;
    return normalizeHttps(nested.toString());
  }

  return null;
};

export const buildStockImageProxyPath = (pixabayUrl: string): string =>
  `/api/stock-image-proxy?url=${encodeURIComponent(normalizeHttps(pixabayUrl))}`;

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

