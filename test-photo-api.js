/**
 * Test script for Photo Generation API
 * Tests all photo models with their respective quality/resolution parameters
 */

const TEST_PROMPT = "A beautiful sunset over mountains, cinematic photography";

// Test cases for each model
const TEST_CASES = [
  // Seedream 4.5 - quality-based (turbo/balanced/quality)
  {
    model: 'seedream-4.5',
    name: 'Seedream 4.5 - Turbo',
    quality: 'turbo',
    aspectRatio: '16:9',
    expectedParams: {
      model: 'seedream/4.5-text-to-image',
      quality: 'turbo',
      resolution: undefined, // Should NOT have resolution
    }
  },
  {
    model: 'seedream-4.5',
    name: 'Seedream 4.5 - Balanced',
    quality: 'balanced',
    aspectRatio: '1:1',
    expectedParams: {
      model: 'seedream/4.5-text-to-image',
      quality: 'balanced',
      resolution: undefined,
    }
  },
  {
    model: 'seedream-4.5',
    name: 'Seedream 4.5 - Quality',
    quality: 'quality',
    aspectRatio: '9:16',
    expectedParams: {
      model: 'seedream/4.5-text-to-image',
      quality: 'quality',
      resolution: undefined,
    }
  },

  // Nano Banana - quality-based but maps to resolution
  {
    model: 'nano-banana',
    name: 'Nano Banana - Turbo',
    quality: 'turbo',
    aspectRatio: '1:1',
    expectedParams: {
      model: 'gemini-2.5-flash-image-preview',
      resolution: '1K', // Should map to resolution
      quality: undefined, // Should NOT have quality
    }
  },

  // Nano Banana Pro - resolution-based (1k_2k/4k)
  {
    model: 'nano-banana-pro',
    name: 'Nano Banana Pro - 1K/2K',
    quality: '1k_2k',
    aspectRatio: '16:9',
    expectedParams: {
      model: 'gemini-3-pro-image-preview-2k',
      resolution: '2K',
      quality: undefined,
    }
  },
  {
    model: 'nano-banana-pro',
    name: 'Nano Banana Pro - 4K',
    quality: '4k',
    aspectRatio: '1:1',
    expectedParams: {
      model: 'gemini-3-pro-image-preview-4k',
      resolution: '4K',
      quality: undefined,
    }
  },

  // FLUX 2 Pro - resolution-based (1k/2k)
  {
    model: 'flux-2-pro',
    name: 'FLUX 2 Pro - 1K',
    quality: '1k',
    aspectRatio: '16:9',
    expectedParams: {
      model: 'flux-2/pro-text-to-image',
      resolution: '1K',
      quality: undefined,
    }
  },
  {
    model: 'flux-2-pro',
    name: 'FLUX 2 Pro - 2K',
    quality: '2k',
    aspectRatio: '1:1',
    expectedParams: {
      model: 'flux-2/pro-text-to-image',
      resolution: '2K',
      quality: undefined,
    }
  },

  // Grok Imagine - quality-based (should work similar to Seedream)
  {
    model: 'grok-imagine',
    name: 'Grok Imagine',
    aspectRatio: '1:1',
    expectedParams: {
      model: 'grok-imagine/text-to-image',
      resolution: undefined,
      quality: undefined, // No quality options for Grok
    }
  },

  // Z-image - quality-based
  {
    model: 'z-image',
    name: 'Z-image - Turbo',
    quality: 'turbo',
    aspectRatio: '1:1',
    expectedParams: {
      model: 'z-image',
      quality: 'turbo',
      resolution: undefined,
    }
  },

  // Topaz Upscale - resolution-based (2k/4k/8k)
  {
    model: 'topaz-image-upscale',
    name: 'Topaz Upscale - 2K',
    quality: '2k',
    aspectRatio: '1:1',
    expectedParams: {
      model: 'topaz/image-upscale',
      resolution: '2K',
      quality: undefined,
    }
  },
  {
    model: 'topaz-image-upscale',
    name: 'Topaz Upscale - 4K',
    quality: '4k',
    aspectRatio: '16:9',
    expectedParams: {
      model: 'topaz/image-upscale',
      resolution: '4K',
      quality: undefined,
    }
  },

  // GPT Image 1.5 - quality-based (medium/high)
  {
    model: 'gpt-image',
    name: 'GPT Image 1.5 - Medium',
    quality: 'medium',
    aspectRatio: '1:1',
    expectedParams: {
      provider: 'openai',
      model: 'gpt-image/1.5-text-to-image',
      quality: 'medium',
      size: '1024x1024',
    }
  },
  {
    model: 'gpt-image',
    name: 'GPT Image 1.5 - High',
    quality: 'high',
    aspectRatio: '3:2',
    expectedParams: {
      provider: 'openai',
      model: 'gpt-image/1.5-text-to-image',
      quality: 'high',
      size: '1536x1024',
    }
  },
];

async function testPhotoAPI() {
  console.log('🧪 Testing Photo Generation API\n');
  console.log('='.repeat(80));

  const results = {
    passed: [],
    failed: [],
  };

  for (const testCase of TEST_CASES) {
    console.log(`\n📸 Testing: ${testCase.name}`);
    console.log(`   Model: ${testCase.model}`);
    console.log(`   Quality: ${testCase.quality || 'default'}`);
    console.log(`   Aspect Ratio: ${testCase.aspectRatio}`);

    try {
      const payload = {
        model: testCase.model,
        prompt: TEST_PROMPT,
        aspectRatio: testCase.aspectRatio,
        variants: 1,
      };

      if (testCase.quality) {
        payload.quality = testCase.quality;
      }

      console.log(`   📤 Request payload:`, JSON.stringify(payload, null, 2));

      const response = await fetch('http://localhost:3000/api/generate/photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers if needed
          'Cookie': process.env.TEST_AUTH_COOKIE || '',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.log(`   ❌ FAILED: ${data.error || 'Unknown error'}`);
        if (data.details) {
          console.log(`   Details: ${data.details}`);
        }
        results.failed.push({
          test: testCase.name,
          error: data.error,
          status: response.status,
        });
        continue;
      }

      console.log(`   ✅ SUCCESS: Job ID ${data.jobId}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Provider: ${data.provider}`);
      console.log(`   Credit Cost: ${data.creditCost}⭐`);

      results.passed.push({
        test: testCase.name,
        jobId: data.jobId,
        provider: data.provider,
      });

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      results.failed.push({
        test: testCase.name,
        error: error.message,
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Test Results Summary\n');
  console.log(`✅ Passed: ${results.passed.length}/${TEST_CASES.length}`);
  console.log(`❌ Failed: ${results.failed.length}/${TEST_CASES.length}`);

  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach(f => {
      console.log(`   - ${f.test}: ${f.error} (Status: ${f.status || 'N/A'})`);
    });
  }

  if (results.passed.length > 0) {
    console.log('\n✅ Passed Tests:');
    results.passed.forEach(p => {
      console.log(`   - ${p.test} (Job: ${p.jobId}, Provider: ${p.provider})`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

// Run tests
testPhotoAPI().catch(console.error);
