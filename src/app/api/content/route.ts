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
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600); // 1 hour
    
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

    // Generate fresh signed URLs for all content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refreshedData = await Promise.all(
      (data || []).map(async (row: any) => {
        const result = { ...row };
        
        // Refresh preview_url
        const previewPath = extractStoragePath(String(row.preview_url || row.preview_image || ''));
        if (previewPath) {
          const freshUrl = await getSignedUrl(supabase, previewPath);
          if (freshUrl) {
            result.preview_url = freshUrl;
            result.preview_image = freshUrl;
          }
        }
        
        // Refresh asset_url
        const assetPath = extractStoragePath(String(row.asset_url || ''));
        if (assetPath) {
          const freshUrl = await getSignedUrl(supabase, assetPath);
          if (freshUrl) result.asset_url = freshUrl;
        }
        
        // Refresh poster_url for videos
        const posterPath = extractStoragePath(String(row.poster_url || ''));
        if (posterPath) {
          const freshUrl = await getSignedUrl(supabase, posterPath);
          if (freshUrl) result.poster_url = freshUrl;
        }
        
        return result;
      })
    );

    console.log('[Content API] Served', refreshedData.length, 'items with fresh URLs');

    return NextResponse.json(
      { 
        effects: refreshedData,
        content: refreshedData,
        count: refreshedData.length,
      },
      {
        headers: {
          // Cache for 5 minutes (URLs valid for 1 hour)
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
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

