/**
 * Live API Test for Photo Generation
 * Tests actual API endpoints with mock/dry-run mode
 */

const TEST_PROMPT = "A beautiful sunset over mountains";

async function testSeedreamAPI() {
  console.log('🧪 Testing Seedream 4.5 Live API\n');
  console.log('='.repeat(80));

  const testCases = [
    { quality: 'turbo', aspectRatio: '1:1' },
    { quality: 'balanced', aspectRatio: '16:9' },
    { quality: 'quality', aspectRatio: '9:16' },
  ];

  for (const test of testCases) {
    console.log(`\n📸 Testing Seedream 4.5 - ${test.quality.toUpperCase()}`);
    console.log(`   Aspect Ratio: ${test.aspectRatio}`);

    try {
      const response = await fetch('http://localhost:3000/api/generate/photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'seedream-4.5',
          prompt: TEST_PROMPT,
          quality: test.quality,
          aspectRatio: test.aspectRatio,
          variants: 1,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        console.log('   ⚠️  SKIPPED: Not authenticated (expected)');
        continue;
      }

      if (!response.ok) {
        console.log(`   ❌ FAILED: ${data.error || 'Unknown error'}`);
        if (data.details) {
          console.log(`   Details: ${data.details}`);
        }
        continue;
      }

      console.log(`   ✅ SUCCESS`);
      console.log(`   Job ID: ${data.jobId}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Provider: ${data.provider}`);
      console.log(`   Cost: ${data.creditCost}⭐`);

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

async function testAllModels() {
  console.log('🧪 Testing All Photo Models\n');
  console.log('='.repeat(80));

  const models = [
    { id: 'seedream-4.5', quality: 'turbo', name: 'Seedream 4.5' },
    { id: 'nano-banana-pro', quality: '1k_2k', name: 'Nano Banana Pro' },
    { id: 'flux-2-pro', quality: '1k', name: 'FLUX 2 Pro' },
    { id: 'z-image', quality: 'turbo', name: 'Z-image' },
    { id: 'grok-imagine', quality: undefined, name: 'Grok Imagine' },
    { id: 'topaz-image-upscale', quality: '2k', name: 'Topaz Upscale' },
  ];

  const results = {
    success: [],
    unauthorized: [],
    failed: [],
  };

  for (const model of models) {
    console.log(`\n📸 Testing: ${model.name}`);

    try {
      const payload = {
        model: model.id,
        prompt: TEST_PROMPT,
        aspectRatio: '1:1',
        variants: 1,
      };

      if (model.quality) {
        payload.quality = model.quality;
      }

      const response = await fetch('http://localhost:3000/api/generate/photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.status === 401) {
        console.log('   ⚠️  Not authenticated');
        results.unauthorized.push(model.name);
        continue;
      }

      if (!response.ok) {
        console.log(`   ❌ Failed: ${data.error}`);
        results.failed.push({ model: model.name, error: data.error });
        continue;
      }

      console.log(`   ✅ Success (${data.provider})`);
      results.success.push(model.name);

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      results.failed.push({ model: model.name, error: error.message });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Summary\n');
  console.log(`✅ Success: ${results.success.length}`);
  console.log(`⚠️  Unauthorized: ${results.unauthorized.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\n❌ Failures:');
    results.failed.forEach(f => {
      console.log(`   - ${f.model}: ${f.error}`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

// Check server availability first
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/', {
      method: 'HEAD',
      signal: AbortSignal.timeout(2000),
    });
    return true;
  } catch (error) {
    console.error('❌ Server not running on http://localhost:3000');
    console.error('   Please start the server with: npm run dev');
    return false;
  }
}

// Main
(async () => {
  const serverOk = await checkServer();
  if (!serverOk) {
    process.exit(1);
  }

  console.log('✅ Server is running\n');

  await testSeedreamAPI();
  await testAllModels();
})();
