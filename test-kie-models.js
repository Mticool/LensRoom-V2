#!/usr/bin/env node
/**
 * Test script to check if Midjourney is available in KIE.ai account
 * 
 * Usage: node test-kie-models.js
 */

const fs = require('fs');
const path = require('path');

// Read .env.local file
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    lines.forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

const KIE_API_KEY = process.env.KIE_API_KEY;
const KIE_API_URL = process.env.NEXT_PUBLIC_KIE_API_URL || 'https://api.kie.ai';

if (!KIE_API_KEY) {
  console.error('❌ Error: KIE_API_KEY not found in .env.local');
  process.exit(1);
}

async function testMidjourneyAvailability() {
  console.log('🔍 Testing Midjourney availability in KIE.ai account...\n');

  try {
    const response = await fetch(`${KIE_API_URL}/api/v1/jobs/createTask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'midjourney',
        input: {
          prompt: 'test image, simple red apple',
          mode: 'fast',
          aspectRatio: '1:1',
        },
      }),
    });

    const data = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📦 Response Data:', JSON.stringify(data, null, 2));
    console.log('');

    if (response.ok && data.code === 200) {
      console.log('✅ SUCCESS: Midjourney is ACTIVE in your KIE.ai account!');
      console.log('📝 Task ID:', data.data?.taskId);
      console.log('');
      console.log('🎉 You can now uncomment Midjourney in src/config/models.ts');
      return true;
    } else if (response.status === 403 || response.status === 404) {
      console.log('❌ ERROR: Midjourney is NOT ACTIVE in your account');
      console.log('');
      console.log('📋 Next steps:');
      console.log('   1. Go to https://kie.ai');
      console.log('   2. Navigate to Market API → Models');
      console.log('   3. Find and activate "Midjourney"');
      console.log('   4. Or contact support: support@kie.ai');
      return false;
    } else if (data.code === 10003) {
      console.log('⚠️  Model not found or not activated');
      console.log('   Message:', data.message || data.msg);
      console.log('');
      console.log('📋 Action required: Activate Midjourney in KIE.ai dashboard');
      return false;
    } else {
      console.log('⚠️  Unexpected response');
      console.log('   You may need to check your KIE.ai account settings');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing Midjourney:', error.message);
    console.error('');
    console.error('💡 Possible issues:');
    console.error('   - Network connection');
    console.error('   - Invalid API key');
    console.error('   - KIE.ai API is down');
    return false;
  }
}

// Run test
testMidjourneyAvailability()
  .then(isAvailable => {
    process.exit(isAvailable ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
