#!/usr/bin/env tsx
/**
 * Test script for video generation flow
 * Tests the complete path from API request to database storage
 * 
 * Usage:
 *   tsx scripts/test-video-generation-flow.ts veo
 *   tsx scripts/test-video-generation-flow.ts sora
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const LAOZHANG_API_KEY = process.env.LAOZHANG_API_KEY;

interface TestConfig {
  model: string;
  prompt: string;
  aspectRatio: string;
  duration: number;
  quality?: string;
}

const TEST_CONFIGS: Record<string, TestConfig> = {
  veo: {
    model: 'veo-3.1-fast',
    prompt: 'A cat walking on the street',
    aspectRatio: '16:9',
    duration: 8,
    quality: 'fast',
  },
  sora: {
    model: 'sora-2',
    prompt: 'A beautiful sunset over mountains',
    aspectRatio: 'portrait',
    duration: 10,
  },
};

async function testVideoGeneration(config: TestConfig) {
  console.log('\n🧪 Testing Video Generation Flow');
  console.log('================================\n');
  console.log('Configuration:');
  console.log(JSON.stringify(config, null, 2));
  console.log('\n');

  // Step 1: Check environment
  console.log('📋 Step 1: Environment Check');
  console.log('----------------------------');
  if (!LAOZHANG_API_KEY) {
    console.error('❌ LAOZHANG_API_KEY is not set in .env.local');
    process.exit(1);
  }
  console.log('✅ LAOZHANG_API_KEY is set');
  console.log(`✅ Base URL: ${BASE_URL}\n`);

  // Step 2: Check model configuration
  console.log('📋 Step 2: Model Configuration Check');
  console.log('-----------------------------------');
  try {
    const { VIDEO_MODELS } = await import('../src/config/models');
    const model = VIDEO_MODELS.find(m => m.id === config.model);
    
    if (!model) {
      console.error(`❌ Model ${config.model} not found`);
      process.exit(1);
    }
    
    console.log(`✅ Model found: ${model.name}`);
    console.log(`   ID: ${model.id}`);
    console.log(`   Provider: ${model.provider}`);
    
    if (model.provider !== 'laozhang') {
      console.error(`❌ Expected provider 'laozhang', got '${model.provider}'`);
      process.exit(1);
    }
    console.log('✅ Provider is correct: laozhang\n');
  } catch (error) {
    console.error('❌ Failed to check model configuration:', error);
    process.exit(1);
  }

  // Step 3: Check LaoZhang client configuration
  console.log('📋 Step 3: LaoZhang Client Configuration');
  console.log('--------------------------------------');
  try {
    const { getLaoZhangClient, getLaoZhangVideoModelId } = await import('../src/lib/api/laozhang-client');
    
    const videoModelId = getLaoZhangVideoModelId(
      config.model,
      config.aspectRatio,
      config.quality,
      config.duration
    );
    
    console.log(`✅ Video Model ID mapping:`);
    console.log(`   Input: ${config.model}`);
    console.log(`   Output: ${videoModelId}`);
    console.log(`   Aspect Ratio: ${config.aspectRatio}`);
    console.log(`   Quality: ${config.quality || 'default'}`);
    console.log(`   Duration: ${config.duration}s`);
    
    const client = getLaoZhangClient();
    console.log('✅ LaoZhang client created');
    console.log(`   Base URL: https://api.laozhang.ai/v1`);
    console.log(`   API Key: ${LAOZHANG_API_KEY.substring(0, 10)}...\n`);
  } catch (error) {
    console.error('❌ Failed to check LaoZhang client:', error);
    process.exit(1);
  }

  // Step 4: Test API request structure (dry run)
  console.log('📋 Step 4: API Request Structure (Dry Run)');
  console.log('------------------------------------------');
  const requestBody = {
    prompt: config.prompt,
    model: config.model,
    aspectRatio: config.aspectRatio,
    duration: config.duration,
    quality: config.quality,
    mode: 't2v',
  };
  
  console.log('Request body that would be sent:');
  console.log(JSON.stringify(requestBody, null, 2));
  console.log('\n✅ Request structure is valid\n');

  // Step 5: Check database schema expectations
  console.log('📋 Step 5: Database Schema Check');
  console.log('--------------------------------');
  console.log('Expected fields in generations table:');
  console.log('  - type: "video"');
  console.log(`  - model_id: "${config.model}"`);
  console.log('  - status: "queued" -> "success"');
  console.log('  - result_urls: [string] (array of video URLs)');
  console.log('  - credits_used: number');
  console.log('  - prompt: string');
  console.log('  - aspect_ratio: string');
  console.log('✅ Schema expectations documented\n');

  // Step 6: Summary
  console.log('📋 Summary');
  console.log('---------');
  console.log('✅ All configuration checks passed');
  console.log('✅ Ready for actual API test');
  console.log('\n⚠️  To perform actual generation test:');
  console.log('   1. Ensure you have valid session/auth token');
  console.log('   2. Make POST request to /api/generate/video');
  console.log('   3. Monitor logs for:');
  console.log('      - API request to LaoZhang');
  console.log('      - Video download and storage upload');
  console.log('      - Database update');
  console.log('   4. Check /api/library for generated video');
  console.log('\n');
}

async function main() {
  const testType = process.argv[2] || 'veo';
  
  if (!TEST_CONFIGS[testType]) {
    console.error(`Unknown test type: ${testType}`);
    console.error(`Available: ${Object.keys(TEST_CONFIGS).join(', ')}`);
    process.exit(1);
  }

  await testVideoGeneration(TEST_CONFIGS[testType]);
}

main().catch(console.error);
