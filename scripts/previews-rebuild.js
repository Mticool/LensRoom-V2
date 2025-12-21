#!/usr/bin/env node
/**
 * PREVIEW REBUILD SCRIPT
 * 
 * Resets preview_status for all success generations and runs worker
 * until all previews are generated.
 * 
 * Usage:
 *   npm run previews:rebuild
 *   node scripts/previews-rebuild.js [--limit=100] [--dry-run]
 * 
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

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

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue;
};
const hasFlag = (name) => args.includes(`--${name}`);

const LIMIT = parseInt(getArg('limit', '100'), 10);
const DRY_RUN = hasFlag('dry-run');
const RUN_WORKER = !hasFlag('no-worker');

// Environment validation
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Step 1: Reset preview status for all success generations
 */
async function resetPreviewStatus() {
  console.log('\n📋 Step 1: Finding generations to reset...\n');

  // Find all success generations
  const { data: generations, error } = await supabase
    .from('generations')
    .select('id, type, status, preview_status, preview_path, poster_path, original_path, asset_url')
    .in('status', ['success', 'completed'])
    .order('created_at', { ascending: false })
    .limit(LIMIT);

  if (error) {
    throw new Error(`Failed to fetch generations: ${error.message}`);
  }

  const total = (generations || []).length;
  console.log(`   Found ${total} success generations`);

  // Filter those with source
  const withSource = (generations || []).filter(gen => gen.original_path || gen.asset_url);
  console.log(`   With source (original_path/asset_url): ${withSource.length}`);

  // Count by type
  const photos = withSource.filter(g => String(g.type || '').toLowerCase() === 'photo');
  const videos = withSource.filter(g => String(g.type || '').toLowerCase() === 'video');
  console.log(`   Photos: ${photos.length}`);
  console.log(`   Videos: ${videos.length}`);

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN - No changes will be made\n');
    return { total: withSource.length, reset: 0 };
  }

  // Reset preview_status to 'none' and clear paths
  console.log('\n📝 Resetting preview_status...\n');

  let resetCount = 0;
  let errorCount = 0;

  for (const gen of withSource) {
    try {
      const isPhoto = String(gen.type || '').toLowerCase() === 'photo';
      
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          preview_status: 'none',
          preview_path: isPhoto ? null : gen.preview_path,
          poster_path: isPhoto ? gen.poster_path : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gen.id);

      if (updateError) throw updateError;
      
      resetCount++;
      process.stdout.write(`\r   Reset: ${resetCount}/${withSource.length}`);
    } catch (err) {
      errorCount++;
      console.error(`\n   ❌ Failed to reset ${gen.id}:`, err.message);
    }
  }

  console.log(`\n\n   ✅ Reset ${resetCount} generations`);
  if (errorCount > 0) {
    console.log(`   ⚠️  ${errorCount} errors`);
  }

  return { total: withSource.length, reset: resetCount };
}

/**
 * Step 2: Run worker until caught up
 */
async function runWorkerUntilCaughtUp(maxCycles = 10) {
  console.log('\n📋 Step 2: Running preview worker...\n');

  if (DRY_RUN) {
    console.log('   🔍 DRY RUN - Skipping worker\n');
    return;
  }

  const workerPath = path.join(__dirname, 'previews-worker.js');
  
  for (let cycle = 1; cycle <= maxCycles; cycle++) {
    console.log(`   Cycle ${cycle}/${maxCycles}...`);

    const result = await new Promise((resolve, reject) => {
      const worker = spawn('node', [workerPath], {
        env: {
          ...process.env,
          PREVIEWS_WORKER_ONESHOT: '1',
          PREVIEWS_WORKER_DEBUG: '1',
        },
        stdio: 'pipe',
      });

      let output = '';

      worker.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data);
      });

      worker.stderr.on('data', (data) => {
        output += data.toString();
        process.stderr.write(data);
      });

      worker.on('close', (code) => {
        resolve({ code, output });
      });

      worker.on('error', reject);
    });

    // Check if caught up
    if (result.output.includes('all caught up')) {
      console.log('\n   ✅ Worker caught up!\n');
      break;
    }

    // Small delay between cycles
    if (cycle < maxCycles) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

/**
 * Step 3: Verify results
 */
async function verifyResults() {
  console.log('\n📋 Step 3: Verifying results...\n');

  const { data: stats, error } = await supabase
    .from('generations')
    .select('preview_status, type')
    .in('status', ['success', 'completed']);

  if (error) {
    console.error('   ❌ Failed to fetch stats:', error.message);
    return;
  }

  const byStatus = {};
  for (const gen of (stats || [])) {
    const key = `${gen.type}:${gen.preview_status || 'null'}`;
    byStatus[key] = (byStatus[key] || 0) + 1;
  }

  console.log('   Preview status breakdown:');
  for (const [key, count] of Object.entries(byStatus).sort()) {
    const [type, status] = key.split(':');
    const icon = status === 'ready' ? '✅' : status === 'processing' ? '⏳' : status === 'failed' ? '❌' : '⚪';
    console.log(`     ${icon} ${type} ${status}: ${count}`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   PREVIEW REBUILD SCRIPT');
  console.log('═══════════════════════════════════════════════════');
  console.log(`   Supabase URL: ${SUPABASE_URL}`);
  console.log(`   Limit: ${LIMIT}`);
  console.log(`   Dry run: ${DRY_RUN}`);
  console.log(`   Run worker: ${RUN_WORKER}`);
  console.log('═══════════════════════════════════════════════════');

  try {
    // Step 1: Reset
    const { total, reset } = await resetPreviewStatus();

    if (reset === 0 && !DRY_RUN) {
      console.log('\n✅ No generations needed reset. All done!\n');
      return;
    }

    // Step 2: Run worker
    if (RUN_WORKER && !DRY_RUN) {
      await runWorkerUntilCaughtUp();
    }

    // Step 3: Verify
    await verifyResults();

    console.log('\n═══════════════════════════════════════════════════');
    console.log('   ✅ REBUILD COMPLETE');
    console.log('═══════════════════════════════════════════════════');
    console.log(`   Total processed: ${total}`);
    console.log(`   Reset: ${reset}`);
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Rebuild failed:', error.message);
    process.exit(1);
  }
}

// Run
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
