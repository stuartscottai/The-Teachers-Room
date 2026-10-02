export const SHARE_LOGO_IMAGE = '/assets/share-logo.png';
export const SHARE_ORIGIN = 'https://www.theteachersroom.app';
export const SHARE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const SHARE_PATHS = {
  teacher: '/share/game',
  student: '/student/game',
  'student-share': '/student/share',
} as const;
export type ShareKind = keyof typeof SHARE_PATHS;

export const getSharePreviewImage = (pathname: string): string => {
  for (const [kind, prefix] of Object.entries(SHARE_PATHS)) {
    const id = pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length + 1) : '';
    if (SHARE_ID_PATTERN.test(id)) {
      return `/api/share-preview?kind=${kind}&id=${id}&image=1`;
    }
  }
  return SHARE_LOGO_IMAGE;
};
