/**
 * Supported image formats for upload
 */
export const ACCEPTED_IMAGE_FORMATS = 'image/*,.heic,.heif';

/**
 * Check if file is HEIC/HEIF format
 */
export function isHeicFile(file: File): boolean {
  const heicTypes = ['image/heic', 'image/heif'];
  const heicExtensions = ['.heic', '.heif'];
  
  return (
    heicTypes.includes(file.type.toLowerCase()) ||
    heicExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
  );
}

/**
 * Convert HEIC/HEIF to JPEG
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  if (!isHeicFile(file)) {
    return file;
  }

  // Only run on client
  if (typeof window === 'undefined') {
    return file;
  }

  try {
    // Dynamic import to avoid SSR issues
    const heic2any = (await import('heic2any')).default;
    
    const blob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    });

    // heic2any может вернуть массив или один blob
    const resultBlob = Array.isArray(blob) ? blob[0] : blob;
    
    // Создаём новый File с .jpg расширением
    const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    return new File([resultBlob], newFileName, { type: 'image/jpeg' });
  } catch (error) {
    console.error('HEIC conversion error:', error);
    throw new Error('Не удалось конвертировать HEIC изображение');
  }
}

/**
 * Process uploaded image file (convert if needed)
 */
export async function processImageFile(file: File): Promise<File> {
  if (isHeicFile(file)) {
    return convertHeicToJpeg(file);
  }
  return file;
}

/**
 * Create preview URL from file (handles HEIC)
 */
export async function createImagePreview(file: File): Promise<string> {
  const processedFile = await processImageFile(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(processedFile);
  });
}
