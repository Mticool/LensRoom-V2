import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSourceAssetUrl } from '@/lib/previews/asset-url';
import { getAuthUserId, getSession } from '@/lib/telegram/auth';
import { fetchWithTimeout, FetchTimeoutError } from '@/lib/api/fetch-with-timeout';
import { getModelById } from "@/config/models";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * OPTIONS /api/generations/[id]/download
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest, context: RouteContext) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}

/**
 * GET /api/generations/[id]/download?kind=original|preview|poster
 * Optional: &proxy=1 to stream bytes from our origin (avoids CORS when client needs Blob/DataURL).
 * Optional: &download=1 to force download with Content-Disposition: attachment (for mobile)
 *
 * Download generation asset with signed URL
 *
 * Auth: Requires session (Telegram or Supabase)
 * Returns:
 * - default: 302 redirect to signed URL / direct URL
 * - proxy=1 or download=1: 200 with file bytes and proper headers
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const generationId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const kind = searchParams.get('kind') || 'original';
    const proxy = searchParams.get('proxy') === '1' || searchParams.get('proxy') === 'true';
    const forceDownload = searchParams.get('download') === '1' || searchParams.get('download') === 'true';

    if (!['original', 'preview', 'poster'].includes(kind)) {
      return NextResponse.json(
        { error: 'Invalid kind parameter. Use: original, preview, or poster' },
        { status: 400 }
      );
    }

    // Get authenticated user (Telegram or Supabase).
    // NOTE: Most of the app uses Telegram auth; Supabase cookie session may be absent.
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    let userId: string | null = null;

    // Prefer Telegram session (primary auth in LensRoom).
    const telegramSession = await getSession();
    if (telegramSession) {
      userId = await getAuthUserId(telegramSession);
    }

    // Fallback to Supabase session cookie (e.g., admin panel / web auth).
    if (!userId) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      userId = session?.user?.id || null;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch generation (schema-compatible: older prod DB may not have optional columns).
    const legacyBaseFields =
      'id, user_id, type, status, asset_url, result_url, result_urls, thumbnail_url, preview_path, poster_path';
    const baseFieldsV2 = `${legacyBaseFields}, original_path`;
    const baseFieldsV3 = `${baseFieldsV2}, model_id, task_id, metadata`;
    const extraFieldsV3 = `${baseFieldsV3}, output, result, data`;

    let generation: any = null;
    let fetchError: any = null;

    const selectAttempts = [extraFieldsV3, baseFieldsV3, baseFieldsV2, legacyBaseFields];
    for (const fields of selectAttempts) {
      const r = await supabase.from('generations').select(fields).eq('id', generationId).single();
      generation = r.data;
      fetchError = r.error;
      if (!fetchError) break;
      // If schema mismatch (missing column), try the next, smaller selection.
      if (String((fetchError as any)?.code || '') === 'PGRST204') continue;
      // If the row doesn't exist or any other error, don't loop forever.
      break;
    }

    if (fetchError || !generation) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    // Verify ownership
    if (generation.user_id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let storagePath: string | null = null;
    let bucket = 'generations';
    let directUrl: string | null = null;

    // Determine which file to download based on kind
    if (kind === 'preview') {
      if (!generation.preview_path) {
        return NextResponse.json(
          { error: 'Preview not available yet' },
          { status: 404 }
        );
      }
      storagePath = generation.preview_path;
    } else if (kind === 'poster') {
      if (!generation.poster_path) {
        return NextResponse.json(
          { error: 'Poster not available yet' },
          { status: 404 }
        );
      }
      storagePath = generation.poster_path;
    } else {
      // kind === 'original'
      // Prefer explicit storage path when available (most reliable when provider URLs expire).
      if (generation.original_path && typeof generation.original_path === 'string') {
        storagePath = generation.original_path;
      }

      // Try to get asset from storage path or use external URL
      const assetUrl = storagePath ? null : getSourceAssetUrl(generation);
      
      if (!assetUrl && !storagePath) {
        return NextResponse.json(
          { error: 'Asset URL not found' },
          { status: 404 }
        );
      }

      // Check if it's a Supabase Storage URL
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      if (assetUrl && assetUrl.includes(supabaseUrl) && assetUrl.includes('/storage/v1/object/')) {
        // Extract bucket + path from URL:
        // /storage/v1/object/public/<bucket>/<path>
        // /storage/v1/object/sign/<bucket>/<path>?token=...
        const match = assetUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^\/]+)\/([^?]+)/);
        if (match) {
          bucket = decodeURIComponent(match[1] || bucket);
          storagePath = decodeURIComponent(match[2] || '');
        }
      }

      // If not storage URL, redirect directly
      if (!storagePath) {
        const direct = assetUrl as string; // assetUrl is guaranteed by earlier guard when storagePath is null
        directUrl = direct;
        if (!proxy) {
          console.log(`[Download] Direct redirect for ${generationId}: ${direct.substring(0, 60)}...`);
          return NextResponse.redirect(direct);
        }
      }
    }

    // Proxy mode or force download: stream file bytes from server
    if (proxy || forceDownload) {
      const metaProvider =
        typeof (generation as any)?.metadata === "object"
          ? String((generation as any)?.metadata?.provider || "").toLowerCase()
          : "";
      const modelId = typeof (generation as any)?.model_id === "string" ? String((generation as any).model_id) : "";
      const modelInfo = modelId ? (getModelById(modelId) as any) : null;
      const isLaoZhang = metaProvider === "laozhang" || String(modelInfo?.provider || "").toLowerCase() === "laozhang";

      // LaoZhang videos: /v1/videos/:id/content requires auth and may return raw mp4 bytes.
      // Serve it through our proxy using the server-side LAOZHANG_API_KEY.
      if (isLaoZhang && kind === "original") {
        const taskId = typeof (generation as any)?.task_id === "string" ? String((generation as any).task_id) : "";
        if (!taskId) {
          return NextResponse.json({ error: "Missing task_id for LaoZhang generation" }, { status: 404 });
        }
        const { getLaoZhangClient } = await import("@/lib/api/laozhang-client");
        const lz = getLaoZhangClient();
        const upstream = await lz.fetchVideoContent(taskId);
        if (!upstream.ok) {
          const t = await upstream.text().catch(() => "");
          console.error("[Download] LaoZhang content fetch failed:", upstream.status, t.slice(0, 200));
          return NextResponse.json({ error: "Failed to fetch upstream video" }, { status: 502 });
        }

        const contentType = upstream.headers.get("content-type") || "video/mp4";
        const disposition = forceDownload
          ? `attachment; filename="lensroom_${generationId.substring(0, 8)}_${kind}.mp4"`
          : "inline";

        // Stream bytes to the client (avoid buffering large mp4s in memory).
        return new NextResponse(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
            "Content-Disposition": disposition,
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      // Resolve final URL (signed for storage, or direct external URL).
      let finalUrl: string | null = null;
      if (directUrl) {
        finalUrl = directUrl;
      } else if (storagePath) {
        // Some callers may accidentally pass "bucket/path" as storagePath.
        // Normalize to keep `storagePath` inside `bucket`.
        if (storagePath.startsWith(`${bucket}/`)) {
          storagePath = storagePath.slice(bucket.length + 1);
        }
        const { data: signedData, error: signedError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(storagePath, 300);

        if (signedError || !signedData?.signedUrl) {
          console.error(`[Download] Failed to create signed URL:`, signedError);
          return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
        }
        finalUrl = signedData.signedUrl;
      }

      if (!finalUrl) {
        return NextResponse.json({ error: 'Asset URL not found' }, { status: 404 });
      }

      const fetchUpstream = (url: string) => fetchWithTimeout(url, { timeout: 90_000 });

      let upstream = await fetchUpstream(finalUrl);
      if (!upstream.ok) {
        console.error(`[Download] Upstream fetch failed: ${upstream.status} ${upstream.statusText}`);
        return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 502 });
      }

      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
      const arrayBuffer = await upstream.arrayBuffer();

      // Determine file extension based on content type and generation type
      let extension = 'bin';
      if (contentType.includes('video')) {
        extension = 'mp4';
      } else if (contentType.includes('image/webp')) {
        extension = 'webp';
      } else if (contentType.includes('image/png')) {
        extension = 'png';
      } else if (contentType.includes('image/jpeg') || contentType.includes('image/jpg')) {
        extension = 'jpg';
      } else if (generation.type === 'video') {
        extension = 'mp4';
      } else if (generation.type === 'photo') {
        extension = 'png';
      }

      // Generate filename
      const filename = `lensroom_${generationId.substring(0, 8)}_${kind}.${extension}`;

      // Content-Disposition: attachment forces download, inline allows browser to display
      const disposition = forceDownload ? `attachment; filename="${filename}"` : 'inline';

      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(arrayBuffer.byteLength),
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Content-Disposition': disposition,
          // Add CORS headers for cross-origin requests
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Generate signed URL for storage path
    if (!storagePath) {
      return NextResponse.json(
        { error: 'Could not determine storage path' },
        { status: 500 }
      );
    }

    console.log(`[Download] Generating signed URL for ${generationId}: ${storagePath}`);

    if (storagePath.startsWith(`${bucket}/`)) {
      storagePath = storagePath.slice(bucket.length + 1);
    }
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 300); // 5 minutes expiry

    if (signedError || !signedData?.signedUrl) {
      console.error(`[Download] Failed to create signed URL:`, signedError);
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      );
    }

    // Log success
    console.log(`[Download] Success for ${generationId} (${kind})`);

    // Redirect to signed URL
    return NextResponse.redirect(signedData.signedUrl);
  } catch (error) {
    if (error instanceof FetchTimeoutError) {
      return NextResponse.json({ error: 'Upstream timeout' }, { status: 504 });
    }
    console.error('[Download] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
