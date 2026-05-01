import { buildStockImageProxyPath, extractPixabaySourceUrl, toCoepSafeStockImageUrl } from './stockImageUrl';

const uniqueUrls = (values: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const next = String(value || '').trim();
    if (!next || seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }
  return out;
};

export const resolveGameImageUrls = (value?: string, fallbackValue?: string): string[] => {
  const primaryRaw = String(value || '').trim();
  const fallbackRaw = String(fallbackValue || '').trim();
  if (!primaryRaw && !fallbackRaw) return [];

  const preferServerProxy = !import.meta.env.DEV;
  const primarySource = extractPixabaySourceUrl(primaryRaw);
  const fallbackSource = extractPixabaySourceUrl(fallbackRaw);
  const urls: string[] = [];

  if (preferServerProxy) {
    if (primarySource && fallbackSource && primarySource !== fallbackSource) {
      urls.push(buildStockImageProxyPath(primarySource, fallbackSource));
    }
    if (primarySource) urls.push(buildStockImageProxyPath(primarySource));
    if (fallbackSource) urls.push(buildStockImageProxyPath(fallbackSource));
  } else {
    if (fallbackSource) urls.push(toCoepSafeStockImageUrl(fallbackRaw, false));
    if (primarySource) urls.push(toCoepSafeStockImageUrl(primaryRaw, false));
  }

  if (primaryRaw) urls.push(toCoepSafeStockImageUrl(primaryRaw, preferServerProxy));
  if (fallbackRaw) urls.push(toCoepSafeStockImageUrl(fallbackRaw, preferServerProxy));

  return uniqueUrls(urls);
};

export const resolveGameImageUrl = (value?: string, fallbackValue?: string): string => {
  return resolveGameImageUrls(value, fallbackValue)[0] || '';
};
