import { NextRequest, NextResponse } from "next/server";
import { getSession, getAuthUserId } from "@/lib/telegram/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/library
 * 
 * Service-role API for Library - INSTANT PREVIEWS VERSION
 * 
 * Key principles:
 * - Library is NEVER empty after success (show original immediately)
 * - All queries through Next.js with SUPABASE_SERVICE_ROLE_KEY
 * - Auth via Telegram session
 * - Returns generations with:
 *   - originalUrl (signed, TTL 60 min) - ALWAYS present for success
 *   - previewUrl (signed if preview_path exists, else null)
 *   - posterUrl (signed if poster_path exists, else null)
 *   - preview_status
 * - Cache-Control: no-store for instant updates
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

// URL TTL in seconds (60 minutes)
const SIGNED_URL_TTL = 3600;

/**
 * Extract storage path from Supabase public URL
 * https://<project>.supabase.co/storage/v1/object/public/generations/<path>
 * Returns: <path>
 */
function extractStoragePath(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/storage\/v1\/object\/public\/generations\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Get source path for original asset with priority:
 * 1. original_path (storage path)
 * 2. Extract from asset_url
 * 3. Extract from result_urls[0]
 */
function getOriginalPath(gen: any): string | null {
  // Priority 1: explicit original_path
  if (gen.original_path) {
    return gen.original_path;
  }
  
  // Priority 2: extract from asset_url
  const fromAssetUrl = extractStoragePath(gen.asset_url);
  if (fromAssetUrl) {
    return fromAssetUrl;
  }
  
  // Priority 3: extract from result_urls[0]
  if (gen.result_urls && Array.isArray(gen.result_urls) && gen.result_urls[0]) {
    const fromResultUrl = extractStoragePath(gen.result_urls[0]);
    if (fromResultUrl) {
      return fromResultUrl;
    }
  }
  
  return null;
}

/**
 * Get direct URL (non-storage) for fallback
 */
function getDirectUrl(gen: any): string | null {
  if (gen.asset_url && !gen.asset_url.includes('/storage/v1/')) {
    return gen.asset_url;
  }
  if (gen.result_url) {
    return gen.result_url;
  }
  if (gen.result_urls && Array.isArray(gen.result_urls) && gen.result_urls[0]) {
    const first = gen.result_urls[0];
    if (!first.includes('/storage/v1/')) {
      return first;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Check Telegram auth session
    const telegramSession = await getSession();
    
    if (!telegramSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get auth.users.id from Telegram session
    const userId = await getAuthUserId(telegramSession);
    
    if (!userId) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    // 3. Create service role Supabase client
    const supabase = getSupabaseAdmin();

    // 4. Parse query params
    const { searchParams } = new URL(request.url);
    const limitRaw = parseInt(searchParams.get("limit") || "50");
    const offsetRaw = parseInt(searchParams.get("offset") || "0");
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

    // 5. Query generations for current user
    // Include ALL success generations (Library is never empty!)
    // Exclude failed generations - they should not appear in Library
    const { data: generations, error } = await supabase
      .from("generations")
      .select(
        "id, user_id, type, status, created_at, updated_at, " +
        "original_path, preview_path, poster_path, preview_status, " +
        "asset_url, result_url, result_urls, " +
        "prompt, model_name"
      )
      .eq("user_id", userId)
      .neq("status", "failed")  // Hide failed generations from Library
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[Library API] Error fetching generations:", error);
      return NextResponse.json(
        { error: "Failed to fetch generations" },
        { status: 500 }
      );
    }

    // 6. Build URLs for each generation
    const items = await Promise.all(
      (generations || []).map(async (gen: any) => {
        try {
          const isVideo = gen.type === "video";
          let originalUrl: string | null = null;
          let previewUrl: string | null = null;
          let posterUrl: string | null = null;

        // --- ORIGINAL URL (REQUIRED for success generations) ---
        // Try to get signed URL from storage path first
        const originalPath = getOriginalPath(gen);
        if (originalPath) {
          const { data: signedData, error: signError } = await supabase.storage
            .from("generations")
            .createSignedUrl(originalPath, SIGNED_URL_TTL);

          if (!signError && signedData?.signedUrl) {
            originalUrl = signedData.signedUrl;
          }
        }
        
        // Fallback to direct URL (external/KIE URLs)
        if (!originalUrl) {
          originalUrl = getDirectUrl(gen);
        }
        
        // Last resort: use public URL if asset_url exists
        if (!originalUrl && gen.asset_url) {
          originalUrl = gen.asset_url;
        }

        // --- PREVIEW URL ---
        // For photos: optimized webp preview
        // For videos: animated preview (webm loop)
        if (gen.preview_path) {
          // Use public URL for generations bucket (it's public)
          const { data } = supabase.storage
            .from("generations")
            .getPublicUrl(gen.preview_path);
          
          if (data?.publicUrl) {
            previewUrl = data.publicUrl;
          }
        }

        // --- POSTER URL (for videos) ---
        if (isVideo && gen.poster_path) {
          // Use public URL for generations bucket (it's public)
          const { data } = supabase.storage
            .from("generations")
            .getPublicUrl(gen.poster_path);
          
          if (data?.publicUrl) {
            posterUrl = data.publicUrl;
          }
        }

        // Determine displayUrl for grid (preview/poster if available, else original)
        let displayUrl: string | null = null;
        if (isVideo) {
          displayUrl = previewUrl || posterUrl || null; // Video: animated preview > poster
        } else {
          displayUrl = previewUrl || originalUrl; // Photo: preview or original
        }

        // Debug logging for videos with previews
        if (isVideo && gen.preview_path) {
          console.log(`[Library API] Video preview: id=${gen.id.substring(0, 8)} preview_path=${gen.preview_path} previewUrl=${previewUrl ? 'OK' : 'NULL'} posterUrl=${posterUrl ? 'OK' : 'NULL'}`);
        }

          return {
            id: gen.id,
            user_id: gen.user_id,
            type: gen.type || 'photo',
            status: gen.status || 'queued',
            created_at: gen.created_at || new Date().toISOString(),
            updated_at: gen.updated_at || null,
            prompt: gen.prompt || null,
            model_name: gen.model_name || null,
            preview_status: gen.preview_status || "none",
            // URLs - Library is NEVER empty now!
            originalUrl,     // Always present for success
            previewUrl,      // For photos (null if not ready)
            posterUrl,       // For videos (null if not ready)
            displayUrl,      // For grid display (previewUrl/posterUrl or originalUrl)
          };
        } catch (itemError) {
          console.error('[Library API] Error processing generation:', gen?.id, itemError);
          // Return safe fallback
          return {
            id: gen?.id || '',
            user_id: gen?.user_id || userId,
            type: gen?.type || 'photo',
            status: gen?.status || 'failed',
            created_at: gen?.created_at || new Date().toISOString(),
            updated_at: gen?.updated_at || null,
            prompt: gen?.prompt || null,
            model_name: gen?.model_name || null,
            preview_status: 'none',
            originalUrl: null,
            previewUrl: null,
            posterUrl: null,
            displayUrl: null,
          };
        }
      })
    );

    // Filter out invalid items (без ID)
    const validItems = items.filter(item => item.id && item.user_id);
    
    // Log for debugging
    const successWithUrl = validItems.filter(i => i.status === "success" && i.originalUrl).length;
    const successWithoutUrl = validItems.filter(i => i.status === "success" && !i.originalUrl).length;
    const withPreview = validItems.filter(i => i.previewUrl || i.posterUrl).length;
    
    console.log(`[Library API] user=${userId} total=${validItems.length} success_with_url=${successWithUrl} success_without_url=${successWithoutUrl} with_preview=${withPreview}`);

    return NextResponse.json(
      { 
        items: validItems, 
        count: validItems.length,
        meta: {
          limit,
          offset,
          hasMore: validItems.length === limit,
        }
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (error) {
    console.error("[Library API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


