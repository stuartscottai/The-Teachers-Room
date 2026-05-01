import { buildStockImageProxyPath, extractPixabaySourceUrl, toCoepSafeStockImageUrl } from './stockImageUrl';

export const resolveGameImageUrl = (value?: string, fallbackValue?: string): string => {
  const primaryRaw = String(value || '').trim();
  const fallbackRaw = String(fallbackValue || '').trim();
  if (!primaryRaw && !fallbackRaw) return '';

  const preferServerProxy = !import.meta.env.DEV;

  if (preferServerProxy) {
    const primarySource = extractPixabaySourceUrl(primaryRaw);
    const fallbackSource = extractPixabaySourceUrl(fallbackRaw);
    if (primarySource && fallbackSource && primarySource !== fallbackSource) {
      return buildStockImageProxyPath(primarySource, fallbackSource);
    }
    if (!primarySource && fallbackSource) {
      return buildStockImageProxyPath(fallbackSource);
    }
  }

  // Local Vite dev reliability for stock images: old saved games can contain a
  // stale primary Pixabay URL while thumbUrl remains valid. For uploaded/signed
  // game images, prefer the full image first so a bad thumbnail cannot hide it.
  if (!preferServerProxy) {
    const primarySource = extractPixabaySourceUrl(primaryRaw);
    const fallbackSource = extractPixabaySourceUrl(fallbackRaw);
    if (primarySource && fallbackSource) {
      const fallbackFirst = toCoepSafeStockImageUrl(fallbackRaw, false);
      if (fallbackFirst) return fallbackFirst;
    }
  }

  const primary = primaryRaw ? toCoepSafeStockImageUrl(primaryRaw, preferServerProxy) : '';
  if (primary) return primary;

  return fallbackRaw ? toCoepSafeStockImageUrl(fallbackRaw, preferServerProxy) : '';
};
