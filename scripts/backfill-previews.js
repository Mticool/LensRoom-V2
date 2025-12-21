#!/usr/bin/env node
/**
 * Backfill script for generating missing previews/posters
 * 
 * Usage:
 *   node scripts/backfill-previews.js [--limit=100] [--concurrency=2]
 * 
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)
 */

const { createClient } = require('@supabase/supabase-js');

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue;
};

const LIMIT = parseInt(getArg('limit', '100'), 10);
const CONCURRENCY = parseInt(getArg('concurrency', '2'), 10);

// Environment validation
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Find generations that need previews
 */
async function findGenerationsNeedingPreviews() {
  console.log(`🔍 Finding generations needing previews (limit: ${LIMIT})...`);
  
  const { data, error } = await supabase
    .from('generations')
    .select('id, user_id, type, status, asset_url, preview_path, poster_path, preview_status')
    .eq('status', 'success')
    .order('created_at', { ascending: false })
    .limit(LIMIT);

  if (error) {
    throw new Error(`Failed to fetch generations: ${error.message}`);
  }

  // Filter for missing previews/posters
  const needsWork = (data || []).filter(gen => {
    const isPhoto = String(gen.type || '').toLowerCase() === 'photo';
    const isVideo = String(gen.type || '').toLowerCase() === 'video';
    const previewStatus = String(gen.preview_status || 'none');
    
    // Skip if already ready
    if (previewStatus === 'ready') {
      return false;
    }
    
    // Skip if already processing (unless it's been stuck)
    if (previewStatus === 'processing') {
      // Could add timestamp check here if needed
      return false;
    }
    
    // Skip if no asset
    if (!gen.asset_url) {
      return false;
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

  return needsWork;
}

/**
 * Trigger preview generation via sync endpoint
 */
async function triggerPreviewGeneration(generation) {
  const { id, type, user_id, asset_url } = generation;
  
  console.log(`  📸 Queuing ${type} preview for ${id}...`);
  
  try {
    // Import the preview module directly (if running in Next.js context)
    // For production, this should call an API endpoint instead
    
    // Option 1: Call local API endpoint (preferred in production)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/kie/sync?taskId=${generation.task_id || id}`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }
    
    return { success: true, id };
  } catch (error) {
    console.error(`  ❌ Failed to queue ${id}:`, error.message);
    return { success: false, id, error: error.message };
  }
}

/**
 * Process generations with limited concurrency
 */
async function processWithConcurrency(generations, concurrency) {
  const results = {
    total: generations.length,
    success: 0,
    failed: 0,
    errors: [],
  };

  console.log(`\n⚙️  Processing ${results.total} generations (concurrency: ${concurrency})...\n`);

  // Process in batches
  for (let i = 0; i < generations.length; i += concurrency) {
    const batch = generations.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(gen => triggerPreviewGeneration(gen))
    );

    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value.success) {
        results.success++;
      } else {
        results.failed++;
        const error = result.status === 'rejected' 
          ? result.reason 
          : result.value.error;
        results.errors.push({
          id: batch[idx].id,
          error: String(error),
        });
      }
    });

    // Small delay between batches to avoid overwhelming the system
    if (i + concurrency < generations.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Preview Backfill Script\n');
  console.log(`   Supabase URL: ${SUPABASE_URL}`);
  console.log(`   Limit: ${LIMIT}`);
  console.log(`   Concurrency: ${CONCURRENCY}\n`);

  try {
    // Find generations
    const generations = await findGenerationsNeedingPreviews();
    
    if (generations.length === 0) {
      console.log('✅ No generations need previews. All done!');
      return;
    }

    console.log(`📋 Found ${generations.length} generations needing previews:`);
    const photoCount = generations.filter(g => g.type === 'photo').length;
    const videoCount = generations.filter(g => g.type === 'video').length;
    console.log(`   Photos: ${photoCount}`);
    console.log(`   Videos: ${videoCount}`);

    // Process them
    const results = await processWithConcurrency(generations, CONCURRENCY);

    // Summary
    console.log('\n📊 Backfill Summary:');
    console.log(`   Total: ${results.total}`);
    console.log(`   ✅ Success: ${results.success}`);
    console.log(`   ❌ Failed: ${results.failed}`);

    if (results.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      results.errors.slice(0, 10).forEach(err => {
        console.log(`   ${err.id}: ${err.error}`);
      });
      if (results.errors.length > 10) {
        console.log(`   ... and ${results.errors.length - 10} more`);
      }
    }

    console.log('\n✅ Backfill completed!');
    console.log('💡 Tip: Wait 30-60 seconds for previews to generate, then check Library.');
    
  } catch (error) {
    console.error('\n❌ Backfill failed:', error.message);
    process.exit(1);
  }
}

// Run
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

