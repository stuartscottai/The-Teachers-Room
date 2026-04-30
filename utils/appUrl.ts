const DEFAULT_PUBLIC_APP_URL = 'https://www.theteachersroom.app';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const getPublicAppUrl = () => {
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    return trimTrailingSlash(window.location.origin);
  }

  const configuredUrl = import.meta.env.VITE_APP_URL?.trim();
  if (configuredUrl) return trimTrailingSlash(configuredUrl);

  if (typeof window !== 'undefined') {
    const currentOrigin = window.location.origin;
    if (import.meta.env.DEV || !window.location.hostname.endsWith('.vercel.app')) {
      return trimTrailingSlash(currentOrigin);
    }
  }

  return DEFAULT_PUBLIC_APP_URL;
};

export const getPublicAppHashUrl = (hashPath = '/') => {
  const cleanHashPath = hashPath.startsWith('/') ? hashPath : `/${hashPath}`;
  return `${getPublicAppUrl()}${cleanHashPath}`;
};
