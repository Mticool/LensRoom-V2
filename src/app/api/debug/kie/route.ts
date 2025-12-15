import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const KIE_API_KEY = process.env.KIE_API_KEY;
const KIE_MARKET_BASE_URL = process.env.KIE_MARKET_BASE_URL || 'https://api.kie.ai';

/**
 * GET /api/debug/kie?taskId=xxx
 * 
 * Debug endpoint for KIE.ai integration
 * Returns detailed info about a specific generation or recent generations
 * 
 * Usage:
 *   /api/debug/kie?taskId=task_xxx  - Specific task
 *   /api/debug/kie                  - Last 10 generations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    
    const supabase = getSupabaseAdmin();

    // If taskId provided, debug specific generation
    if (taskId) {
      console.log(`[DEBUG KIE] Checking task: ${taskId}`);

      // 1. Check DB
      const { data: generation, error: dbError } = await supabase
        .from('generations')
        .select('*')
        .eq('task_id', taskId)
        .single();

      // 2. Check KIE API
      let kieStatus = null;
      let kieError = null;

      if (KIE_API_KEY) {
        try {
          const response = await fetch(
            `${KIE_MARKET_BASE_URL}/api/v1/jobs/recordInfo?taskId=${taskId}`,
            {
              headers: { Authorization: `Bearer ${KIE_API_KEY}` },
            }
          );

          if (response.ok) {
            kieStatus = await response.json();
          } else {
            kieError = {
              status: response.status,
              statusText: response.statusText,
              body: await response.text(),
            };
          }
        } catch (e) {
          kieError = e instanceof Error ? e.message : 'Unknown error';
        }
      }

      // 3. Check Storage
      let storageFiles = [];
      if (generation?.user_id) {
        const { data: files } = await supabase
          .storage
          .from('generations')
          .list(`${generation.user_id}/${generation.kind || 'image'}`, {
            limit: 5,
            sortBy: { column: 'created_at', order: 'desc' },
          });
        
        storageFiles = files || [];
      }

      return NextResponse.json({
        taskId,
        timestamp: new Date().toISOString(),
        database: {
          found: !!generation,
          error: dbError?.message || null,
          data: generation ? {
            id: generation.id,
            status: generation.status,
            kind: generation.kind,
            model_key: generation.model_key,
            provider: generation.provider,
            asset_url: generation.asset_url,
            result_urls: generation.result_urls,
            preview_url: generation.preview_url,
            error: generation.error,
            created_at: generation.created_at,
            updated_at: generation.updated_at,
            time_elapsed: generation.updated_at 
              ? Math.round((new Date(generation.updated_at).getTime() - new Date(generation.created_at).getTime()) / 1000)
              : null,
          } : null,
        },
        kie_api: {
          configured: !!KIE_API_KEY,
          status: kieStatus,
          error: kieError,
        },
        storage: {
          bucket: 'generations',
          recent_files: storageFiles.map(f => ({
            name: f.name,
            size: f.metadata?.size,
            created_at: f.created_at,
          })),
        },
        diagnosis: diagnose(generation, kieStatus),
      });
    }

    // No taskId - show recent generations
    const { data: recentGenerations, error: listError } = await supabase
      .from('generations')
      .select('id, task_id, status, kind, model_key, provider, asset_url, error, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (listError) {
      throw listError;
    }

    // Stats
    const stats = {
      total: recentGenerations?.length || 0,
      by_status: {} as Record<string, number>,
      by_provider: {} as Record<string, number>,
      by_kind: {} as Record<string, number>,
    };

    recentGenerations?.forEach(gen => {
      stats.by_status[gen.status] = (stats.by_status[gen.status] || 0) + 1;
      if (gen.provider) stats.by_provider[gen.provider] = (stats.by_provider[gen.provider] || 0) + 1;
      if (gen.kind) stats.by_kind[gen.kind] = (stats.by_kind[gen.kind] || 0) + 1;
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      summary: stats,
      recent_generations: recentGenerations?.map(gen => ({
        ...gen,
        has_asset_url: !!gen.asset_url,
        time_since_created: Math.round((Date.now() - new Date(gen.created_at).getTime()) / 1000),
      })),
      help: {
        usage: '/api/debug/kie?taskId=xxx',
        fields: {
          status: 'queued | generating | success | failed',
          asset_url: 'Permanent Supabase Storage URL',
          result_urls: 'Original KIE URLs (may expire)',
        },
      },
    });

  } catch (error) {
    console.error('[DEBUG KIE] Error:', error);
    return NextResponse.json(
      { 
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}

// ===== DIAGNOSIS =====

function diagnose(dbRecord: any, kieStatus: any): string[] {
  const issues: string[] = [];

  if (!dbRecord) {
    issues.push('❌ Generation not found in database');
    return issues;
  }

  // Check status
  if (dbRecord.status === 'generating' || dbRecord.status === 'queued') {
    const elapsed = Date.now() - new Date(dbRecord.created_at).getTime();
    if (elapsed > 600000) { // 10 minutes
      issues.push('⚠️ Stuck in generating for >10 minutes - likely failed');
      issues.push('→ Run: curl "https://lensroom.ru/api/kie/sync?taskId=' + dbRecord.task_id + '"');
    } else {
      issues.push('ℹ️ Still generating (elapsed: ' + Math.round(elapsed / 1000) + 's)');
    }
  }

  // Check success without asset_url
  if (dbRecord.status === 'success') {
    if (!dbRecord.asset_url) {
      issues.push('⚠️ Success but no asset_url - callback/sync didn\'t upload to Storage');
      issues.push('→ Run sync to fix: curl "https://lensroom.ru/api/kie/sync?taskId=' + dbRecord.task_id + '"');
    } else {
      issues.push('✅ Success with asset_url - should work in UI');
    }

    if (!dbRecord.result_urls || (Array.isArray(dbRecord.result_urls) && dbRecord.result_urls.length === 0)) {
      issues.push('⚠️ No result_urls from KIE');
    }
  }

  // Check failed
  if (dbRecord.status === 'failed') {
    issues.push('❌ Generation failed: ' + (dbRecord.error || 'Unknown error'));
    
    if (kieStatus?.data?.failMsg) {
      issues.push('→ KIE error: ' + kieStatus.data.failMsg);
      issues.push('→ KIE code: ' + kieStatus.data.failCode);
    }
  }

  // Check KIE API status
  if (kieStatus) {
    const state = kieStatus.data?.state;
    if (state === 'success' && dbRecord.status !== 'success') {
      issues.push('⚠️ KIE says success but DB says ' + dbRecord.status);
      issues.push('→ Callback/sync didn\'t update DB properly');
    }

    if (state === 'fail' && dbRecord.status !== 'failed') {
      issues.push('⚠️ KIE says fail but DB says ' + dbRecord.status);
      issues.push('→ Callback/sync didn\'t update DB properly');
    }
  }

  // Check timestamps
  const created = new Date(dbRecord.created_at);
  const updated = dbRecord.updated_at ? new Date(dbRecord.updated_at) : null;
  
  if (!updated || updated.getTime() === created.getTime()) {
    if (dbRecord.status !== 'queued' && dbRecord.status !== 'generating') {
      issues.push('⚠️ Status changed but updated_at not set');
    }
  }

  if (issues.length === 0) {
    issues.push('✅ No issues detected');
  }

  return issues;
}
