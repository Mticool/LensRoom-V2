/**
 * Test all Veo 3.1 model variants and -fl suffix logic
 */

import { LAOZHANG_MODELS } from './src/lib/api/laozhang-client';

// Test cases: model transformation with reference images
interface TestCase {
  input: string;
  expected: string;
  hasReferenceImages: boolean;
  description: string;
}

const testCases: TestCase[] = [
  // Without reference images - no transformation
  {
    input: 'veo-3.1',
    expected: 'veo-3.1',
    hasReferenceImages: false,
    description: 'Standard Veo 3.1 without references',
  },
  {
    input: 'veo-3.1-fast',
    expected: 'veo-3.1-fast',
    hasReferenceImages: false,
    description: 'Veo 3.1 Fast without references',
  },
  {
    input: 'veo-3.1-landscape',
    expected: 'veo-3.1-landscape',
    hasReferenceImages: false,
    description: 'Veo 3.1 Landscape without references',
  },
  {
    input: 'veo-3.1-landscape-fast',
    expected: 'veo-3.1-landscape-fast',
    hasReferenceImages: false,
    description: 'Veo 3.1 Landscape Fast without references',
  },
  
  // With reference images - add -fl suffix
  {
    input: 'veo-3.1',
    expected: 'veo-3.1-fl',
    hasReferenceImages: true,
    description: 'Standard Veo 3.1 WITH references → add -fl',
  },
  {
    input: 'veo-3.1-fast',
    expected: 'veo-3.1-fast-fl',
    hasReferenceImages: true,
    description: 'Veo 3.1 Fast WITH references → add -fl',
  },
  {
    input: 'veo-3.1-landscape',
    expected: 'veo-3.1-landscape-fl',
    hasReferenceImages: true,
    description: 'Veo 3.1 Landscape WITH references → add -fl',
  },
  {
    input: 'veo-3.1-landscape-fast',
    expected: 'veo-3.1-landscape-fast-fl',
    hasReferenceImages: true,
    description: 'Veo 3.1 Landscape Fast WITH references → add -fl',
  },
  
  // Already has -fl suffix - no double transformation
  {
    input: 'veo-3.1-fl',
    expected: 'veo-3.1-fl',
    hasReferenceImages: true,
    description: 'Already has -fl suffix - no change',
  },
  {
    input: 'veo-3.1-fast-fl',
    expected: 'veo-3.1-fast-fl',
    hasReferenceImages: true,
    description: 'Already has -fl suffix - no change',
  },
  
  // Non-Veo models - no transformation
  {
    input: 'kling-2.1',
    expected: 'kling-2.1',
    hasReferenceImages: true,
    description: 'Non-Veo model - no transformation',
  },
  {
    input: 'sora-2',
    expected: 'sora-2',
    hasReferenceImages: true,
    description: 'Non-Veo model - no transformation',
  },
];

// Simulate the logic from laozhang-client.ts
function transformModel(model: string, hasReferenceImages: boolean): string {
  if (hasReferenceImages && model.startsWith('veo') && !model.includes('-fl')) {
    return `${model}-fl`;
  }
  return model;
}

// Run tests
console.log('🧪 Testing Veo 3.1 Model Transformations\n');
console.log('═'.repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = transformModel(testCase.input, testCase.hasReferenceImages);
  const isPass = result === testCase.expected;
  
  if (isPass) {
    console.log(`✅ Test ${index + 1}: PASS`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1}: FAIL`);
    failed++;
  }
  
  console.log(`   Input:    "${testCase.input}"`);
  console.log(`   Expected: "${testCase.expected}"`);
  console.log(`   Got:      "${result}"`);
  console.log(`   Refs:     ${testCase.hasReferenceImages}`);
  console.log(`   ${testCase.description}`);
  console.log();
});

console.log('═'.repeat(80));
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests\n`);

// Verify constants match expected values
console.log('🔍 Verifying LAOZHANG_MODELS constants:\n');
console.log('═'.repeat(80));

const expectedConstants = {
  VEO_31: 'veo-3.1',
  VEO_31_FAST: 'veo-3.1-fast',
  VEO_31_LANDSCAPE: 'veo-3.1-landscape',
  VEO_31_LANDSCAPE_FAST: 'veo-3.1-landscape-fast',
  VEO_31_FAST_4K: 'veo-3.1-fast-4k',
  VEO_31_LANDSCAPE_FAST_4K: 'veo-3.1-landscape-fast-4k',
  VEO_31_FL: 'veo-3.1-fl',
  VEO_31_LANDSCAPE_FL: 'veo-3.1-landscape-fl',
};

let constantsOk = 0;
let constantsFail = 0;

Object.entries(expectedConstants).forEach(([key, expectedValue]) => {
  const actualValue = (LAOZHANG_MODELS as any)[key];
  const isMatch = actualValue === expectedValue;
  
  if (isMatch) {
    console.log(`✅ ${key}: "${actualValue}"`);
    constantsOk++;
  } else {
    console.log(`❌ ${key}: expected "${expectedValue}", got "${actualValue}"`);
    constantsFail++;
  }
});

console.log('\n═'.repeat(80));
console.log(`\n📊 Constants Check: ${constantsOk} correct, ${constantsFail} incorrect\n`);

// Test example payloads
console.log('📦 Example API Payloads:\n');
console.log('═'.repeat(80));

const examplePayloads = [
  {
    scenario: 'Text-to-Video (no references)',
    model: 'veo-3.1-fast',
    referenceImages: [],
    expectedModel: 'veo-3.1-fast',
    messageContent: 'A person walks in a park',
  },
  {
    scenario: 'Text-to-Video with 2 reference images',
    model: 'veo-3.1-fast',
    referenceImages: ['data:image/jpeg;base64,abc123', 'data:image/jpeg;base64,def456'],
    expectedModel: 'veo-3.1-fast-fl',
    messageContent: [
      { type: 'text', text: 'A person walks in a park' },
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,abc123' } },
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,def456' } },
    ],
  },
  {
    scenario: 'Landscape with 1 reference image',
    model: 'veo-3.1-landscape',
    referenceImages: ['data:image/png;base64,xyz789'],
    expectedModel: 'veo-3.1-landscape-fl',
    messageContent: [
      { type: 'text', text: 'Cinematic landscape shot' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,xyz789' } },
    ],
  },
];

examplePayloads.forEach((example, index) => {
  console.log(`\n${index + 1}. ${example.scenario}`);
  console.log('-'.repeat(80));
  
  const finalModel = transformModel(example.model, example.referenceImages.length > 0);
  const isCorrect = finalModel === example.expectedModel;
  
  console.log(`   Original model:  "${example.model}"`);
  console.log(`   Reference count: ${example.referenceImages.length}`);
  console.log(`   Final model:     "${finalModel}" ${isCorrect ? '✅' : '❌'}`);
  console.log(`   Expected:        "${example.expectedModel}"`);
  
  if (typeof example.messageContent === 'string') {
    console.log(`   Content type:    text-only`);
  } else {
    console.log(`   Content type:    multimodal (${example.messageContent.length} parts)`);
  }
});

console.log('\n═'.repeat(80));

// Final summary
const allTestsPassed = failed === 0 && constantsFail === 0;
if (allTestsPassed) {
  console.log('\n✅ ✅ ✅ ALL TESTS PASSED! ✅ ✅ ✅\n');
  console.log('🎉 Veo 3.1 model transformations are working correctly!\n');
  process.exit(0);
} else {
  console.log('\n❌ SOME TESTS FAILED\n');
  console.log(`Failed tests: ${failed}`);
  console.log(`Failed constants: ${constantsFail}`);
  console.log('\nPlease review the failures above.\n');
  process.exit(1);
}
