import { supabase } from '../services/supabase';

export type UploadedGameAsset = {
  path: string;
  signedUrl: string;
};

const randomId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? (crypto as any).randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// Keep the existing bucket ID so previously uploaded game images and school
// logos continue to work after the retired worksheet feature is removed.
export const APP_ASSETS_BUCKET = 'worksheet-assets';
export const GAME_ASSETS_BUCKET = APP_ASSETS_BUCKET;
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export const createSignedUrlForGameAsset = async (
  path: string,
  expiresInSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS
) => {
  const { data, error } = await supabase.storage
    .from(GAME_ASSETS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Failed to create signed asset URL');
  return data.signedUrl;
};

export const createSignedUrlsForGameAssets = async (
  paths: string[],
  expiresInSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS
) => {
  if (!paths.length) return new Map<string, string>();

  const { data, error } = await supabase.storage
    .from(GAME_ASSETS_BUCKET)
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

export const uploadGameAsset = async (params: {
  userId: string;
  blob: Blob;
  contentType: string;
  extension: string;
  kind: 'question-image';
  gameId?: string;
}): Promise<UploadedGameAsset> => {
  const { userId, blob, contentType, extension, kind, gameId } = params;

  const id = randomId();
  const safeGameId = gameId || 'draft';
  const path = `games/${userId}/${safeGameId}/${kind}-${id}.${extension}`;

  const { error } = await supabase.storage
    .from(GAME_ASSETS_BUCKET)
    .upload(path, blob, { contentType, upsert: false, cacheControl: '31536000' });

  if (error) {
    throw error;
  }

  const signedUrl = await createSignedUrlForGameAsset(path);
  return { path, signedUrl };
};
