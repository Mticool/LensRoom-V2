import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const KIE_API_KEY = process.env.KIE_API_KEY;
const KIE_MARKET_BASE_URL = process.env.KIE_MARKET_BASE_URL || 'https://api.kie.ai';

/**
 * GET /api/kie/sync?taskId=xxx
 * 
 * Fallback polling endpoint - manually syncs task status from KIE API
 * Used when callback doesn't arrive or for client-side polling
 * 
 * Does the same work as callback: fetch result, download, store, update DB
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const logPrefix = '[KIE sync]';

  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    if (!KIE_API_KEY) {
      return NextResponse.json({ error: 'KIE_API_KEY not configured' }, { status: 500 });
    }

    console.log(`${logPrefix} Syncing task: ${taskId}`);

    const supabase = getSupabaseAdmin();

    // 1. Find generation in DB
    const { data: generation, error: fetchError } = await supabase
      .from('generations')
      .select('*')
      .eq('task_id', taskId)
      .single();

    if (fetchError || !generation) {
      console.error(`${logPrefix} Generation not found:`, fetchError);
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    // If already success/failed, return current status
    if (generation.status === 'success' || generation.status === 'failed') {
      console.log(`${logPrefix} Already ${generation.status}`);
      return NextResponse.json({
        status: generation.status,
        assetUrl: generation.asset_url,
        error: generation.error,
      });
    }

    // 2. Fetch from KIE recordInfo API
    console.log(`${logPrefix} Fetching from KIE API...`);
    
    const response = await fetch(
      `${KIE_MARKET_BASE_URL}/api/v1/jobs/recordInfo?taskId=${taskId}`,
      {
        headers: { Authorization: `Bearer ${KIE_API_KEY}` },
      }
    );

    if (!response.ok) {
      console.error(`${logPrefix} KIE API error:`, response.status);
      return NextResponse.json(
        { error: 'Failed to fetch from KIE API' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (data.code !== 0) {
      console.error(`${logPrefix} KIE API returned error:`, data.message);
      return NextResponse.json({ error: data.message }, { status: 400 });
    }

    const { state, resultJson, failMsg, failCode } = data.data;

    console.log(`${logPrefix} KIE state:`, {
      state,
      hasResultJson: !!resultJson,
      failMsg,
    });

    // 3. Handle SUCCESS
    if (state === 'success') {
      // Parse results
      let resultUrls: string[] = [];
      
      if (resultJson) {
        try {
          const parsed = JSON.parse(resultJson);
          
          if (parsed.outputs && Array.isArray(parsed.outputs)) {
            resultUrls = parsed.outputs;
          } else if (parsed.resultUrls && Array.isArray(parsed.resultUrls)) {
            resultUrls = parsed.resultUrls;
          } else if (Array.isArray(parsed)) {
            resultUrls = parsed;
          } else if (typeof parsed === 'string') {
            resultUrls = [parsed];
          }
        } catch (e) {
          console.error(`${logPrefix} Failed to parse resultJson:`, e);
          resultUrls = [resultJson];
        }
      }

      if (resultUrls.length === 0) {
        console.error(`${logPrefix} No results found`);
        
        await supabase
          .from('generations')
          .update({
            status: 'failed',
            error: 'No results returned from KIE API',
            updated_at: new Date().toISOString(),
          })
          .eq('id', generation.id);
        
        return NextResponse.json({
          status: 'failed',
          error: 'No results',
        });
      }

      // Download and store
      let assetUrl: string | null = null;
      
      try {
        assetUrl = await downloadAndStore(
          supabase,
          generation.id,
          generation.user_id,
          generation.kind || 'image',
          resultUrls[0]
        );
        
        console.log(`${logPrefix} Stored asset:`, assetUrl);
      } catch (storageError) {
        console.error(`${logPrefix} Storage failed:`, storageError);
        // Fallback to original URL
        assetUrl = resultUrls[0];
      }

      // Update database
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          status: 'success',
          result_urls: resultUrls,
          asset_url: assetUrl,
          preview_url: assetUrl,
          updated_at: new Date().toISOString(),
          error: null,
        })
        .eq('id', generation.id);

      if (updateError) {
        console.error(`${logPrefix} Database update failed:`, updateError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      console.log(`${logPrefix} ✅ Synced to success in ${Date.now() - startTime}ms`);
      
      return NextResponse.json({
        status: 'success',
        assetUrl,
        resultUrls,
      });
    }

    // 4. Handle FAIL
    if (state === 'fail') {
      console.error(`${logPrefix} Task failed:`, { failCode, failMsg });

      await supabase
        .from('generations')
        .update({
          status: 'failed',
          error: failMsg || `Generation failed (code: ${failCode})`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', generation.id);

      return NextResponse.json({
        status: 'failed',
        error: failMsg || 'Generation failed',
      });
    }

    // 5. Still generating
    console.log(`${logPrefix} Still ${state}`);
    
    // Update status to generating if needed
    if (generation.status !== 'generating') {
      await supabase
        .from('generations')
        .update({
          status: 'generating',
          updated_at: new Date().toISOString(),
        })
        .eq('id', generation.id);
    }

    return NextResponse.json({
      status: 'generating',
      state,
    });

  } catch (error) {
    console.error(`${logPrefix} Unexpected error:`, error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}

// ===== HELPER: Download and Store =====

async function downloadAndStore(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  generationId: string,
  userId: string,
  kind: string,
  sourceUrl: string
): Promise<string> {
  console.log(`[KIE sync] Downloading: ${sourceUrl}`);

  const downloadResponse = await fetch(sourceUrl);
  if (!downloadResponse.ok) {
    throw new Error(`Download failed: ${downloadResponse.status}`);
  }

  const buffer = await downloadResponse.arrayBuffer();
  const blob = new Uint8Array(buffer);

  const contentType = downloadResponse.headers.get('content-type');
  let extension = kind === 'video' ? 'mp4' : 'jpg';
  
  if (contentType) {
    if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('webp')) extension = 'webp';
    else if (contentType.includes('mp4')) extension = 'mp4';
    else if (contentType.includes('webm')) extension = 'webm';
  }

  const timestamp = Date.now();
  const fileName = `${generationId}_${timestamp}.${extension}`;
  const storagePath = `${userId}/${kind}/${fileName}`;

  console.log(`[KIE sync] Uploading to: ${storagePath}`);

  const { error: uploadError } = await supabase
    .storage
    .from('generations')
    .upload(storagePath, blob, {
      contentType: contentType || (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrlData } = supabase
    .storage
    .from('generations')
    .getPublicUrl(storagePath);

  if (!publicUrlData?.publicUrl) {
    throw new Error('Failed to get public URL');
  }

  console.log(`[KIE sync] ✅ Stored: ${publicUrlData.publicUrl}`);
  return publicUrlData.publicUrl;
}
