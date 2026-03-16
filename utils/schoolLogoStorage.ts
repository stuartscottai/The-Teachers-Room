import { supabase } from '../services/supabase';
import { optimizeImageForUpload } from './imageOptimize';
import { WORKSHEET_ASSETS_BUCKET } from './worksheetAssetStorage';

type SchoolLogoUploadResult = {
  path: string;
  signedUrl: string;
};

const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour
const MAX_SOURCE_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

const randomId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? (crypto as any).randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const cleanPath = (value: unknown) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length ? text : null;
};

const assertImageFile = (file: File) => {
  if (!file) throw new Error('Please choose an image file.');
  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed.');
  }
  if (file.size > MAX_SOURCE_FILE_SIZE_BYTES) {
    throw new Error('Image is too large. Please use a file under 8 MB.');
  }
};

export const createSignedUrlForSchoolLogo = async (
  path: string,
  expiresInSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS
) => {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(WORKSHEET_ASSETS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Failed to create school logo URL.');
  return data.signedUrl;
};

export const getSchoolLogoPath = async (schoolId: string): Promise<string | null> => {
  if (!schoolId) return null;

  const { data, error } = await supabase
    .from('schools')
    .select('logo_storage_path')
    .eq('id', schoolId)
    .maybeSingle();

  if (error) throw error;
  return cleanPath((data as any)?.logo_storage_path);
};

export const resolveSchoolLogoForSchool = async (schoolId: string): Promise<{ path: string | null; signedUrl: string | null }> => {
  const path = await getSchoolLogoPath(schoolId);
  if (!path) return { path: null, signedUrl: null };

  // Prefer authenticated download -> blob URL in-app. This is more reliable in local dev
  // where signed URL caching/expiry can produce broken image responses.
  try {
    const { data, error } = await supabase.storage
      .from(WORKSHEET_ASSETS_BUCKET)
      .download(path);
    if (error) throw error;
    if (data) {
      return { path, signedUrl: URL.createObjectURL(data) };
    }
  } catch {
    // Fallback to signed URL if direct download is unavailable.
  }

  const signedUrl = await createSignedUrlForSchoolLogo(path);
  return { path, signedUrl };
};

export const uploadSchoolLogoForSchool = async (params: {
  schoolId: string;
  file: File;
}): Promise<SchoolLogoUploadResult> => {
  const schoolId = (params.schoolId || '').trim();
  if (!schoolId) throw new Error('Missing school id.');

  const file = params.file;
  assertImageFile(file);

  const previousPath = await getSchoolLogoPath(schoolId).catch(() => null);
  const optimized = await optimizeImageForUpload(file, {
    maxDimension: 900,
    quality: 0.84,
    preferAlpha: true
  });

  const nextPath = `schools/${schoolId}/logo-${randomId()}.${optimized.extension}`;

  const { error: uploadError } = await supabase.storage
    .from(WORKSHEET_ASSETS_BUCKET)
    .upload(nextPath, optimized.blob, {
      contentType: optimized.contentType,
      upsert: false,
      cacheControl: '31536000'
    });

  if (uploadError) throw uploadError;

  const { error: updateError } = await supabase
    .from('schools')
    .update({ logo_storage_path: nextPath })
    .eq('id', schoolId);

  if (updateError) {
    await supabase.storage.from(WORKSHEET_ASSETS_BUCKET).remove([nextPath]).catch(() => undefined);
    throw updateError;
  }

  if (previousPath && previousPath !== nextPath) {
    await supabase.storage.from(WORKSHEET_ASSETS_BUCKET).remove([previousPath]).catch(() => undefined);
  }

  const signedUrl = await createSignedUrlForSchoolLogo(nextPath);
  if (!signedUrl) throw new Error('Failed to create school logo URL.');

  return { path: nextPath, signedUrl };
};

export const removeSchoolLogoForSchool = async (schoolId: string): Promise<void> => {
  const cleanSchoolId = (schoolId || '').trim();
  if (!cleanSchoolId) throw new Error('Missing school id.');

  const previousPath = await getSchoolLogoPath(cleanSchoolId).catch(() => null);

  const { error: updateError } = await supabase
    .from('schools')
    .update({ logo_storage_path: null })
    .eq('id', cleanSchoolId);

  if (updateError) throw updateError;

  if (previousPath) {
    await supabase.storage.from(WORKSHEET_ASSETS_BUCKET).remove([previousPath]).catch(() => undefined);
  }
};
