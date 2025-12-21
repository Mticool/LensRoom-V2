import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST /api/previews/requeue
 * 
 * INSTANT PREVIEWS VERSION
 * 
 * Requeue previews for recent generations
 * Used for debugging, manual recovery, and backfill
 * 
 * Query params:
 *   - generationId: Specific generation to requeue (optional)
 *   - minutes: Number of minutes to look back (default: 60)
 *   - limit: Max generations to requeue (default: 50)
 *   - force: Force requeue even if preview_status=ready (default: false)
 * 
 * Examples:
 *   POST /api/previews/requeue?generationId=abc123
 *   POST /api/previews/requeue?minutes=30&limit=20
 *   POST /api/previews/requeue?minutes=60&force=true
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const generationId = searchParams.get('generationId');
    const minutes = parseInt(searchParams.get('minutes') || '60', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const force = searchParams.get('force') === 'true';

    const supabase = getSupabaseAdmin();

    // Single generation requeue
    if (generationId) {
      console.log(`[Requeue] Single generation: ${generationId}`);
      
      const { data: gen, error: fetchError } = await supabase
        .from('generations')
        .select('id, type, status, preview_status, original_path, asset_url')
        .eq('id', generationId)
        .single();

      if (fetchError || !gen) {
        return NextResponse.json(
          { error: 'Generation not found' },
          { status: 404 }
        );
      }

      // Reset preview status
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          preview_status: 'none',
          preview_path: force ? null : gen.preview_path,
          poster_path: force ? null : gen.poster_path,
          updated_at: new Date().toISOString(),
        })
        .eq('id', generationId);

      if (updateError) {
        console.error('[Requeue] Update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update generation' },
          { status: 500 }
        );
      }

      console.log(`[Requeue] ✅ Reset ${generationId} preview_status to 'none'`);

      return NextResponse.json({
        success: true,
        message: `Requeued generation ${generationId}`,
        generation: {
          id: gen.id,
          type: gen.type,
          status: gen.status,
          hasSource: !!(gen.original_path || gen.asset_url),
        },
      });
    }

    // Batch requeue for recent generations
    if (minutes <= 0 || minutes > 1440) {
      return NextResponse.json(
        { error: 'Invalid minutes parameter (must be 1-1440)' },
        { status: 400 }
      );
    }

    if (limit <= 0 || limit > 200) {
      return NextResponse.json(
        { error: 'Invalid limit parameter (must be 1-200)' },
        { status: 400 }
      );
    }

    // Calculate cutoff time
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - minutes);

    console.log(`[Requeue] Looking for generations after ${cutoffTime.toISOString()}`);

    // Find recent terminal generations
    let query = supabase
      .from('generations')
      .select('id, type, status, preview_status, preview_path, poster_path, original_path, asset_url, created_at')
      .in('status', ['success', 'completed', 'succeeded'])
      .gte('created_at', cutoffTime.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by preview status unless force=true
    if (!force) {
      query = query.or('preview_status.is.null,preview_status.in.(none,failed)');
    }

    const { data: generations, error: fetchError } = await query;

    if (fetchError) {
      console.error('[Requeue] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      );
    }

    const totalFound = (generations || []).length;
    console.log(`[Requeue] Found ${totalFound} generations`);

    if (totalFound === 0) {
      return NextResponse.json({
        success: true,
        message: 'No generations need requeueing',
        stats: { found: 0, requeued: 0, errors: 0 },
      });
    }

    // Filter for generations that actually need work
    const needsWork = (generations || []).filter((gen: any) => {
      const isPhoto = String(gen.type || '').toLowerCase() === 'photo';
      const isVideo = String(gen.type || '').toLowerCase() === 'video';
      const hasSource = !!(gen.original_path || gen.asset_url);

      if (!hasSource) return false; // Can't generate preview without source

      if (force) return true;

      if (isPhoto && !gen.preview_path) return true;
      if (isVideo && !gen.poster_path) return true;

      return false;
    });

    console.log(`[Requeue] ${needsWork.length} actually need preview/poster`);

    const results = {
      found: totalFound,
      needsWork: needsWork.length,
      requeued: 0,
      errors: 0,
      details: [] as any[],
    };

    // Reset preview_status to 'none' for all that need work
    for (const gen of needsWork) {
      try {
        const updateData: any = {
          preview_status: 'none',
          updated_at: new Date().toISOString(),
        };

        // If force, also clear paths
        if (force) {
          const isPhoto = String(gen.type || '').toLowerCase() === 'photo';
          if (isPhoto) {
            updateData.preview_path = null;
          } else {
            updateData.poster_path = null;
          }
        }

        const { error } = await supabase
          .from('generations')
          .update(updateData)
          .eq('id', gen.id);

        if (error) throw error;

        results.requeued++;
        results.details.push({
          id: gen.id,
          type: gen.type,
          status: 'requeued',
        });

        console.log(`[Requeue] ✅ Requeued ${gen.id}`);
      } catch (error) {
        results.errors++;
        results.details.push({
          id: gen.id,
          type: gen.type,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        console.error(`[Requeue] ❌ Failed ${gen.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Requeued ${results.requeued} previews`,
      stats: {
        found: results.found,
        needsWork: results.needsWork,
        requeued: results.requeued,
        errors: results.errors,
      },
      details: results.details.slice(0, 50), // Limit details in response
    });
  } catch (error) {
    console.error('[Requeue] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/previews/requeue
 * Health check and usage info
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/previews/requeue',
    method: 'POST',
    description: 'Requeue previews for recent generations (INSTANT PREVIEWS)',
    parameters: {
      generationId: 'Specific generation ID to requeue (optional)',
      minutes: 'Number of minutes to look back (1-1440, default: 60)',
      limit: 'Max generations to requeue (1-200, default: 50)',
      force: 'Force requeue even if preview_status=ready (default: false)',
    },
    examples: [
      'POST /api/previews/requeue?generationId=abc123',
      'POST /api/previews/requeue?minutes=30',
      'POST /api/previews/requeue?minutes=60&limit=100',
      'POST /api/previews/requeue?minutes=10&force=true',
    ],
  });
}
