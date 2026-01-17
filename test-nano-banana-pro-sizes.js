/**
 * Test nano-banana-pro resolution calculation
 * Verify that 1k_2k produces valid image sizes
 */

// Simulate the resolution calculation from laozhang-client.ts
function resolutionToLaoZhangSize(resolution, aspectRatio) {
  const aspect = aspectRatio || "1:1";

  // Calculate base dimensions for aspect ratio
  const aspectMap = {
    "1:1": { base: 1024, ratio: [1, 1] },
    "16:9": { base: 1024, ratio: [16, 9] },
    "9:16": { base: 1024, ratio: [9, 16] },
    "4:3": { base: 1024, ratio: [4, 3] },
    "3:4": { base: 1024, ratio: [3, 4] },
    "3:2": { base: 1024, ratio: [3, 2] },
    "2:3": { base: 1024, ratio: [2, 3] },
  };

  const config = aspectMap[aspect] || aspectMap["1:1"];
  const [w, h] = config.ratio;
  const isPortrait = h > w;

  // Resolution multipliers
  const multipliers = {
    "1k": 1,
    "1k_2k": 1.5, // Between 1K and 2K
    "2k": 2,
    "4k": 4,
  };

  const mult = multipliers[resolution.toLowerCase()] || 1;
  const base = config.base * mult;

  // Calculate dimensions maintaining aspect ratio
  let width, height;
  if (isPortrait) {
    height = Math.round(base);
    width = Math.round((base * w) / h);
  } else {
    width = Math.round(base);
    height = Math.round((base * h) / w);
  }

  // Round to nearest 64 (required by some models)
  width = Math.round(width / 64) * 64;
  height = Math.round(height / 64) * 64;

  // Clamp to reasonable limits
  width = Math.min(Math.max(width, 512), 4096);
  height = Math.min(Math.max(height, 512), 4096);

  return `${width}x${height}`;
}

console.log('📐 Nano Banana Pro - Resolution Size Tests\n');
console.log('='.repeat(70));

const resolutions = ['1k', '1k_2k', '2k', '4k'];
const aspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];

console.log('\n🔹 Size calculations for all combinations:\n');

for (const resolution of resolutions) {
  console.log(`\n${resolution.toUpperCase()}:`);
  for (const aspect of aspectRatios) {
    const size = resolutionToLaoZhangSize(resolution, aspect);
    console.log(`  ${aspect.padEnd(6)} → ${size}`);
  }
}

console.log('\n\n📊 Analysis:\n');
console.log('='.repeat(70));

// Check if sizes are standard
const standardSizes = [512, 768, 1024, 1536, 2048, 3072, 4096];

console.log('\n🔍 Checking 1k_2k sizes (potential issue):');
for (const aspect of aspectRatios) {
  const size = resolutionToLaoZhangSize('1k_2k', aspect);
  const [w, h] = size.split('x').map(Number);

  const wIsStandard = standardSizes.includes(w);
  const hIsStandard = standardSizes.includes(h);

  const status = (wIsStandard && hIsStandard) ? '✅' : '⚠️';
  console.log(`  ${aspect.padEnd(6)} → ${size.padEnd(12)} ${status} ${!wIsStandard || !hIsStandard ? '(non-standard)' : '(standard)'}`);
}

console.log('\n💡 Findings:');
console.log('  - 1k_2k uses 1.5x multiplier → 1536px base size');
console.log('  - This is rounded to nearest 64px');
console.log('  - Result: 1536x1536 for 1:1 (standard size ✅)');
console.log('  - Other aspects may produce non-standard sizes');

console.log('\n🔧 Recommendations:');
console.log('  1. Test with real LaoZhang/Gemini API to verify acceptance');
console.log('  2. If API rejects non-standard sizes, change 1k_2k multiplier to 2.0 (same as 2k)');
console.log('  3. Or use standard sizes: 1024, 2048, 4096');

console.log('\n' + '='.repeat(70));
