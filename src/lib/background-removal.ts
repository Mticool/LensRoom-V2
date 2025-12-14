// Background Removal Utilities
// Supports both API-based and client-side removal

interface RemoveBgResponse {
  success: boolean;
  imageUrl?: string;
  blob?: Blob;
  error?: string;
}

/**
 * Remove background using remove.bg API
 * Free tier: 50 images/month
 * Requires NEXT_PUBLIC_REMOVEBG_API_KEY env variable
 */
export async function removeBackground(imageFile: File): Promise<RemoveBgResponse> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_REMOVEBG_API_KEY;
    
    if (!apiKey) {
      console.warn('remove.bg API key not found, falling back to client-side');
      return removeBackgroundClientSide(imageFile);
    }

    const formData = new FormData();
    formData.append('image_file', imageFile);
    formData.append('size', 'auto');
    formData.append('format', 'png');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.errors?.[0]?.title || 'Background removal failed');
    }

    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);

    return { success: true, imageUrl, blob };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Background removal error:', message);
    return { success: false, error: message };
  }
}

/**
 * Remove background using PhotoRoom API
 * Alternative to remove.bg
 */
export async function removeBackgroundPhotoRoom(imageFile: File): Promise<RemoveBgResponse> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_PHOTOROOM_API_KEY;
    
    if (!apiKey) {
      throw new Error('PhotoRoom API key not configured');
    }

    const formData = new FormData();
    formData.append('image_file', imageFile);

    const response = await fetch('https://sdk.photoroom.com/v1/segment', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('PhotoRoom background removal failed');
    }

    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);

    return { success: true, imageUrl, blob };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PhotoRoom error:', message);
    return { success: false, error: message };
  }
}

/**
 * Client-side background removal using @imgly/background-removal
 * Works entirely in browser, no API needed
 * Larger bundle size (~50MB model download on first use)
 */
export async function removeBackgroundClientSide(imageFile: File): Promise<RemoveBgResponse> {
  try {
    // Dynamic import to reduce initial bundle size
    const { removeBackground: removeBg } = await import('@imgly/background-removal');

    const config = {
      debug: false,
      progress: (key: string, current: number, total: number) => {
        console.log(`Background removal: ${key} ${Math.round((current / total) * 100)}%`);
      },
    };

    const blob = await removeBg(imageFile, config);
    const imageUrl = URL.createObjectURL(blob);

    return { success: true, imageUrl, blob };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Client-side bg removal error:', message);
    return { success: false, error: message };
  }
}

/**
 * Smart background removal - tries API first, falls back to client-side
 */
export async function smartRemoveBackground(imageFile: File): Promise<RemoveBgResponse> {
  // Try API first (faster, better quality)
  const apiResult = await removeBackground(imageFile);
  
  if (apiResult.success) {
    return apiResult;
  }

  // Fallback to client-side
  console.log('Falling back to client-side background removal');
  return removeBackgroundClientSide(imageFile);
}

/**
 * Convert blob to File object
 */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}

/**
 * Download processed image
 */
export function downloadImage(imageUrl: string, filename: string = 'no-background.png') {
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

