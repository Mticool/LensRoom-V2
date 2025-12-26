import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSourceAssetUrl } from '@/lib/previews/asset-url';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/generations/[id]/download?kind=original|preview|poster
 * 
 * Download generation asset with signed URL
 * 
 * Auth: Requires session (Telegram or Supabase)
 * Returns: 302 redirect to signed URL or error
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const generationId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const kind = searchParams.get('kind') || 'original';

    if (!['original', 'preview', 'poster'].includes(kind)) {
      return NextResponse.json(
        { error: 'Invalid kind parameter. Use: original, preview, or poster' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const userId = session?.user?.id;
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
        console.log(`[Download] Direct redirect for ${generationId}: ${assetUrl.substring(0, 60)}...`);
        return NextResponse.redirect(assetUrl);
      }
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

