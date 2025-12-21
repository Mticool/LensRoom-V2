/**
 * Robust Asset URL Resolution
 * 
 * Priority fallback to find the source asset URL from a generation record:
 * 1. generation.asset_url
 * 2. generation.result_url
 * 3. generation.result_urls[0] (if array)
 * 4. generation.thumbnail_url
 * 5. Parse JSON columns (output/result/data) and extract first https URL
 * 
 * Used by:
 * - sync-task.ts instant preview trigger
 * - previews-worker.js selection logic
 * - download endpoint
 */

type GenerationRecord = {
  asset_url?: string | null;
  result_url?: string | null;
  result_urls?: string[] | string | null;
  thumbnail_url?: string | null;
  output?: string | object | null;
  result?: string | object | null;
  data?: string | object | null;
  [key: string]: any;
};

/**
 * Extract first HTTPS URL from a string (e.g., JSON column)
 */
function extractHttpsUrl(value: any): string | null {
  if (!value) return null;
  
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  const urlMatch = str.match(/https:\/\/[^\s"']+/);
  return urlMatch ? urlMatch[0] : null;
}

/**
 * Get source asset URL from generation with fallback priority
 * 
 * @param generation - Generation record from database
 * @returns Asset URL or null if not found
 */
export function getSourceAssetUrl(generation: GenerationRecord): string | null {
  // Priority 1: asset_url
  if (generation.asset_url && typeof generation.asset_url === 'string') {
    return generation.asset_url;
  }

  // Priority 2: result_url
  if (generation.result_url && typeof generation.result_url === 'string') {
    return generation.result_url;
  }

  // Priority 3: result_urls[0]
  if (generation.result_urls) {
    if (Array.isArray(generation.result_urls) && generation.result_urls.length > 0) {
      const first = generation.result_urls[0];
      if (typeof first === 'string') return first;
    }
    if (typeof generation.result_urls === 'string') {
      // Might be JSON string
      try {
        const parsed = JSON.parse(generation.result_urls);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
          return parsed[0];
        }
      } catch {
        // If not JSON, treat as single URL
        return generation.result_urls;
      }
    }
  }

  // Priority 4: thumbnail_url
  if (generation.thumbnail_url && typeof generation.thumbnail_url === 'string') {
    return generation.thumbnail_url;
  }

  // Priority 5: Parse JSON columns
  const jsonColumns = [generation.output, generation.result, generation.data];
  for (const col of jsonColumns) {
    const url = extractHttpsUrl(col);
    if (url) return url;
  }

  return null;
}

/**
 * Validate that URL returns actual media content (not JSON error page)
 * 
 * @param url - URL to validate
 * @returns { valid: boolean, error?: string, contentType?: string }
 */
export async function validateAssetUrl(url: string): Promise<{
  valid: boolean;
  error?: string;
  contentType?: string;
}> {
  try {
    // HEAD request to check content-type without downloading
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {
        valid: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    
    // Check if it's a JSON error response
    if (contentType.includes('application/json') || contentType.includes('text/html')) {
      return {
        valid: false,
        error: `URL returns ${contentType}, expected image/video`,
        contentType,
      };
    }

    // Valid media types
    const validTypes = ['image/', 'video/'];
    if (!validTypes.some(t => contentType.includes(t))) {
      return {
        valid: false,
        error: `Unexpected content-type: ${contentType}`,
        contentType,
      };
    }

    return {
      valid: true,
      contentType,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get source asset URL with validation
 * 
 * Useful for preview generation to ensure URL is usable
 */
export async function getValidatedAssetUrl(generation: GenerationRecord): Promise<{
  url: string | null;
  valid: boolean;
  error?: string;
}> {
  const url = getSourceAssetUrl(generation);
  
  if (!url) {
    return {
      url: null,
      valid: false,
      error: 'No asset URL found in generation record',
    };
  }

  const validation = await validateAssetUrl(url);
  
  return {
    url,
    valid: validation.valid,
    error: validation.error,
  };
}
