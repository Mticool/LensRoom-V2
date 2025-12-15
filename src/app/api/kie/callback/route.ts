import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const KIE_API_KEY = process.env.KIE_API_KEY;
const KIE_CALLBACK_SECRET = process.env.KIE_CALLBACK_SECRET;
const KIE_MARKET_BASE_URL = process.env.KIE_MARKET_BASE_URL || 'https://api.kie.ai';

if (!KIE_CALLBACK_SECRET) {
  console.warn('[KIE callback] Missing KIE_CALLBACK_SECRET - callbacks will not be secure');
}

/**
 * POST /api/kie/callback?secret=xxx
 * 
 * Webhook endpoint for KIE.ai to notify us of task completion
 * CRITICAL: This ensures results ALWAYS reach the database and UI
 * 
 * NO AUTH MIDDLEWARE - public endpoint with secret verification
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const logPrefix = '[KIE callback]';

  try {
    // 1. Verify secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (KIE_CALLBACK_SECRET && secret !== KIE_CALLBACK_SECRET) {
      console.error(`${logPrefix} Invalid secret`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse payload
    const payload = await request.json();
    const { taskId, state, resultJson, failMsg, failCode } = payload;

    console.log(`${logPrefix} Received:`, {
      taskId,
      state,
      hasResultJson: !!resultJson,
      failMsg,
      failCode,
    });

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 3. Find generation in DB
    const { data: generation, error: fetchError } = await supabase
      .from('generations')
      .select('*')
      .eq('task_id', taskId)
      .single();

    if (fetchError || !generation) {
      console.error(`${logPrefix} Generation not found for task ${taskId}:`, fetchError);
      
      // If callback comes before createTask finished, return 404 but KIE will retry
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    console.log(`${logPrefix} Found generation:`, {
      id: generation.id,
      kind: generation.kind,
      model_key: generation.model_key,
      current_status: generation.status,
    });

    // 4. Handle SUCCESS
    if (state === 'success') {
      // If callback doesn't include resultJson, fetch from recordInfo
      let resultUrls: string[] = [];
      
      if (resultJson) {
        resultUrls = parseResultJson(resultJson);
        console.log(`${logPrefix} Parsed ${resultUrls.length} URLs from callback`);
      } else {
        console.log(`${logPrefix} No resultJson in callback, fetching recordInfo...`);
        resultUrls = await fetchResultsFromRecordInfo(taskId);
        console.log(`${logPrefix} Fetched ${resultUrls.length} URLs from recordInfo`);
      }

      if (resultUrls.length === 0) {
        console.error(`${logPrefix} No results found for task ${taskId}`);
        await supabase
          .from('generations')
          .update({
            status: 'failed',
            error: 'No results returned from KIE API',
            updated_at: new Date().toISOString(),
          })
          .eq('id', generation.id);
        
        return NextResponse.json({ success: false, error: 'No results' });
      }

      // 5. Download and store in Supabase Storage
      let assetUrl: string | null = null;
      
      try {
        assetUrl = await downloadAndStore(
          supabase,
          generation.id,
          generation.user_id,
          generation.kind || 'image',
          resultUrls[0] // Use first result
        );
        
        console.log(`${logPrefix} Stored asset:`, assetUrl);
      } catch (storageError) {
        console.error(`${logPrefix} Storage failed, will use original URL:`, storageError);
        // Fallback: use original URL if storage fails
        assetUrl = resultUrls[0];
      }

      // 6. Update database with SUCCESS
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          status: 'success',
          result_urls: resultUrls,
          asset_url: assetUrl,
          preview_url: assetUrl, // For backward compatibility
          updated_at: new Date().toISOString(),
          error: null,
        })
        .eq('id', generation.id);

      if (updateError) {
        console.error(`${logPrefix} Failed to update generation:`, updateError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      console.log(`${logPrefix} ✅ SUCCESS in ${Date.now() - startTime}ms`);
      return NextResponse.json({ success: true, assetUrl });
    }

    // 7. Handle FAIL
    if (state === 'fail') {
      console.error(`${logPrefix} Task failed:`, { failCode, failMsg });

      const { error: updateError } = await supabase
        .from('generations')
        .update({
          status: 'failed',
          error: failMsg || `Generation failed (code: ${failCode})`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', generation.id);

      if (updateError) {
        console.error(`${logPrefix} Failed to update failed status:`, updateError);
      }

      console.log(`${logPrefix} ❌ FAILED in ${Date.now() - startTime}ms`);
      return NextResponse.json({ success: true, state: 'failed' });
    }

    // 8. Handle IN-PROGRESS states
    console.log(`${logPrefix} In-progress state: ${state}`);
    
    // Update to generating if still in queue
    if (state === 'waiting' || state === 'queuing' || state === 'generating') {
      await supabase
        .from('generations')
        .update({
          status: 'generating',
          updated_at: new Date().toISOString(),
        })
        .eq('id', generation.id);
    }

    return NextResponse.json({ success: true, state });

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

// ===== HELPER FUNCTIONS =====

/**
 * Parse resultJson from KIE callback
 */
function parseResultJson(resultJson: string): string[] {
  try {
    const parsed = JSON.parse(resultJson);
    
    // Handle different response formats
    if (parsed.outputs && Array.isArray(parsed.outputs)) {
      return parsed.outputs.filter((url: any) => typeof url === 'string');
    }
    
    if (parsed.resultUrls && Array.isArray(parsed.resultUrls)) {
      return parsed.resultUrls.filter((url: any) => typeof url === 'string');
    }
    
    if (Array.isArray(parsed)) {
      return parsed.filter((url: any) => typeof url === 'string');
    }
    
    if (typeof parsed === 'string') {
      return [parsed];
    }
    
    return [];
  } catch (e) {
    console.error('[KIE callback] Failed to parse resultJson:', e);
    // Treat as raw URL string
    return [resultJson];
  }
}

/**
 * Fetch results from KIE recordInfo API (fallback if callback has no resultJson)
 */
async function fetchResultsFromRecordInfo(taskId: string): Promise<string[]> {
  if (!KIE_API_KEY) {
    throw new Error('KIE_API_KEY not configured');
  }

  const response = await fetch(
    `${KIE_MARKET_BASE_URL}/api/v1/jobs/recordInfo?taskId=${taskId}`,
    {
      headers: { Authorization: `Bearer ${KIE_API_KEY}` },
    }
  );

  if (!response.ok) {
    throw new Error(`recordInfo failed: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.code !== 0 || !data.data) {
    throw new Error('Invalid recordInfo response');
  }

  // Parse resultJson from recordInfo
  if (data.data.resultJson) {
    return parseResultJson(data.data.resultJson);
  }

  return [];
}

/**
 * Download file from KIE and upload to Supabase Storage
 * Returns public URL from Storage
 */
async function downloadAndStore(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  generationId: string,
  userId: string,
  kind: string,
  sourceUrl: string
): Promise<string> {
  console.log(`[KIE callback] Downloading from: ${sourceUrl}`);

  // 1. Download file
  const downloadResponse = await fetch(sourceUrl);
  if (!downloadResponse.ok) {
    throw new Error(`Download failed: ${downloadResponse.status}`);
  }

  const buffer = await downloadResponse.arrayBuffer();
  const blob = new Uint8Array(buffer);

  console.log(`[KIE callback] Downloaded ${blob.length} bytes`);

  // 2. Determine file extension
  const contentType = downloadResponse.headers.get('content-type');
  let extension = kind === 'video' ? 'mp4' : 'jpg';
  
  if (contentType) {
    if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('webp')) extension = 'webp';
    else if (contentType.includes('mp4')) extension = 'mp4';
    else if (contentType.includes('webm')) extension = 'webm';
  }

  // 3. Generate storage path
  const timestamp = Date.now();
  const fileName = `${generationId}_${timestamp}.${extension}`;
  const storagePath = `${userId}/${kind}/${fileName}`;

  console.log(`[KIE callback] Uploading to: ${storagePath}`);

  // 4. Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('generations')
    .upload(storagePath, blob, {
      contentType: contentType || (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
      upsert: false,
    });

  if (uploadError) {
    console.error('[KIE callback] Upload failed:', uploadError);
    throw uploadError;
  }

  // 5. Get public URL
  const { data: publicUrlData } = supabase
    .storage
    .from('generations')
    .getPublicUrl(storagePath);

  if (!publicUrlData?.publicUrl) {
    throw new Error('Failed to get public URL');
  }

  console.log(`[KIE callback] ✅ Stored: ${publicUrlData.publicUrl}`);
  return publicUrlData.publicUrl;
}
