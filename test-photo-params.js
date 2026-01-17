/**
 * Test Photo API Parameter Logic
 * Validates that correct parameters are sent for each model type
 */

const TEST_CASES = [
  // === QUALITY-BASED MODELS (should use quality param, NOT resolution) ===
  {
    modelId: 'seedream-4.5',
    quality: 'turbo',
    expectedProvider: 'kie_market',
    expectedApiId: 'seedream/4.5-text-to-image',
    shouldHaveQuality: true,
    shouldHaveResolution: false,
    description: 'Seedream 4.5 with turbo quality',
  },
  {
    modelId: 'seedream-4.5',
    quality: 'balanced',
    expectedProvider: 'kie_market',
    expectedApiId: 'seedream/4.5-text-to-image',
    shouldHaveQuality: true,
    shouldHaveResolution: false,
    description: 'Seedream 4.5 with balanced quality',
  },
  {
    modelId: 'seedream-4.5',
    quality: 'quality',
    expectedProvider: 'kie_market',
    expectedApiId: 'seedream/4.5-text-to-image',
    shouldHaveQuality: true,
    shouldHaveResolution: false,
    description: 'Seedream 4.5 with quality',
  },
  {
    modelId: 'z-image',
    quality: 'turbo',
    expectedProvider: 'kie_market',
    expectedApiId: 'z-image',
    shouldHaveQuality: true,
    shouldHaveResolution: false,
    description: 'Z-image with turbo',
  },

  // === RESOLUTION-BASED MODELS (should use resolution param, NOT quality) ===
  {
    modelId: 'nano-banana-pro',
    quality: '1k_2k',
    expectedProvider: 'laozhang',
    expectedApiId: 'gemini-3-pro-image-preview',
    shouldHaveQuality: false,
    shouldHaveResolution: true,
    expectedResolution: '2K',
    description: 'Nano Banana Pro with 1k_2k',
  },
  {
    modelId: 'nano-banana-pro',
    quality: '4k',
    expectedProvider: 'laozhang',
    expectedApiId: 'gemini-3-pro-image-preview',
    shouldHaveQuality: false,
    shouldHaveResolution: true,
    expectedResolution: '4K',
    description: 'Nano Banana Pro with 4k',
  },
  {
    modelId: 'flux-2-pro',
    quality: '1k',
    expectedProvider: 'kie_market',
    expectedApiId: 'flux-2/pro-text-to-image',
    shouldHaveQuality: false,
    shouldHaveResolution: true,
    expectedResolution: '1K',
    description: 'FLUX 2 Pro with 1k',
  },
  {
    modelId: 'flux-2-pro',
    quality: '2k',
    expectedProvider: 'kie_market',
    expectedApiId: 'flux-2/pro-text-to-image',
    shouldHaveQuality: false,
    shouldHaveResolution: true,
    expectedResolution: '2K',
    description: 'FLUX 2 Pro with 2k',
  },
  {
    modelId: 'topaz-image-upscale',
    quality: '2k',
    expectedProvider: 'kie_market',
    expectedApiId: 'topaz/image-upscale',
    shouldHaveQuality: false,
    shouldHaveResolution: true,
    expectedResolution: '2K',
    description: 'Topaz Upscale with 2k',
  },
  {
    modelId: 'topaz-image-upscale',
    quality: '4k',
    expectedProvider: 'kie_market',
    expectedApiId: 'topaz/image-upscale',
    shouldHaveQuality: false,
    shouldHaveResolution: true,
    expectedResolution: '4K',
    description: 'Topaz Upscale with 4k',
  },
  {
    modelId: 'topaz-image-upscale',
    quality: '8k',
    expectedProvider: 'kie_market',
    expectedApiId: 'topaz/image-upscale',
    shouldHaveQuality: false,
    shouldHaveResolution: true,
    expectedResolution: '8K',
    description: 'Topaz Upscale with 8k',
  },

  // === OPENAI MODELS (handled separately, should use quality) ===
  {
    modelId: 'gpt-image',
    quality: 'medium',
    expectedProvider: 'openai',
    expectedApiId: 'gpt-image/1.5-text-to-image',
    shouldHaveQuality: true,
    shouldHaveResolution: false,
    description: 'GPT Image 1.5 with medium quality',
  },
  {
    modelId: 'gpt-image',
    quality: 'high',
    expectedProvider: 'openai',
    expectedApiId: 'gpt-image/1.5-text-to-image',
    shouldHaveQuality: true,
    shouldHaveResolution: false,
    description: 'GPT Image 1.5 with high quality',
  },

  // === MODELS WITHOUT QUALITY OPTIONS ===
  {
    modelId: 'grok-imagine',
    quality: undefined,
    expectedProvider: 'kie_market',
    expectedApiId: 'grok-imagine/text-to-image',
    shouldHaveQuality: false,
    shouldHaveResolution: false,
    description: 'Grok Imagine (no quality options)',
  },
];

// Simulate the parameter logic from route.ts
function simulateParameterLogic(modelId, quality) {
  const resolutionBasedQualityValues = ['1k_2k', '4k', '1k', '2k', '8k'];
  const qualityBasedQualityValues = ['fast', 'turbo', 'balanced', 'quality', 'ultra'];
  const isResolutionBasedModel = modelId.includes('nano-banana') ||
                                  modelId.includes('flux') ||
                                  modelId.includes('topaz');

  const params = {
    model: modelId,
    aspectRatio: '1:1',
    outputFormat: 'png',
  };

  // Resolution logic
  const needsResolution = modelId.includes('nano-banana') ||
                         modelId.includes('flux') ||
                         modelId.includes('topaz');

  if (needsResolution && quality) {
    // Map quality to resolution
    let resolution = '1K';
    const q = quality.toLowerCase();
    if (q === '1k_2k') resolution = '2K';
    else if (q === '4k') resolution = '4K';
    else if (q === '8k') resolution = '8K';
    else if (q === '2k') resolution = '2K';
    else if (q === '1k') resolution = '1K';

    params.resolution = resolution;
  }

  // Quality logic
  if (quality) {
    const lowerQuality = quality.toLowerCase();

    if (isResolutionBasedModel && resolutionBasedQualityValues.includes(lowerQuality)) {
      // Don't add quality - resolution is already set
    } else if (qualityBasedQualityValues.includes(lowerQuality) || !isResolutionBasedModel) {
      // Add quality for quality-based models or non-resolution values
      params.quality = quality;
    }
  }

  return params;
}

function runTests() {
  console.log('🧪 Testing Photo API Parameter Logic\n');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const testCase of TEST_CASES) {
    const params = simulateParameterLogic(testCase.modelId, testCase.quality);

    let testPassed = true;
    const errors = [];

    // Check if quality parameter is correct
    if (testCase.shouldHaveQuality && !params.quality) {
      errors.push(`Missing quality parameter (expected: ${testCase.quality})`);
      testPassed = false;
    } else if (!testCase.shouldHaveQuality && params.quality) {
      errors.push(`Unexpected quality parameter: ${params.quality}`);
      testPassed = false;
    }

    // Check if resolution parameter is correct
    if (testCase.shouldHaveResolution && !params.resolution) {
      errors.push(`Missing resolution parameter (expected: ${testCase.expectedResolution})`);
      testPassed = false;
    } else if (!testCase.shouldHaveResolution && params.resolution) {
      errors.push(`Unexpected resolution parameter: ${params.resolution}`);
      testPassed = false;
    }

    // Check resolution value
    if (testCase.expectedResolution && params.resolution !== testCase.expectedResolution) {
      errors.push(`Wrong resolution: ${params.resolution} (expected: ${testCase.expectedResolution})`);
      testPassed = false;
    }

    if (testPassed) {
      console.log(`✅ PASS: ${testCase.description}`);
      console.log(`   Params: quality=${params.quality || 'none'}, resolution=${params.resolution || 'none'}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${testCase.description}`);
      console.log(`   Params: quality=${params.quality || 'none'}, resolution=${params.resolution || 'none'}`);
      errors.forEach(err => console.log(`   Error: ${err}`));
      failed++;
      failures.push({ test: testCase.description, errors });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Test Results Summary\n');
  console.log(`✅ Passed: ${passed}/${TEST_CASES.length}`);
  console.log(`❌ Failed: ${failed}/${TEST_CASES.length}`);

  if (failures.length > 0) {
    console.log('\n❌ Failed Tests:');
    failures.forEach(f => {
      console.log(`\n   ${f.test}`);
      f.errors.forEach(err => console.log(`      - ${err}`));
    });
  }

  console.log('\n' + '='.repeat(80));

  return failed === 0;
}

// Run tests
const success = runTests();
process.exit(success ? 0 : 1);
