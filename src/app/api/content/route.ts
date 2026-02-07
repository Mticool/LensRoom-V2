import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// Helper to extract storage path from signed URL or direct path
function extractStoragePath(url: string): string | null {
  if (!url) return null;
  
  // Already a path (not a URL)
  if (!url.startsWith('http')) return url;
  
  // Pattern: /storage/v1/object/sign/BUCKET/PATH?token=...
  // Or: /storage/v1/object/public/BUCKET/PATH
  const signedMatch = url.match(/\/storage\/v1\/object\/(?:sign|public)\/([^?]+)/);
  if (signedMatch) {
    return signedMatch[1]; // Returns "bucket/path/to/file"
  }
  
  return null;
}

// Generate fresh signed URL for a storage path
async function getSignedUrl(supabase: ReturnType<typeof getSupabaseAdmin>, storagePath: string): Promise<string | null> {
  if (!storagePath) return null;
  
  // Split bucket and path: "generations/user-id/image/file.webp"
  const parts = storagePath.split('/');
  const bucket = parts[0];
  const path = parts.slice(1).join('/');
  
  if (!bucket || !path) return null;
  
  try {
    // Increased to 2 hours for better caching
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 7200); // 2 hours
    
    if (error || !data?.signedUrl) {
      console.warn('[Content API] Failed to sign URL:', storagePath, error?.message);
      return null;
    }
    
    return data.signedUrl;
  } catch (e) {
    console.warn('[Content API] Sign error:', storagePath, e);
    return null;
  }
}

// Batch process URLs for better performance
async function batchSignUrls(
  supabase: ReturnType<typeof getSupabaseAdmin>, 
  paths: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  // Process in batches of 10 for optimal performance
  const batchSize = 10;
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const promises = batch.map(async (path) => {
      const url = await getSignedUrl(supabase, path);
      return { path, url };
    });
    
    const batchResults = await Promise.all(promises);
    batchResults.forEach(({ path, url }) => {
      if (url) results.set(path, url);
    });
  }
  
  return results;
}

// Public endpoint - fetch published content for frontend
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const placement = searchParams.get('placement'); // 'home' | 'inspiration'
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = getSupabaseAdmin();
    
    let query = supabase
      .from('effects_gallery')
      .select('*');
    
    // Filter by status (default: published for public access)
    const status = searchParams.get('status');
    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.eq('status', 'published');
    }
    
    if (placement) {
      query = query.eq('placement', placement);
    }
    if (category) {
      query = query.eq('category', category);
    }
    
    query = query
      .order('priority', { ascending: false })
      .order('display_order', { ascending: true })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('[Content API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Optimized: Collect all paths first, then batch sign URLs
    const allPaths = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data || []).forEach((row: any) => {
      const previewPath = extractStoragePath(String(row.preview_url || row.preview_image || ''));
      const assetPath = extractStoragePath(String(row.asset_url || ''));
      const posterPath = extractStoragePath(String(row.poster_url || ''));
      
      if (previewPath) allPaths.add(previewPath);
      if (assetPath) allPaths.add(assetPath);
      if (posterPath) allPaths.add(posterPath);
    });
    
    // Batch sign all URLs at once for better performance
    const signedUrlMap = await batchSignUrls(supabase, Array.from(allPaths));
    
    // Map signed URLs back to data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refreshedData = (data || []).map((row: any) => {
      const result = { ...row };
      
      // Use pre-signed URLs from map
      const previewPath = extractStoragePath(String(row.preview_url || row.preview_image || ''));
      if (previewPath && signedUrlMap.has(previewPath)) {
        const freshUrl = signedUrlMap.get(previewPath)!;
        result.preview_url = freshUrl;
        result.preview_image = freshUrl;
      }
      
      const assetPath = extractStoragePath(String(row.asset_url || ''));
      if (assetPath && signedUrlMap.has(assetPath)) {
        result.asset_url = signedUrlMap.get(assetPath)!;
      }
      
      const posterPath = extractStoragePath(String(row.poster_url || ''));
      if (posterPath && signedUrlMap.has(posterPath)) {
        result.poster_url = signedUrlMap.get(posterPath)!;
      }
      
      return result;
    });

    console.log('[Content API] Served', refreshedData.length, 'items with fresh URLs');

    return NextResponse.json(
      { 
        effects: refreshedData,
        content: refreshedData,
        count: refreshedData.length,
      },
      {
        headers: {
          // Optimized caching: Cache for 15 minutes (URLs valid for 1 hour)
          // stale-while-revalidate allows serving stale content while refreshing in background
          'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800',
          // IMPORTANT: do not set Content-Encoding manually unless you actually compress the body.
          // Setting it to "gzip" while returning plain JSON will break clients with
          // net::ERR_CONTENT_DECODING_FAILED.
          'Vary': 'Accept-Encoding',
        },
      }
    );
  } catch (error) {
    console.error('[Content API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
