import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSourceAssetUrl } from '@/lib/previews/asset-url';
import { getAuthUserId, getSession } from '@/lib/telegram/auth';

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

    // Fetch generation
    const { data: generation, error: fetchError } = await supabase
      .from('generations')
      .select('id, user_id, type, status, asset_url, result_url, result_urls, thumbnail_url, preview_path, poster_path, output, result, data')
      .eq('id', generationId)
      .single();

    if (fetchError || !generation) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    // Verify ownership
    if (generation.user_id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let storagePath: string | null = null;
    const bucket = 'generations';
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
      // Try to get asset from storage path or use external URL
      const assetUrl = getSourceAssetUrl(generation);
      
      if (!assetUrl) {
        return NextResponse.json(
          { error: 'Asset URL not found' },
          { status: 404 }
        );
      }

      // Check if it's a Supabase Storage URL
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      if (assetUrl.includes(supabaseUrl) && assetUrl.includes('/storage/v1/object/')) {
        // Extract storage path from URL
        const match = assetUrl.match(/\/storage\/v1\/object\/[^\/]+\/(.+?)(?:\?|$)/);
        if (match) {
          storagePath = decodeURIComponent(match[1]);
        }
      }

      // If not storage URL, redirect directly
      if (!storagePath) {
        directUrl = assetUrl;
        if (!proxy) {
          console.log(`[Download] Direct redirect for ${generationId}: ${assetUrl.substring(0, 60)}...`);
          return NextResponse.redirect(assetUrl);
        }
      }
    }

    // Proxy mode or force download: stream file bytes from server
    if (proxy || forceDownload) {
      // Resolve final URL (signed for storage, or direct external URL).
      let finalUrl: string | null = null;
      if (directUrl) {
        finalUrl = directUrl;
      } else if (storagePath) {
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

      const upstream = await fetch(finalUrl);
      if (!upstream.ok) {
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
    console.error('[Download] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

