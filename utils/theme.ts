export type SiteTheme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'teachers-room-theme';

export const getSiteTheme = (): SiteTheme =>
  typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';

export const setSiteTheme = (theme: SiteTheme) => {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#171a1f' : '#facc15');
  try { window.localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* Browsers may disable storage. */ }
};
