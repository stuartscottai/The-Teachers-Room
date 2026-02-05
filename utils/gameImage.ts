const shouldProxyImageUrl = (value: string): boolean => /pixabay\.com/i.test(value);

export const resolveGameImageUrl = (value?: string): string => {
  if (!value) return '';
  if (!shouldProxyImageUrl(value)) return value;
  const cleaned = value.replace(/^https?:\/\//i, '');
  return `https://images.weserv.nl/?url=${encodeURIComponent(cleaned)}`;
};
