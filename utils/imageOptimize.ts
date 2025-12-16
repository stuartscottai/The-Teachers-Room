export type OptimizedImageResult = {
  blob: Blob;
  contentType: string;
  extension: string;
  width: number;
  height: number;
};

type OptimizeOptions = {
  maxDimension: number;
  quality: number;
  preferAlpha?: boolean;
};

const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const optimizeImageForUpload = async (
  file: File,
  options: OptimizeOptions
): Promise<OptimizedImageResult> => {
  const { maxDimension, quality, preferAlpha } = options;

  const img = await loadImageFromFile(file);
  const naturalWidth = img.naturalWidth || 1;
  const naturalHeight = img.naturalHeight || 1;

  const scale = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight));
  const targetWidth = Math.max(1, Math.round(naturalWidth * scale));
  const targetHeight = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d', { alpha: Boolean(preferAlpha) });
  if (!ctx) {
    throw new Error('Canvas not supported');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const q = clamp(quality, 0.1, 1);

  const toBlob = (type: string, q?: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, q));

  // Prefer WebP (smallest), fallback to JPEG, then PNG.
  let blob = await toBlob('image/webp', q);
  let contentType = 'image/webp';
  let extension = 'webp';

  if (!blob) {
    blob = await toBlob('image/jpeg', q);
    contentType = 'image/jpeg';
    extension = 'jpg';
  }

  if (!blob) {
    blob = await toBlob('image/png');
    contentType = 'image/png';
    extension = 'png';
  }

  if (!blob) {
    throw new Error('Failed to encode image');
  }

  return {
    blob,
    contentType,
    extension,
    width: targetWidth,
    height: targetHeight,
  };
};

