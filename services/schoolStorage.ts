import { UploadedFile } from '../types';
import { processFile } from '../utils/gameUtils';
import { supabase } from './supabase';

export const SCHOOL_STORAGE_BUCKET = 'school-storage';
export const SCHOOL_STORAGE_LIMIT_BYTES = 100 * 1024 * 1024;
export const SCHOOL_STORAGE_LIMIT_LABEL = '100 MB';

export interface SchoolStorageFolder {
  id: string;
  schoolId: string;
  parentId: string | null;
  name: string;
  createdBy: string | null;
  createdAt: string;
}

export interface SchoolStorageFile {
  id: string;
  schoolId: string;
  folderId: string | null;
  name: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  createdBy: string | null;
  createdAt: string;
}

export interface SchoolStorageUsage {
  totalBytes: number;
  remainingBytes: number;
  limitBytes: number;
  percentUsed: number;
}

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const optionalText = (value: unknown) => {
  const text = asText(value);
  return text.length ? text : null;
};

const asBytes = (value: unknown) => Math.max(0, Number(value || 0));

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message || fallback);
  }
  return fallback;
};

export const formatSchoolStorageBytes = (value: number) => {
  const bytes = asBytes(value);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const buildSchoolStorageLimitMessage = (remainingBytes: number) => {
  const remaining = asBytes(remainingBytes);
  if (remaining <= 0) {
    return `School Storage is limited to ${SCHOOL_STORAGE_LIMIT_LABEL}. Remove some files before uploading more.`;
  }
  return `School Storage is limited to ${SCHOOL_STORAGE_LIMIT_LABEL}. Only ${formatSchoolStorageBytes(remaining)} remains. Remove some files before uploading more.`;
};

const randomId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? (crypto as any).randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const sanitizeFileName = (value: string) =>
  value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180) || 'file';

const inferMimeTypeFromName = (fileName: string) => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.md')) return 'text/markdown';
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html';
  if (lower.endsWith('.xml')) return 'application/xml';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
};

const normalizeMimeType = (file: File | Blob, fileName: string) => {
  const mimeType = typeof file.type === 'string' ? file.type.trim() : '';
  return mimeType || inferMimeTypeFromName(fileName);
};

const decodeBase64ToUint8Array = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const uploadedFileToBrowserFile = (uploadedFile: UploadedFile) => {
  const name = asText(uploadedFile.name) || 'file';
  const mimeType = asText(uploadedFile.mimeType) || inferMimeTypeFromName(name);
  const data = asText(uploadedFile.data);
  if (!data) {
    throw new Error(`Missing file data for "${name}".`);
  }

  const bytes = decodeBase64ToUint8Array(data);
  return new File([bytes], name, { type: mimeType });
};

const mapFolderRow = (row: any): SchoolStorageFolder => ({
  id: String(row.id || ''),
  schoolId: String(row.school_id || ''),
  parentId: optionalText(row.parent_id),
  name: asText(row.name) || 'Untitled Folder',
  createdBy: optionalText(row.created_by),
  createdAt: row.created_at || new Date().toISOString(),
});

const mapFileRow = (row: any): SchoolStorageFile => ({
  id: String(row.id || ''),
  schoolId: String(row.school_id || ''),
  folderId: optionalText(row.folder_id),
  name: asText(row.file_name) || 'Untitled File',
  mimeType: asText(row.mime_type) || 'application/octet-stream',
  sizeBytes: asBytes(row.size_bytes),
  storagePath: asText(row.storage_path),
  createdBy: optionalText(row.created_by),
  createdAt: row.created_at || new Date().toISOString(),
});

export const listSchoolStorageFolders = async (schoolId: string): Promise<SchoolStorageFolder[]> => {
  if (!schoolId) return [];

  const { data, error } = await supabase
    .from('school_storage_folders')
    .select('id, school_id, parent_id, name, created_by, created_at')
    .eq('school_id', schoolId)
    .order('name', { ascending: true });

  if (error) throw new Error(getErrorMessage(error, 'Could not load school folders.'));
  return (data || []).map(mapFolderRow);
};

export const listSchoolStorageFiles = async (schoolId: string): Promise<SchoolStorageFile[]> => {
  if (!schoolId) return [];

  const { data, error } = await supabase
    .from('school_storage_files')
    .select('id, school_id, folder_id, file_name, mime_type, size_bytes, storage_path, created_by, created_at')
    .eq('school_id', schoolId)
    .order('file_name', { ascending: true });

  if (error) throw new Error(getErrorMessage(error, 'Could not load school files.'));
  return (data || []).map(mapFileRow);
};

export const loadSchoolStorageSnapshot = async (schoolId: string) => {
  const [folders, files] = await Promise.all([
    listSchoolStorageFolders(schoolId),
    listSchoolStorageFiles(schoolId),
  ]);
  return { folders, files };
};

export const calculateSchoolStorageUsage = (
  files: Array<Pick<SchoolStorageFile, 'sizeBytes'>>
): SchoolStorageUsage => {
  const totalBytes = files.reduce((sum, file) => sum + asBytes(file.sizeBytes), 0);
  const remainingBytes = Math.max(0, SCHOOL_STORAGE_LIMIT_BYTES - totalBytes);
  return {
    totalBytes,
    remainingBytes,
    limitBytes: SCHOOL_STORAGE_LIMIT_BYTES,
    percentUsed: SCHOOL_STORAGE_LIMIT_BYTES > 0
      ? Math.min(100, (totalBytes / SCHOOL_STORAGE_LIMIT_BYTES) * 100)
      : 0,
  };
};

export const getSchoolStorageUsage = async (schoolId: string): Promise<SchoolStorageUsage> => {
  const files = await listSchoolStorageFiles(schoolId);
  return calculateSchoolStorageUsage(files);
};

export const ensureSchoolStorageCapacity = async (payload: {
  schoolId: string;
  additionalBytes: number;
  currentUsageBytes?: number;
}): Promise<SchoolStorageUsage> => {
  const schoolId = asText(payload.schoolId);
  if (!schoolId) throw new Error('Missing school id.');

  const additionalBytes = asBytes(payload.additionalBytes);
  const currentUsageBytes = typeof payload.currentUsageBytes === 'number' && Number.isFinite(payload.currentUsageBytes)
    ? asBytes(payload.currentUsageBytes)
    : (await getSchoolStorageUsage(schoolId)).totalBytes;

  const projectedBytes = currentUsageBytes + additionalBytes;
  if (projectedBytes > SCHOOL_STORAGE_LIMIT_BYTES) {
    throw new Error(buildSchoolStorageLimitMessage(SCHOOL_STORAGE_LIMIT_BYTES - currentUsageBytes));
  }

  const remainingBytes = Math.max(0, SCHOOL_STORAGE_LIMIT_BYTES - projectedBytes);
  return {
    totalBytes: projectedBytes,
    remainingBytes,
    limitBytes: SCHOOL_STORAGE_LIMIT_BYTES,
    percentUsed: SCHOOL_STORAGE_LIMIT_BYTES > 0
      ? Math.min(100, (projectedBytes / SCHOOL_STORAGE_LIMIT_BYTES) * 100)
      : 0,
  };
};

export const createSchoolStorageFolder = async (payload: {
  schoolId: string;
  name: string;
  parentId?: string | null;
}): Promise<SchoolStorageFolder> => {
  const schoolId = asText(payload.schoolId);
  const name = asText(payload.name);
  const parentId = optionalText(payload.parentId);

  if (!schoolId) throw new Error('Missing school id.');
  if (!name) throw new Error('Enter a folder name.');

  const { data, error } = await supabase
    .from('school_storage_folders')
    .insert({
      school_id: schoolId,
      parent_id: parentId,
      name,
    })
    .select('id, school_id, parent_id, name, created_by, created_at')
    .single();

  if (error || !data) throw new Error(getErrorMessage(error, 'Could not create folder.'));
  return mapFolderRow(data);
};

export const deleteSchoolStorageFolder = async (folderId: string): Promise<void> => {
  const cleanFolderId = asText(folderId);
  if (!cleanFolderId) throw new Error('Missing folder id.');

  const { error } = await supabase
    .from('school_storage_folders')
    .delete()
    .eq('id', cleanFolderId);

  if (error) {
    throw new Error(
      getErrorMessage(error, 'Could not delete folder. Empty the folder before deleting it.')
    );
  }
};

export const moveSchoolStorageFile = async (payload: {
  fileId: string;
  folderId?: string | null;
}): Promise<void> => {
  const fileId = asText(payload.fileId);
  if (!fileId) throw new Error('Missing file id.');

  const { error } = await supabase
    .from('school_storage_files')
    .update({ folder_id: optionalText(payload.folderId) })
    .eq('id', fileId);

  if (error) throw new Error(getErrorMessage(error, 'Could not move file.'));
};

export const deleteSchoolStorageFile = async (
  file: Pick<SchoolStorageFile, 'id' | 'storagePath'>
): Promise<void> => {
  const fileId = asText(file.id);
  const storagePath = asText(file.storagePath);
  if (!fileId || !storagePath) throw new Error('Missing file details.');

  const { error: dbError } = await supabase
    .from('school_storage_files')
    .delete()
    .eq('id', fileId);

  if (dbError) throw new Error(getErrorMessage(dbError, 'Could not delete file.'));

  const { error: removeError } = await supabase.storage
    .from(SCHOOL_STORAGE_BUCKET)
    .remove([storagePath]);

  if (removeError) {
    throw new Error(getErrorMessage(removeError, 'File record deleted, but storage cleanup failed.'));
  }
};

export const uploadSchoolStorageFile = async (payload: {
  schoolId: string;
  file: File;
  folderId?: string | null;
}): Promise<SchoolStorageFile> => {
  const schoolId = asText(payload.schoolId);
  const folderId = optionalText(payload.folderId);
  const file = payload.file;

  if (!schoolId) throw new Error('Missing school id.');
  if (!file) throw new Error('Choose a file to upload.');

  const safeName = sanitizeFileName(file.name || 'file');
  const fileId = randomId();
  const mimeType = normalizeMimeType(file, safeName);
  const storagePath = `schools/${schoolId}/files/${fileId}/${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(SCHOOL_STORAGE_BUCKET)
    .upload(storagePath, file, {
      contentType: mimeType,
      upsert: false,
      cacheControl: '31536000',
    });

  if (uploadError) {
    throw new Error(getErrorMessage(uploadError, 'Could not upload file to school storage.'));
  }

  const { data, error: insertError } = await supabase
    .from('school_storage_files')
    .insert({
      id: fileId,
      school_id: schoolId,
      folder_id: folderId,
      file_name: safeName,
      mime_type: mimeType,
      size_bytes: Math.max(0, Number(file.size || 0)),
      storage_path: storagePath,
    })
    .select('id, school_id, folder_id, file_name, mime_type, size_bytes, storage_path, created_by, created_at')
    .single();

  if (insertError || !data) {
    await supabase.storage.from(SCHOOL_STORAGE_BUCKET).remove([storagePath]).catch(() => undefined);
    throw new Error(getErrorMessage(insertError, 'Could not save school file metadata.'));
  }

  return mapFileRow(data);
};

export const uploadUploadedFileToSchoolStorage = async (payload: {
  schoolId: string;
  uploadedFile: UploadedFile;
  folderId?: string | null;
}) => {
  const file = uploadedFileToBrowserFile(payload.uploadedFile);
  return uploadSchoolStorageFile({
    schoolId: payload.schoolId,
    folderId: payload.folderId,
    file,
  });
};

export const downloadSchoolStorageFileBlob = async (file: Pick<SchoolStorageFile, 'storagePath'>) => {
  const storagePath = asText(file.storagePath);
  if (!storagePath) throw new Error('Missing storage path.');

  const { data, error } = await supabase.storage
    .from(SCHOOL_STORAGE_BUCKET)
    .download(storagePath);

  if (error || !data) throw new Error(getErrorMessage(error, 'Could not download school file.'));
  return data;
};

export const createSchoolStorageFileViewUrl = async (
  file: Pick<SchoolStorageFile, 'storagePath' | 'mimeType'>
) => {
  const blob = await downloadSchoolStorageFileBlob(file);
  const typedBlob = file.mimeType && blob.type !== file.mimeType
    ? new Blob([blob], { type: file.mimeType })
    : blob;
  return URL.createObjectURL(typedBlob);
};

export const downloadSchoolStorageFileAsUpload = async (file: SchoolStorageFile): Promise<UploadedFile> => {
  const blob = await downloadSchoolStorageFileBlob(file);
  const mimeType = file.mimeType || normalizeMimeType(blob, file.name);
  const wrapped = new File([blob], file.name, { type: mimeType });
  const processed = await processFile(wrapped);
  return {
    ...processed,
    source: 'school-storage',
    schoolStorageFileId: file.id,
    sizeBytes: file.sizeBytes || blob.size,
  };
};

export const downloadSchoolStorageFilesAsUploads = async (files: SchoolStorageFile[]): Promise<UploadedFile[]> => {
  return Promise.all(files.map((file) => downloadSchoolStorageFileAsUpload(file)));
};
