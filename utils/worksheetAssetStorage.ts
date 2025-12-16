import { supabase } from '../services/supabase';

export type UploadedAsset = {
  path: string;
  signedUrl: string;
};

const randomId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? (crypto as any).randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const WORKSHEET_ASSETS_BUCKET = 'worksheet-assets';
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export const createSignedUrlForWorksheetAsset = async (path: string, expiresInSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS) => {
  const { data, error } = await supabase.storage
    .from(WORKSHEET_ASSETS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Failed to create signed asset URL');
  return data.signedUrl;
};

export const createSignedUrlsForWorksheetAssets = async (paths: string[], expiresInSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS) => {
  if (!paths.length) return new Map<string, string>();

  const { data, error } = await supabase.storage
    .from(WORKSHEET_ASSETS_BUCKET)
    .createSignedUrls(paths, expiresInSeconds);

  if (error) throw error;

  const map = new Map<string, string>();
  for (const item of data || []) {
    if (item?.path && item?.signedUrl) {
      map.set(item.path, item.signedUrl);
    }
  }
  return map;
};

export const resolveWorksheetHtmlAssetUrls = async (html: string, opts?: { expiresInSeconds?: number }) => {
  if (!html) return html;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const imgEls = Array.from(doc.querySelectorAll('img[data-storage-path]')) as HTMLImageElement[];
    const paths = Array.from(
      new Set(
        imgEls
          .map((img) => img.getAttribute('data-storage-path') || '')
          .map((p) => p.trim())
          .filter(Boolean)
      )
    );

    if (!paths.length) return html;

    const signed = await createSignedUrlsForWorksheetAssets(paths, opts?.expiresInSeconds);
    for (const img of imgEls) {
      const p = (img.getAttribute('data-storage-path') || '').trim();
      const url = p ? signed.get(p) : null;
      if (url) img.setAttribute('src', url);
    }

    return doc.body.innerHTML;
  } catch (e) {
    // If DOMParser isn't available or something unexpected happens, just return original HTML.
    return html;
  }
};

const TRANSPARENT_GIF_1PX =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

export const stripSignedUrlsButKeepStoragePaths = (html: string) => {
  if (!html) return html;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const imgEls = Array.from(doc.querySelectorAll('img[data-storage-path]')) as HTMLImageElement[];
    if (!imgEls.length) return html;

    for (const img of imgEls) {
      // Keep a valid `src` attribute so TipTap still parses the image node on load.
      img.setAttribute('src', TRANSPARENT_GIF_1PX);
    }

    return doc.body.innerHTML;
  } catch {
    return html;
  }
};

export const deleteWorksheetAssetFolder = async (params: { userId: string; worksheetId: string }) => {
  const { userId, worksheetId } = params;
  const prefix = `worksheets/${userId}/${worksheetId}`;

  const toRemove: string[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage
      .from(WORKSHEET_ASSETS_BUCKET)
      .list(prefix, { limit, offset });

    if (error) throw error;
    if (!data?.length) break;

    for (const item of data) {
      if (!item?.name) continue;
      toRemove.push(`${prefix}/${item.name}`);
    }

    if (data.length < limit) break;
    offset += limit;
  }

  if (!toRemove.length) return;

  const { error: removeError } = await supabase.storage
    .from(WORKSHEET_ASSETS_BUCKET)
    .remove(toRemove);

  if (removeError) throw removeError;
};

export const uploadWorksheetAsset = async (params: {
  userId: string;
  blob: Blob;
  contentType: string;
  extension: string;
  kind: 'image' | 'logo';
  worksheetId?: string;
}): Promise<UploadedAsset> => {
  const { userId, blob, contentType, extension, kind, worksheetId } = params;

  const id = randomId();
  const safeWorksheetId = worksheetId || 'draft';
  const path = `worksheets/${userId}/${safeWorksheetId}/${kind}-${id}.${extension}`;

  const { error } = await supabase.storage
    .from(WORKSHEET_ASSETS_BUCKET)
    .upload(path, blob, { contentType, upsert: false, cacheControl: '31536000' });

  if (error) {
    throw error;
  }

  const signedUrl = await createSignedUrlForWorksheetAsset(path);
  return { path, signedUrl };
};
