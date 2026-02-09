import { toCoepSafeStockImageUrl } from './stockImageUrl';

export const resolveGameImageUrl = (value?: string): string => {
  if (!value) return '';
  const preferServerProxy = !import.meta.env.DEV;
  return toCoepSafeStockImageUrl(value, preferServerProxy);
};
