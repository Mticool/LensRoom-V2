#!/usr/bin/env tsx
/**
 * Check video generation records in database
 * 
 * Usage:
 *   tsx scripts/check-video-generation-db.ts
 *   tsx scripts/check-video-generation-db.ts --model veo-3.1-fast
 *   tsx scripts/check-video-generation-db.ts --recent 5
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface GenerationRecord {
  id: string;
  user_id: string;
  type: string;
  model_id: string;
  model_name: string;
  status: string;
  result_urls: string[] | null;
  credits_used: number;
  prompt: string;
  aspect_ratio: string | null;
  created_at: string;
  updated_at: string;
}

async function checkVideoGenerations(options: { model?: string; limit?: number }) {
  console.log('\n🔍 Checking Video Generation Records');
  console.log('====================================\n');

  let query = supabase
    .from('generations')
    .select('*')
    .eq('type', 'video')
    .order('created_at', { ascending: false });

  if (options.model) {
    query = query.eq('model_id', options.model);
    console.log(`Filtering by model: ${options.model}\n`);
  }

  const limit = options.limit || 10;
  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error('❌ Database error:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No video generations found\n');
    return;
  }

  console.log(`Found ${data.length} video generation(s):\n`);

  data.forEach((gen: GenerationRecord, index: number) => {
    console.log(`--- Generation ${index + 1} ---`);
    console.log(`ID: ${gen.id}`);
    console.log(`Model: ${gen.model_name} (${gen.model_id})`);
    console.log(`Status: ${gen.status}`);
    console.log(`Credits: ${gen.credits_used} ⭐`);
    console.log(`Prompt: ${gen.prompt.substring(0, 60)}...`);
    console.log(`Aspect Ratio: ${gen.aspect_ratio || 'N/A'}`);
    
    if (gen.result_urls && gen.result_urls.length > 0) {
      console.log(`Result URLs: ${gen.result_urls.length}`);
      gen.result_urls.forEach((url, i) => {
        const isStorage = url.includes('/storage/v1/');
        const isPublic = url.includes('/public/');
        console.log(`  [${i + 1}] ${isStorage ? '📦 Storage' : '🌐 External'}: ${url.substring(0, 80)}...`);
        if (isStorage && isPublic) {
          console.log(`      ✅ Public URL (accessible)`);
        } else if (isStorage) {
          console.log(`      ⚠️  Private URL (needs signed URL)`);
        }
      });
    } else {
      console.log('Result URLs: None');
    }
    
    console.log(`Created: ${new Date(gen.created_at).toLocaleString()}`);
    console.log(`Updated: ${new Date(gen.updated_at).toLocaleString()}`);
    console.log('');
  });

  // Statistics
  const stats = {
    total: data.length,
    byStatus: {} as Record<string, number>,
    byModel: {} as Record<string, number>,
    withResults: 0,
    withoutResults: 0,
  };

  data.forEach((gen: GenerationRecord) => {
    stats.byStatus[gen.status] = (stats.byStatus[gen.status] || 0) + 1;
    stats.byModel[gen.model_id] = (stats.byModel[gen.model_id] || 0) + 1;
    if (gen.result_urls && gen.result_urls.length > 0) {
      stats.withResults++;
    } else {
      stats.withoutResults++;
    }
  });

  console.log('📊 Statistics:');
  console.log('--------------');
  console.log(`Total: ${stats.total}`);
  console.log(`By Status:`, stats.byStatus);
  console.log(`By Model:`, stats.byModel);
  console.log(`With Results: ${stats.withResults}`);
  console.log(`Without Results: ${stats.withoutResults}`);
  console.log('');
}

async function main() {
  const args = process.argv.slice(2);
  const options: { model?: string; limit?: number } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--model' && args[i + 1]) {
      options.model = args[i + 1];
      i++;
    } else if (args[i] === '--recent' && args[i + 1]) {
      options.limit = parseInt(args[i + 1], 10);
      i++;
    }
  }

  await checkVideoGenerations(options);
}

main().catch(console.error);
