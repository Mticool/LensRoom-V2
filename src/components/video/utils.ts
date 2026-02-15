export function extractVideoUrl(gen: any): string | null {
  if (!gen) return null;

  const status = String(gen.status || '').toLowerCase();
  const isDone = status === 'success' || status === 'completed';
  const id = gen.id ? String(gen.id) : '';

  const candidates = [
    gen.asset_url,
    gen.result_url,
    gen.result_urls,
    gen.preview_url,
    gen.thumbnail_url,
  ].filter(Boolean);

  const hasExpirableUrl = candidates.some((url) => {
    if (typeof url !== 'string') return false;
    // tempfile.aiquickdraw.com URLs expire; Supabase signed URLs expire too.
    // LaoZhang /v1/videos/:id/content returns a URL that is valid for ~24h.
    return (
      url.includes('tempfile.aiquickdraw.com') ||
      url.includes('/storage/v1/object/sign/') ||
      url.includes('laozhang.ai')
    );
  });

  // Prefer our stable download proxy for expirable URLs when possible.
  // For video playback always prefer same-origin proxy URL for completed generations.
  // This avoids expired/provider-protected links and normalizes browser behavior.
  if (isDone && id) {
    return `/api/generations/${encodeURIComponent(id)}/download?kind=original&proxy=1`;
  }

  if (gen.asset_url && typeof gen.asset_url === 'string') return gen.asset_url;
  if (gen.result_url && typeof gen.result_url === 'string') return gen.result_url;

  if (gen.result_urls) {
    if (Array.isArray(gen.result_urls) && gen.result_urls.length > 0) {
      const first = gen.result_urls[0];
      if (typeof first === 'string') return first;
    }
    if (typeof gen.result_urls === 'string') {
      try {
        const parsed = JSON.parse(gen.result_urls);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
          return parsed[0];
        }
      } catch {
        return gen.result_urls;
      }
    }
  }

  if (gen.preview_url && typeof gen.preview_url === 'string') return gen.preview_url;
  if (gen.thumbnail_url && typeof gen.thumbnail_url === 'string') return gen.thumbnail_url;

  if (id && isDone) {
    return `/api/generations/${encodeURIComponent(gen.id)}/download?kind=preview&proxy=1`;
  }

  return null;
}

/**
 * Extract poster/thumbnail URL from a generation object.
 * Prefers poster_url from API, falls back to download proxy.
 */
export function extractPosterUrl(gen: any): string | null {
  if (!gen) return null;
  if (gen.poster_url && typeof gen.poster_url === 'string') return gen.poster_url;
  // If poster_path exists but poster_url wasn't resolved — API will handle it
  if (gen.poster_path) return null;
  // Fallback: use our download proxy to get a preview frame
  const id = gen.id ? String(gen.id) : '';
  if (id) return `/api/generations/${encodeURIComponent(id)}/download?kind=preview&proxy=1`;
  return null;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
