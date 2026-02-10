#!/usr/bin/env node
/**
 * INSTANT PREVIEWS WORKER
 * 
 * Background Worker for Preview/Poster Generation
 * 
 * Key changes from old version:
 * - Uses original_path OR original_url as source (not just asset_url)
 * - Correct selection: status in ('success','completed') + preview_status in (null,'none','failed')
 * - Must have source: original_path IS NOT NULL OR asset_url IS NOT NULL
 * - Interval: 5-15 seconds, concurrency: 2
 * - Clear logging: "with asset > 0" when there's work
 * 
 * Environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for DB access
 *   PREVIEWS_WORKER_ENABLED - Enable/disable worker (default: true)
 *   PREVIEWS_WORKER_INTERVAL_MS - Interval in milliseconds (default: 10000)
 *   PREVIEWS_WORKER_ONESHOT - Run once and exit (default: false)
 *   PREVIEWS_WORKER_CONCURRENCY - Max parallel tasks (default: 2)
 *   PREVIEWS_WORKER_DEBUG - Enable debug logging (default: false)
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment from .env.local if exists
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  });
}

// Configuration
const ENABLED = process.env.PREVIEWS_WORKER_ENABLED !== 'false';
const INTERVAL_MS = parseInt(process.env.PREVIEWS_WORKER_INTERVAL_MS || '10000', 10);
const ONESHOT = process.env.PREVIEWS_WORKER_ONESHOT === '1' || process.env.PREVIEWS_WORKER_ONESHOT === 'true';
const CONCURRENCY = parseInt(process.env.PREVIEWS_WORKER_CONCURRENCY || '2', 10);
const DEBUG = process.env.PREVIEWS_WORKER_DEBUG === '1' || process.env.PREVIEWS_WORKER_DEBUG === 'true';
const PROCESS_SECRET = (
  process.env.PREVIEWS_PROCESS_SECRET ||
  process.env.PREVIEWS_REQUEUE_SECRET ||
  process.env.KIE_MANUAL_SYNC_SECRET ||
  process.env.KIE_CALLBACK_SECRET ||
  ''
).trim();

// Validate environment - REQUIRE service role key
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ENABLED) {
  console.log('[PreviewWorker] Worker is disabled (PREVIEWS_WORKER_ENABLED=false)');
  process.exit(0);
}

if (!SUPABASE_URL) {
  console.error('[PreviewWorker] ❌ FATAL: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  process.exit(1);
}

if (!SUPABASE_KEY) {
  console.error('[PreviewWorker] ❌ FATAL: Missing SUPABASE_SERVICE_ROLE_KEY');
  console.error('[PreviewWorker]    Worker REQUIRES service role key for database access.');
  console.error('[PreviewWorker]    Set SUPABASE_SERVICE_ROLE_KEY in your environment.');
  process.exit(1);
}

if (!PROCESS_SECRET) {
  console.error('[PreviewWorker] ❌ FATAL: Missing PREVIEWS_PROCESS_SECRET (or PREVIEWS_REQUEUE_SECRET / KIE_* secret)');
  console.error('[PreviewWorker]    /api/previews/process is protected; worker must send the secret to trigger processing.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Track in-progress generations to avoid duplicates
const inProgress = new Set();
let currentlyProcessing = 0;
let lastCleanupTime = 0;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Run cleanup every 5 minutes

/**
 * Clean up zombie generations (stuck in queued/generating without task_id)
 * Runs every 5 minutes to mark old stuck generations as failed
 */
async function cleanupZombieGenerations() {
  const now = Date.now();
  if (now - lastCleanupTime < CLEANUP_INTERVAL_MS) {
    return; // Not time yet
  }
  lastCleanupTime = now;

  try {
    // Find generations older than 1 hour that are stuck in queued/generating without task_id
    const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
    
    const { data: zombies, error: findError } = await supabase
      .from('generations')
      .select('id, status, created_at')
      .in('status', ['queued', 'generating'])
      .is('task_id', null)
      .lt('created_at', oneHourAgo)
      .limit(50);

    if (findError) {
      console.error('[PreviewWorker] ⚠️  Cleanup query error:', findError.message);
      return;
    }

    if (!zombies || zombies.length === 0) {
      if (DEBUG) {
        console.log('[PreviewWorker] 🧹 Cleanup: no zombie generations found');
      }
      return;
    }

    console.log(`[PreviewWorker] 🧹 Cleanup: found ${zombies.length} zombie generations (no task_id, >1hr old)`);

    // Mark them as failed
    const { error: updateError } = await supabase
      .from('generations')
      .update({
        status: 'failed',
        error: 'Task creation failed (no task_id) - auto-cleaned',
        updated_at: new Date().toISOString(),
      })
      .in('id', zombies.map(z => z.id));

    if (updateError) {
      console.error('[PreviewWorker] ⚠️  Cleanup update error:', updateError.message);
    } else {
      console.log(`[PreviewWorker] 🧹 Cleanup: marked ${zombies.length} zombie generations as failed`);
    }

    // Also fix stuck preview_status='processing' older than 10 minutes
    const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString();
    
    const { data: stuckProcessing, error: stuckError } = await supabase
      .from('generations')
      .select('id')
      .eq('preview_status', 'processing')
      .lt('updated_at', tenMinutesAgo)
      .limit(50);

    if (!stuckError && stuckProcessing && stuckProcessing.length > 0) {
      const { error: resetError } = await supabase
        .from('generations')
        .update({
          preview_status: 'none',
          updated_at: new Date().toISOString(),
        })
        .in('id', stuckProcessing.map(s => s.id));

      if (!resetError) {
        console.log(`[PreviewWorker] 🧹 Cleanup: reset ${stuckProcessing.length} stuck processing previews`);
      }
    }

  } catch (error) {
    console.error('[PreviewWorker] ⚠️  Cleanup error:', error);
  }
}

/**
 * Extract storage path from Supabase URL
 * https://<project>.supabase.co/storage/v1/object/public/generations/<path>
 */
function extractStoragePath(url) {
  if (!url) return null;
  const match = url.match(/\/storage\/v1\/object\/public\/generations\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Get source URL for a generation (priority fallback)
 * Returns: { url: string | null, source: string }
 */
function getSourceUrl(gen) {
  // Priority 1: original_path -> create signed URL or public URL
  if (gen.original_path) {
    // Return the path, we'll sign it when needed
    return { 
      path: gen.original_path, 
      url: `${SUPABASE_URL}/storage/v1/object/public/generations/${gen.original_path}`,
      source: 'original_path' 
    };
  }

  // Priority 2: asset_url
  if (gen.asset_url) {
    return { path: extractStoragePath(gen.asset_url), url: gen.asset_url, source: 'asset_url' };
  }

  // Priority 3: result_url
  if (gen.result_url) {
    return { path: extractStoragePath(gen.result_url), url: gen.result_url, source: 'result_url' };
  }

  // Priority 4: result_urls[0]
  if (gen.result_urls) {
    let urls = gen.result_urls;
    if (typeof urls === 'string') {
      try {
        urls = JSON.parse(urls);
      } catch {
        return { path: null, url: urls, source: 'result_urls(string)' };
      }
    }
    if (Array.isArray(urls) && urls.length > 0 && typeof urls[0] === 'string') {
      return { path: extractStoragePath(urls[0]), url: urls[0], source: 'result_urls[0]' };
    }
  }

  // Priority 5: thumbnail_url
  if (gen.thumbnail_url) {
    return { path: extractStoragePath(gen.thumbnail_url), url: gen.thumbnail_url, source: 'thumbnail_url' };
  }

  return { path: null, url: null, source: 'none' };
}

/**
 * Find generations that need previews/posters
 * 
 * Selection criteria (CORRECTED):
 * 1. Terminal status: 'success', 'completed'
 * 2. Preview status: NULL OR 'none' OR 'failed' (needs work)
 * 3. Has source: original_path IS NOT NULL OR asset_url IS NOT NULL
 * 4. Missing preview: photo→preview_path NULL, video→poster_path NULL
 */
async function findGenerationsNeedingPreviews() {
  try {
    // Query generations that actually need work (avoid scanning only the newest N rows).
    // We keep the query conservative (terminal status + missing preview/poster + preview_status none/failed/null).
    const { data: generations, error } = await supabase
      .from('generations')
      .select('id, user_id, type, status, original_path, asset_url, result_url, result_urls, thumbnail_url, preview_path, poster_path, preview_status, task_id, created_at')
      .in('status', ['success', 'completed', 'succeeded'])
      .or('preview_status.is.null,preview_status.in.(none,failed)')
      .or('and(type.eq.photo,preview_path.is.null),and(type.eq.video,poster_path.is.null)')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('[PreviewWorker] ❌ Failed to fetch generations:', error.message);
      return [];
    }

    const totalTerminal = (generations || []).length;

    // Filter for generations needing previews
    const needsPreview = (generations || []).filter(gen => {
      const isPhoto = String(gen.type || '').toLowerCase() === 'photo';
      const isVideo = String(gen.type || '').toLowerCase() === 'video';
      
      // Check preview_status: NULL, 'none', or 'failed' means needs work
      const previewStatus = gen.preview_status;
      const needsWork = !previewStatus || previewStatus === 'none' || previewStatus === 'failed';
      
      if (!needsWork) {
        return false; // Skip if already 'ready' or 'processing'
      }

      // Photo needs preview_path
      if (isPhoto && !gen.preview_path) {
        return true;
      }
      
      // Video needs poster_path
      if (isVideo && !gen.poster_path) {
        return true;
      }
      
      return false;
    });

    const totalNeedsPreview = needsPreview.length;

    // Check which have valid source URLs
    const withAsset = [];
    const missingAsset = [];

    for (const gen of needsPreview) {
      const source = getSourceUrl(gen);
      if (source.url) {
        withAsset.push({ ...gen, _sourceUrl: source.url, _sourceField: source.source });
      } else {
        missingAsset.push(gen);
      }
    }

    // Filter out in-progress
    const available = withAsset.filter(gen => !inProgress.has(gen.id));

    // Logging (always show when there's work, or in debug mode)
    if (available.length > 0 || DEBUG) {
      console.log(`[PreviewWorker] 📊 Selection stats:`);
      console.log(`   Terminal generations (success/completed): ${totalTerminal}`);
      console.log(`   → Needing preview (status=none/failed/null): ${totalNeedsPreview}`);
      console.log(`   → With asset URL: ${withAsset.length}`);
      console.log(`   → Missing asset URL: ${missingAsset.length}`);
      console.log(`   → Available (not in-progress): ${available.length}`);
    }

    // Take first 20 for processing
    return available.slice(0, 20);
    
  } catch (error) {
    console.error('[PreviewWorker] ❌ Unexpected error in findGenerationsNeedingPreviews:', error);
    return [];
  }
}

/**
 * Generate preview for a single generation
 */
async function generatePreview(generation) {
  const { id, user_id, type, task_id, _sourceUrl, _sourceField } = generation;
  
  // Mark as in-progress in memory
  inProgress.add(id);
  currentlyProcessing++;
  
  try {
    console.log(`[PreviewWorker] 📸 Processing ${type} preview for ${id} (source: ${_sourceField})`);
    
    // Trigger preview generation via dedicated endpoint (works for ALL providers).
    const processUrl = `http://127.0.0.1:3002/api/previews/process?generationId=${encodeURIComponent(id)}`;
    
    try {
      const response = await fetch(processUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-secret': PROCESS_SECRET,
          'authorization': `Bearer ${PROCESS_SECRET}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Process endpoint returned ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success || result.ok) {
        console.log(`[PreviewWorker] ✅ Preview processed for ${id}`);
        return { success: true, id };
      } else {
        throw new Error(result.error || 'Process failed');
      }
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
      throw new Error(`Process call failed: ${message}`);
    }
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[PreviewWorker] ❌ Failed to generate preview for ${id}:`, message);
    
    // Mark as failed in DB
    try {
      await supabase
        .from('generations')
        .update({
          preview_status: 'failed',
          error: message.substring(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    } catch (dbError) {
      console.error(`[PreviewWorker] ⚠️  Failed to update status for ${id}:`, dbError);
    }
    
    return { success: false, id, error: message };
  } finally {
    inProgress.delete(id);
    currentlyProcessing--;
  }
}

/**
 * Process generations with limited concurrency
 */
async function processBatch(generations) {
  const results = {
    total: generations.length,
    success: 0,
    failed: 0,
    skipped: 0,
  };

  // Process with limited concurrency
  const promises = [];
  
  for (let i = 0; i < generations.length; i++) {
    // Wait if at max concurrency
    while (currentlyProcessing >= CONCURRENCY) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const gen = generations[i];
    const promise = generatePreview(gen).then(result => {
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
      }
    });
    promises.push(promise);
  }
  
  // Wait for all to complete
  await Promise.all(promises);

  return results;
}

/**
 * Main worker loop
 */
async function runWorkerCycle() {
  try {
    // Run cleanup periodically (every 5 minutes)
    await cleanupZombieGenerations();

    const generations = await findGenerationsNeedingPreviews();
    
    if (generations.length === 0) {
      // Only log "caught up" if in oneshot mode or debug
      if (ONESHOT || DEBUG) {
        console.log('[PreviewWorker] ⏳ No generations need previews (all caught up!)');
      }
      return;
    }

    console.log(`[PreviewWorker] 📋 Found ${generations.length} generations with asset needing previews`);
    
    const results = await processBatch(generations);
    
    console.log(`[PreviewWorker] 📊 Batch complete: ${results.success} ✅ / ${results.failed} ❌`);
    
  } catch (error) {
    console.error('[PreviewWorker] ❌ Worker cycle error:', error);
  }
}

/**
 * Start worker
 */
async function main() {
  console.log('[PreviewWorker] 🚀 Starting INSTANT PREVIEWS worker...');
  console.log(`[PreviewWorker]    Supabase URL: ${SUPABASE_URL}`);
  console.log(`[PreviewWorker]    Service Role Key: ${SUPABASE_KEY ? '✅ present' : '❌ MISSING'}`);
  console.log(`[PreviewWorker]    Interval: ${INTERVAL_MS}ms`);
  console.log(`[PreviewWorker]    Concurrency: ${CONCURRENCY}`);
  console.log(`[PreviewWorker]    Debug mode: ${DEBUG}`);
  console.log(`[PreviewWorker]    One-shot: ${ONESHOT}`);
  console.log('');

  if (ONESHOT) {
    console.log('[PreviewWorker] Running in ONE-SHOT mode (single cycle)...\n');
    await runWorkerCycle();
    console.log('\n[PreviewWorker] ✅ One-shot complete. Exiting.');
    process.exit(0);
  }

  // Continuous mode
  console.log('[PreviewWorker] Running in CONTINUOUS mode...\n');
  
  // Run first cycle immediately
  await runWorkerCycle();
  
  // Then run on interval
  setInterval(async () => {
    await runWorkerCycle();
  }, INTERVAL_MS);
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n[PreviewWorker] 🛑 Shutting down gracefully...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n[PreviewWorker] 🛑 Shutting down gracefully...');
    process.exit(0);
  });
  
  console.log('[PreviewWorker] ✅ Worker started. Press Ctrl+C to stop.\n');
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[PreviewWorker] ❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('[PreviewWorker] ❌ Unhandled rejection:', error);
  process.exit(1);
});

// Run
main().catch(err => {
  console.error('[PreviewWorker] ❌ Fatal error:', err);
  process.exit(1);
});
