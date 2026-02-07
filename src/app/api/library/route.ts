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

type GenerationRow = {
  id?: string;
  user_id?: string;
  type?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  prompt?: string | null;
  model_name?: string | null;
  preview_status?: string | null;
  original_path?: string | null;
  preview_path?: string | null;
  poster_path?: string | null;
  asset_url?: string | null;
  result_url?: string | null;
  result_urls?: string[] | string | null;
};

/**
 * Extract storage path from Supabase public URL
 * https://<project>.supabase.co/storage/v1/object/public/generations/<path>
 * Returns: <path>
 */
function extractStoragePath(url: string | null): string | null {
  if (!url) return null;
  // Accept both public and signed storage URLs:
  // - /storage/v1/object/public/generations/<path>
  // - /storage/v1/object/sign/generations/<path>?token=...
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/generations\/([^?]+)/);
  return match ? decodeURIComponent(match[1] || "") : null;
}

/**
 * Get source path for original asset with priority:
 * 1. original_path (storage path)
 * 2. Extract from asset_url
 * 3. Extract from result_urls[0]
 */
function getOriginalPath(gen: GenerationRow): string | null {
  // Priority 1: explicit original_path
  if (gen.original_path) {
    return gen.original_path;
  }
  
  // Priority 2: extract from asset_url
  const fromAssetUrl = extractStoragePath(gen.asset_url ?? null);
  if (fromAssetUrl) {
    return fromAssetUrl;
  }
  
  // Priority 3: extract from result_urls[0]
  if (gen.result_urls && Array.isArray(gen.result_urls) && gen.result_urls[0]) {
    const fromResultUrl = extractStoragePath(gen.result_urls[0] ?? null);
    if (fromResultUrl) {
      return fromResultUrl;
    }
  }
  
  return null;
}

/**
 * Get direct URL (non-storage) for fallback
 */
function getDirectUrl(gen: GenerationRow): string | null {
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
    // Fetch 1 extra row to compute hasMore robustly even when some cards are "broken"
    // and need safe fallbacks on the server.
    const fetchLimit = Math.min(limit + 1, 101);
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
      .range(offset, offset + fetchLimit - 1);

    if (error) {
      console.error("[Library API] Error fetching generations:", error);
      return NextResponse.json(
        { error: "Failed to fetch generations" },
        { status: 500 }
      );
    }

    const raw = Array.isArray(generations) ? generations : [];
    const rawHasMore = raw.length > limit;
    const page = raw.slice(0, limit);

    // 6. Build URLs for each generation
    const items = await Promise.all(
      page.map(async (gen: GenerationRow) => {
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

        // Final fallback: stable authenticated download endpoint (avoids "empty" success cards)
        if (!originalUrl && gen.id && String(gen.status || "").toLowerCase() === "success") {
          originalUrl = `/api/generations/${encodeURIComponent(String(gen.id))}/download?kind=original&proxy=1`;
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
          console.log(`[Library API] Video preview: id=${String(gen.id || '').substring(0, 8)} preview_path=${gen.preview_path} previewUrl=${previewUrl ? 'OK' : 'NULL'} posterUrl=${posterUrl ? 'OK' : 'NULL'}`);
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
            resultUrls: Array.isArray(gen.result_urls)
              ? gen.result_urls
              : typeof gen.result_urls === "string"
                ? (() => {
                    try {
                      const parsed = JSON.parse(gen.result_urls);
                      return Array.isArray(parsed) ? parsed : [gen.result_urls];
                    } catch {
                      return [gen.result_urls];
                    }
                  })()
                : null,
            // URLs - Library is NEVER empty now!
            originalUrl,     // Always present for success
            previewUrl,      // For photos (null if not ready)
            posterUrl,       // For videos (null if not ready)
            displayUrl,      // For grid display (previewUrl/posterUrl or originalUrl)
          };
        } catch (itemError) {
          const id = gen?.id ? String(gen.id) : "";
          console.error('[Library API] Error processing generation:', id, itemError);
          // Return safe fallback
          return {
            id,
            user_id: gen?.user_id || userId,
            type: gen?.type || 'photo',
            status: gen?.status || 'failed',
            created_at: gen?.created_at || new Date().toISOString(),
            updated_at: gen?.updated_at || null,
            prompt: gen?.prompt || null,
            model_name: gen?.model_name || null,
            preview_status: 'none',
            // Stable authenticated download endpoint to avoid empty/broken success cards.
            // Note: if the upstream object is missing, the download route will return an error,
            // but the UI will handle it without crashing.
            originalUrl: id ? `/api/generations/${encodeURIComponent(id)}/download?kind=original&proxy=1` : null,
            previewUrl: null,
            posterUrl: null,
            displayUrl: id ? `/api/generations/${encodeURIComponent(id)}/download?kind=original&proxy=1` : null,
            resultUrls: null,
          };
        }
      })
    );

    // Keep pagination stable: do not drop rows silently (only guard against missing IDs).
    const validItems = items.filter(item => item.id);
    
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
          hasMore: rawHasMore,
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
