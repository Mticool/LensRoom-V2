export function extractVideoUrl(gen: any): string | null {
  if (!gen) return null;

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

  if (gen.id && (gen.status === 'success' || gen.status === 'completed')) {
    return `/api/generations/${encodeURIComponent(gen.id)}/download?kind=preview&proxy=1`;
  }

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
