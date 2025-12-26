/**
 * Pricing Verification Script
 * Validates that all model pricing matches the new 65% margin specification
 */

import { PHOTO_MODELS, VIDEO_MODELS, getModelById } from '../src/config/models';
import { computePrice } from '../src/lib/pricing/compute-price';

interface PricingSpec {
  modelId: string;
  variants: {
    quality?: string;
    resolution?: string;
    duration?: number;
    audio?: boolean;
    modelVariant?: string;
    videoQuality?: string;
    expectedStars: number;
  }[];
}

// Expected pricing based on 65% margin specification
const EXPECTED_PRICING: PricingSpec[] = [
  // PHOTO MODELS
  {
    modelId: 'midjourney',
    variants: [
      { quality: 'fast', expectedStars: 14 },
      { quality: 'turbo', expectedStars: 27 },
    ],
  },
  {
    modelId: 'nano-banana',
    variants: [
      { quality: 'turbo', expectedStars: 7 },
    ],
  },
  {
    modelId: 'nano-banana-pro',
    variants: [
      { quality: '1k_2k', expectedStars: 30 },
      { quality: '4k', expectedStars: 40 },
    ],
  },
  {
    modelId: 'seedream-4.5',
    variants: [
      { quality: 'turbo', expectedStars: 11 },
    ],
  },
  {
    modelId: 'flux-2-pro',
    variants: [
      { quality: '1k', expectedStars: 9 },
      { quality: '2k', expectedStars: 12 },
    ],
  },
  {
    modelId: 'flux-2-flex',
    variants: [
      { quality: '1k', expectedStars: 24 },
      { quality: '2k', expectedStars: 41 },
    ],
  },
  {
    modelId: 'ideogram-v3',
    variants: [
      { quality: 'turbo', expectedStars: 6 },
      { quality: 'balanced', expectedStars: 12 },
      { quality: 'quality', expectedStars: 17 },
    ],
  },
  {
    modelId: 'z-image',
    variants: [
      { quality: 'turbo', expectedStars: 2 },
    ],
  },
  {
    modelId: 'recraft-remove-background',
    variants: [
      { quality: 'turbo', expectedStars: 2 },
    ],
  },
  {
    modelId: 'topaz-image-upscale',
    variants: [
      { quality: '2k', expectedStars: 17 },
      { quality: '4k', expectedStars: 34 },
      { quality: '8k', expectedStars: 67 },
    ],
  },
  // VIDEO MODELS
  {
    modelId: 'veo-3.1',
    variants: [
      { duration: 8, videoQuality: 'fast', expectedStars: 100 },
      { duration: 8, videoQuality: 'quality', expectedStars: 420 },
    ],
  },
  {
    modelId: 'kling',
    variants: [
      { duration: 5, modelVariant: 'kling-2.5-turbo', audio: false, expectedStars: 70 },
      { duration: 10, modelVariant: 'kling-2.5-turbo', audio: false, expectedStars: 140 },
      { duration: 5, modelVariant: 'kling-2.6', audio: false, expectedStars: 92 },
      { duration: 10, modelVariant: 'kling-2.6', audio: false, expectedStars: 184 },
      { duration: 5, modelVariant: 'kling-2.6', audio: true, expectedStars: 184 },
      { duration: 10, modelVariant: 'kling-2.6', audio: true, expectedStars: 368 },
      { duration: 5, modelVariant: 'kling-2.1', audio: false, expectedStars: 268 },
      { duration: 10, modelVariant: 'kling-2.1', audio: false, expectedStars: 536 },
    ],
  },
  {
    modelId: 'sora-2',
    variants: [
      { duration: 10, expectedStars: 50 },
      { duration: 15, expectedStars: 50 },
    ],
  },
  {
    modelId: 'sora-2-pro',
    variants: [
      { duration: 10, videoQuality: 'standard', expectedStars: 250 },
      { duration: 15, videoQuality: 'standard', expectedStars: 450 },
      { duration: 10, videoQuality: 'high', expectedStars: 550 },
      { duration: 15, videoQuality: 'high', expectedStars: 1050 },
    ],
  },
  {
    modelId: 'wan',
    variants: [
      // WAN 2.2
      { duration: 5, modelVariant: 'wan-2.2', resolution: '480p', expectedStars: 67 },
      { duration: 10, modelVariant: 'wan-2.2', resolution: '480p', expectedStars: 134 },
      { duration: 15, modelVariant: 'wan-2.2', resolution: '480p', expectedStars: 200 },
      { duration: 5, modelVariant: 'wan-2.2', resolution: '580p', expectedStars: 100 },
      { duration: 10, modelVariant: 'wan-2.2', resolution: '580p', expectedStars: 200 },
      { duration: 15, modelVariant: 'wan-2.2', resolution: '580p', expectedStars: 300 },
      { duration: 5, modelVariant: 'wan-2.2', resolution: '720p', expectedStars: 134 },
      { duration: 10, modelVariant: 'wan-2.2', resolution: '720p', expectedStars: 268 },
      { duration: 15, modelVariant: 'wan-2.2', resolution: '720p', expectedStars: 402 },
      // WAN 2.5
      { duration: 5, modelVariant: 'wan-2.5', resolution: '720p', expectedStars: 100 },
      { duration: 10, modelVariant: 'wan-2.5', resolution: '720p', expectedStars: 200 },
      { duration: 15, modelVariant: 'wan-2.5', resolution: '720p', expectedStars: 300 },
      { duration: 5, modelVariant: 'wan-2.5', resolution: '1080p', expectedStars: 168 },
      { duration: 10, modelVariant: 'wan-2.5', resolution: '1080p', expectedStars: 335 },
      { duration: 15, modelVariant: 'wan-2.5', resolution: '1080p', expectedStars: 500 },
      // WAN 2.6
      { duration: 5, modelVariant: 'wan-2.6', resolution: '720p', expectedStars: 118 },
      { duration: 10, modelVariant: 'wan-2.6', resolution: '720p', expectedStars: 235 },
      { duration: 15, modelVariant: 'wan-2.6', resolution: '720p', expectedStars: 351 },
      { duration: 5, modelVariant: 'wan-2.6', resolution: '1080p', expectedStars: 175 },
      { duration: 10, modelVariant: 'wan-2.6', resolution: '1080p', expectedStars: 351 },
      { duration: 15, modelVariant: 'wan-2.6', resolution: '1080p', expectedStars: 528 },
    ],
  },
  {
    modelId: 'bytedance-pro',
    variants: [
      { duration: 5, resolution: '720p', expectedStars: 27 },
      { duration: 10, resolution: '720p', expectedStars: 61 },
      { duration: 5, resolution: '1080p', expectedStars: 61 },
      { duration: 10, resolution: '1080p', expectedStars: 121 },
    ],
  },
  {
    modelId: 'kling-ai-avatar',
    variants: [
      { duration: 5, resolution: '720p', expectedStars: 70 },
      { duration: 10, resolution: '720p', expectedStars: 140 },
      { duration: 15, resolution: '720p', expectedStars: 210 },
      { duration: 5, resolution: '1080p', expectedStars: 135 },
      { duration: 10, resolution: '1080p', expectedStars: 270 },
      { duration: 15, resolution: '1080p', expectedStars: 405 },
    ],
  },
];

function verifyPricing(): void {
  console.log('\n🔍 PRICING VERIFICATION REPORT\n');
  console.log('=' .repeat(80));
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const errors: string[] = [];
  
  for (const spec of EXPECTED_PRICING) {
    const model = getModelById(spec.modelId);
    
    if (!model) {
      errors.push(`❌ Model not found: ${spec.modelId}`);
      failedTests += spec.variants.length;
      totalTests += spec.variants.length;
      continue;
    }
    
    console.log(`\n📦 ${model.name} (${spec.modelId})`);
    console.log('-'.repeat(80));
    
    for (const variant of spec.variants) {
      totalTests++;
      
      const options: any = {};
      if (variant.quality) options.quality = variant.quality;
      if (variant.resolution) options.resolution = variant.resolution;
      if (variant.duration) options.duration = variant.duration;
      if (variant.audio !== undefined) options.audio = variant.audio;
      if (variant.modelVariant) options.modelVariant = variant.modelVariant;
      if (variant.videoQuality) options.videoQuality = variant.videoQuality;
      
      const result = computePrice(spec.modelId, options);
      const match = result.stars === variant.expectedStars;
      
      if (match) {
        passedTests++;
        console.log(`  ✅ ${JSON.stringify(options)} → ${result.stars}⭐`);
      } else {
        failedTests++;
        const error = `  ❌ ${JSON.stringify(options)} → Expected ${variant.expectedStars}⭐, got ${result.stars}⭐`;
        console.log(error);
        errors.push(`${model.name}: ${error}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 SUMMARY\n');
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`);
  
  if (errors.length > 0) {
    console.log('\n❌ ERRORS:\n');
    errors.forEach(err => console.log(err));
    process.exit(1);
  } else {
    console.log('\n✅ All pricing tests passed!\n');
    process.exit(0);
  }
}

// Print model summary
function printModelSummary(): void {
  console.log('\n📋 MODEL SUMMARY\n');
  console.log('='.repeat(80));
  
  console.log('\n🖼️  PHOTO MODELS:\n');
  PHOTO_MODELS.forEach(model => {
    console.log(`  • ${model.name} (${model.id})`);
    console.log(`    API: ${model.apiId}`);
    console.log(`    Featured: ${model.featured ? 'Yes' : 'No'}`);
    console.log(`    Variants: ${model.qualityOptions?.join(', ') || 'default'}`);
    console.log('');
  });
  
  console.log('\n🎬 VIDEO MODELS:\n');
  VIDEO_MODELS.forEach(model => {
    console.log(`  • ${model.name} (${model.id})`);
    console.log(`    API: ${model.apiId}`);
    console.log(`    Featured: ${model.featured ? 'Yes' : 'No'}`);
    console.log(`    Modes: ${model.modes.join(', ')}`);
    console.log(`    Durations: ${model.durationOptions.join(', ')}s`);
    if (model.modelVariants) {
      console.log(`    Variants: ${model.modelVariants.map(v => v.name).join(', ')}`);
    }
    console.log('');
  });
  
  console.log('='.repeat(80));
}

// Run verification
printModelSummary();
verifyPricing();

