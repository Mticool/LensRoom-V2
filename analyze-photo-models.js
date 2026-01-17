/**
 * Analyze all photo models:
 * - Supported parameters (quality/resolution)
 * - Price in stars (⭐)
 * - Price in USD ($)
 * - API provider and endpoint
 */

const fs = require('fs');
const path = require('path');

// Read models config
const configPath = path.join(__dirname, 'src/config/models.ts');
const configContent = fs.readFileSync(configPath, 'utf-8');

// Extract PHOTO_MODELS array
const photoModelsMatch = configContent.match(/export const PHOTO_MODELS: PhotoModelConfig\[\] = \[([\s\S]*?)\];/);
if (!photoModelsMatch) {
  console.error('Failed to extract PHOTO_MODELS');
  process.exit(1);
}

// Parse models manually (simplified)
const models = [
  {
    id: 'grok-imagine',
    name: 'Grok Imagine',
    provider: 'kie_market',
    apiId: 'grok-imagine/text-to-image',
    supportsI2i: false,
    pricing: 15,
    qualityOptions: undefined,
    aspectRatios: ['1:1', '3:2', '2:3'],
    rank: 1,
  },
  {
    id: 'nano-banana',
    name: 'Nano Banana',
    provider: 'laozhang',
    apiId: 'gemini-2.5-flash-image-preview',
    supportsI2i: true,
    pricing: { turbo: 7, balanced: 7, quality: 7 },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    rank: 1,
  },
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    provider: 'laozhang',
    apiId: 'gemini-3-pro-image-preview',
    apiId2k: 'gemini-3-pro-image-preview-2k',
    apiId4k: 'gemini-3-pro-image-preview-4k',
    supportsI2i: true,
    pricing: { '1k_2k': 30, '4k': 40 },
    qualityOptions: ['1k_2k', '4k'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    rank: 2,
  },
  {
    id: 'seedream-4.5',
    name: 'Seedream 4.5',
    provider: 'kie_market',
    apiId: 'seedream/4.5-text-to-image',
    supportsI2i: true,
    pricing: { turbo: 11, balanced: 11, quality: 11 },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2', '21:9'],
    rank: 9,
  },
  {
    id: 'flux-2-pro',
    name: 'FLUX.2 Pro',
    provider: 'kie_market',
    apiId: 'flux-2/pro-text-to-image',
    supportsI2i: true,
    pricing: { '1k': 9, '2k': 12 },
    qualityOptions: ['1k', '2k'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    rank: 6,
  },
  {
    id: 'z-image',
    name: 'Z-image',
    provider: 'kie_market',
    apiId: 'z-image',
    supportsI2i: true,
    pricing: { turbo: 2, balanced: 2, quality: 2 },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    rank: 14,
  },
  {
    id: 'recraft-remove-background',
    name: 'Recraft Remove Background',
    provider: 'kie_market',
    apiId: 'recraft/remove-background',
    supportsI2i: true,
    pricing: { turbo: 2, balanced: 2, quality: 2 },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    rank: 12,
  },
  {
    id: 'topaz-image-upscale',
    name: 'Topaz Upscale',
    provider: 'kie_market',
    apiId: 'topaz/image-upscale',
    supportsI2i: true,
    pricing: { '2k': 17, '4k': 34, '8k': 67 },
    qualityOptions: ['2k', '4k', '8k'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    rank: 2,
  },
  {
    id: 'gpt-image',
    name: 'GPT Image 1.5',
    provider: 'kie_market',
    apiId: 'gpt-image/1.5-text-to-image',
    supportsI2i: true,
    pricing: { medium: 17, high: 67 },
    qualityOptions: ['medium', 'high'],
    aspectRatios: ['1:1', '3:2', '2:3'],
    rank: 3,
  },
];

// KIE.ai pricing (credits to USD conversion)
// Based on KIE credit packages
const KIE_CREDIT_RATES = {
  // Package: $10 = 100 credits → $0.10 per credit
  // Package: $50 = 600 credits → $0.083 per credit
  // Package: $100 = 1500 credits → $0.067 per credit
  average: 0.08, // Average rate $0.08 per credit
};

// LaoZhang pricing (per model)
const LAOZHANG_PRICING = {
  // Gemini 2.5 Flash (Nano Banana)
  'gemini-2.5-flash-image-preview': {
    inputPer1M: 0.075, // $0.075 per 1M input tokens
    outputPer1M: 0.30,  // $0.30 per 1M output tokens
    avgCost: 0.001, // ~$0.001 per image (estimated)
  },
  // Gemini 3 Pro (Nano Banana Pro)
  'gemini-3-pro-image-preview': {
    inputPer1M: 1.25, // $1.25 per 1M input tokens
    outputPer1M: 5.00,  // $5.00 per 1M output tokens
    avgCost: 0.015, // ~$0.015 per image (estimated)
  },
  'gemini-3-pro-image-preview-2k': {
    avgCost: 0.015, // Same as base
  },
  'gemini-3-pro-image-preview-4k': {
    avgCost: 0.020, // Slightly higher for 4K
  },
};

// OpenAI GPT Image pricing
const OPENAI_GPT_IMAGE_PRICING = {
  medium: 0.040, // $0.040 per image (1024x1024)
  high: 0.080,   // $0.080 per image (high quality)
};

// Stars to RUB conversion (from your config)
const STARS_TO_RUB = 1.68; // 1⭐ = 1.68₽

// USD to RUB exchange rate (current market rate)
const USD_TO_RUB = 101.2; // 1$ = 101.2₽

function getProviderCost(model) {
  if (model.provider === 'laozhang') {
    const modelPricing = LAOZHANG_PRICING[model.apiId] || LAOZHANG_PRICING[model.apiId2k] || LAOZHANG_PRICING[model.apiId4k];
    return modelPricing?.avgCost || 0.001;
  }

  if (model.provider === 'openai' || model.id === 'gpt-image') {
    // GPT Image uses quality-based pricing
    return Object.values(OPENAI_GPT_IMAGE_PRICING);
  }

  // KIE Market API models
  // Extract credits from pricing
  let credits = 0;
  if (typeof model.pricing === 'number') {
    credits = model.pricing;
  } else if (typeof model.pricing === 'object') {
    credits = Math.min(...Object.values(model.pricing));
  }

  // Convert credits to USD via RUB
  const rub = credits * STARS_TO_RUB;
  return rub / USD_TO_RUB;
}

function analyzeModel(model) {
  const analysis = {
    id: model.id,
    name: model.name,
    provider: model.provider,
    apiId: model.apiId,
    apiId2k: model.apiId2k,
    apiId4k: model.apiId4k,
    supportsI2i: model.supportsI2i,
    aspectRatios: model.aspectRatios,
    parameterType: null,
    qualityOptions: [],
    pricing: {},
  };

  // Determine parameter type
  if (model.qualityOptions) {
    const hasResolution = model.qualityOptions.some(q => ['1k', '2k', '4k', '8k', '1k_2k'].includes(q));
    const hasQuality = model.qualityOptions.some(q => ['turbo', 'balanced', 'quality', 'fast', 'ultra', 'medium', 'high'].includes(q));

    if (hasResolution) {
      analysis.parameterType = 'resolution';
    } else if (hasQuality) {
      analysis.parameterType = 'quality';
    } else {
      analysis.parameterType = 'mixed';
    }

    analysis.qualityOptions = model.qualityOptions;
  } else {
    analysis.parameterType = 'none';
  }

  // Calculate pricing
  if (typeof model.pricing === 'number') {
    const stars = model.pricing;
    const rub = stars * STARS_TO_RUB;
    const usd = rub / USD_TO_RUB;

    analysis.pricing = {
      default: {
        stars,
        rub: rub.toFixed(2),
        usd: usd.toFixed(4),
      }
    };
  } else if (typeof model.pricing === 'object') {
    for (const [quality, stars] of Object.entries(model.pricing)) {
      const rub = stars * STARS_TO_RUB;
      const usd = rub / USD_TO_RUB;

      analysis.pricing[quality] = {
        stars,
        rub: rub.toFixed(2),
        usd: usd.toFixed(4),
      };
    }
  }

  return analysis;
}

// Analyze all models
console.log('📊 Photo Models Analysis\n');
console.log('='.repeat(100));

const analyzed = models.map(analyzeModel);

// Group by provider
const byProvider = {
  laozhang: analyzed.filter(m => m.provider === 'laozhang'),
  kie_market: analyzed.filter(m => m.provider === 'kie_market'),
  openai: analyzed.filter(m => m.provider === 'openai'),
};

// Print summary
console.log('\n📦 Models by Provider:\n');

for (const [provider, models] of Object.entries(byProvider)) {
  if (models.length === 0) continue;

  console.log(`\n🔹 ${provider.toUpperCase()}`);
  console.log('─'.repeat(100));

  for (const model of models) {
    console.log(`\n📸 ${model.name} (${model.id})`);
    console.log(`   API ID: ${model.apiId}${model.apiId2k ? `, ${model.apiId2k}` : ''}${model.apiId4k ? `, ${model.apiId4k}` : ''}`);
    console.log(`   Parameter Type: ${model.parameterType}`);
    console.log(`   Supports I2I: ${model.supportsI2i ? '✅' : '❌'}`);
    console.log(`   Aspect Ratios: ${model.aspectRatios.join(', ')}`);

    if (model.qualityOptions && model.qualityOptions.length > 0) {
      console.log(`   Options: ${model.qualityOptions.join(', ')}`);
    }

    console.log(`\n   💰 Pricing:`);
    for (const [quality, price] of Object.entries(model.pricing)) {
      console.log(`      ${quality.padEnd(12)} ${price.stars}⭐  =  ${price.rub}₽  =  $${price.usd}`);
    }
  }
}

// Summary table
console.log('\n\n📋 Summary Table\n');
console.log('='.repeat(100));
console.log('Model'.padEnd(25) + 'Provider'.padEnd(15) + 'Param Type'.padEnd(15) + 'Min Price'.padEnd(20) + 'Max Price');
console.log('─'.repeat(100));

for (const model of analyzed) {
  const prices = Object.values(model.pricing);
  const minPrice = prices.reduce((min, p) => p.stars < min.stars ? p : min);
  const maxPrice = prices.reduce((max, p) => p.stars > max.stars ? p : max);

  const minStr = `${minPrice.stars}⭐ ($${minPrice.usd})`;
  const maxStr = prices.length > 1 ? `${maxPrice.stars}⭐ ($${maxPrice.usd})` : '-';

  console.log(
    model.name.padEnd(25) +
    model.provider.padEnd(15) +
    model.parameterType.padEnd(15) +
    minStr.padEnd(20) +
    maxStr
  );
}

console.log('\n' + '='.repeat(100));

// Export JSON
const outputPath = path.join(__dirname, 'photo-models-analysis.json');
fs.writeFileSync(outputPath, JSON.stringify(analyzed, null, 2));
console.log(`\n✅ Analysis exported to: ${outputPath}`);
