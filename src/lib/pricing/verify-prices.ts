/**
 * DEV-утилита для проверки цен моделей
 * 
 * Запуск: npx ts-node --skip-project src/lib/pricing/verify-prices.ts
 * или импортировать в консоли браузера через: import { logAllPrices } from '@/lib/pricing/verify-prices'
 * 
 * Проверяет соответствие цен юнит-экономике:
 * - Nano Banana: 7⭐
 * - Veo Fast 8s: 99⭐, Quality 8s: 490⭐
 * - Kling 2.5 Turbo: 5s=105⭐, 10s=210⭐
 * - Kling 2.6 Audio: 5s=135⭐, 10s=270⭐
 * - Kling 2.1 Pro: 5s=200⭐, 10s=400⭐
 */

import { computePrice, PriceOptions } from './compute-price';
import { STAR_PACKS, REFERENCE_PRICES, calculateEquivalents } from '@/config/pricing';

// Ожидаемые цены по юнит-экономике
const EXPECTED_PRICES = {
  // Фото
  'nano-banana': { options: { quality: 'turbo' }, expected: 7 },
  'nano-banana-pro-1k2k': { modelId: 'nano-banana-pro', options: { quality: '1k_2k' }, expected: 30 },
  'nano-banana-pro-4k': { modelId: 'nano-banana-pro', options: { quality: '4k' }, expected: 40 },
  'flux-2-pro-1k': { modelId: 'flux-2-pro', options: { quality: '1k' }, expected: 9 },
  'flux-2-pro-2k': { modelId: 'flux-2-pro', options: { quality: '2k' }, expected: 12 },
  'gpt-image-medium': { modelId: 'gpt-image', options: { quality: 'medium' }, expected: 17 },
  'gpt-image-high': { modelId: 'gpt-image', options: { quality: 'high' }, expected: 67 },
  'z-image': { options: { quality: 'turbo' }, expected: 2 },
  'seedream-4.5': { options: { quality: 'turbo' }, expected: 11 },
  
  // Видео - Veo
  'veo-fast-8s': { modelId: 'veo-3.1', options: { videoQuality: 'fast', duration: 8 }, expected: 99 },
  'veo-quality-8s': { modelId: 'veo-3.1', options: { videoQuality: 'quality', duration: 8 }, expected: 490 },
  
  // Видео - Kling 2.5 Turbo
  'kling-25-turbo-5s': { modelId: 'kling', options: { modelVariant: 'kling-2.5-turbo', duration: 5, audio: false }, expected: 105 },
  'kling-25-turbo-10s': { modelId: 'kling', options: { modelVariant: 'kling-2.5-turbo', duration: 10, audio: false }, expected: 210 },
  
  // Видео - Kling 2.6 Audio
  'kling-26-audio-5s': { modelId: 'kling', options: { modelVariant: 'kling-2.6', duration: 5, audio: true }, expected: 135 },
  'kling-26-audio-10s': { modelId: 'kling', options: { modelVariant: 'kling-2.6', duration: 10, audio: true }, expected: 270 },
  'kling-26-noaudio-5s': { modelId: 'kling', options: { modelVariant: 'kling-2.6', duration: 5, audio: false }, expected: 105 },
  'kling-26-noaudio-10s': { modelId: 'kling', options: { modelVariant: 'kling-2.6', duration: 10, audio: false }, expected: 210 },
  
  // Видео - Kling 2.1 Pro
  'kling-21-pro-5s': { modelId: 'kling', options: { modelVariant: 'kling-2.1', duration: 5, audio: false }, expected: 200 },
  'kling-21-pro-10s': { modelId: 'kling', options: { modelVariant: 'kling-2.1', duration: 10, audio: false }, expected: 400 },
  
  // Видео - Kling O1
  'kling-o1-5s': { modelId: 'kling-o1', options: { duration: 5 }, expected: 56 },
  'kling-o1-10s': { modelId: 'kling-o1', options: { duration: 10 }, expected: 112 },
  
  // Видео - Sora
  'sora-2-10s': { modelId: 'sora-2', options: { duration: 10 }, expected: 50 },
  'sora-2-pro-standard-10s': { modelId: 'sora-2-pro', options: { videoQuality: 'standard', duration: 10 }, expected: 250 },
  'sora-2-pro-high-10s': { modelId: 'sora-2-pro', options: { videoQuality: 'high', duration: 10 }, expected: 550 },
} as const;

// Ожидаемые пакеты
const EXPECTED_PACKS = {
  'mini': { price: 990, stars: 1400 },
  'plus': { price: 1490, stars: 2200 },
  'max': { price: 1990, stars: 3000 },
  'ultra': { price: 4990, stars: 7600 },
};

interface PriceCheckResult {
  key: string;
  modelId: string;
  options: PriceOptions;
  expected: number;
  actual: number;
  match: boolean;
}

interface PackCheckResult {
  id: string;
  expectedPrice: number;
  actualPrice: number;
  expectedStars: number;
  actualStars: number;
  priceMatch: boolean;
  starsMatch: boolean;
}

/**
 * Проверить все цены моделей
 */
export function verifyModelPrices(): PriceCheckResult[] {
  const results: PriceCheckResult[] = [];
  
  for (const [key, config] of Object.entries(EXPECTED_PRICES)) {
    const modelId = 'modelId' in config ? config.modelId : key;
    const computed = computePrice(modelId, config.options as PriceOptions);
    
    results.push({
      key,
      modelId,
      options: config.options as PriceOptions,
      expected: config.expected,
      actual: computed.stars,
      match: computed.stars === config.expected,
    });
  }
  
  return results;
}

/**
 * Проверить все пакеты звёзд
 */
export function verifyStarPacks(): PackCheckResult[] {
  const results: PackCheckResult[] = [];
  
  for (const [id, expected] of Object.entries(EXPECTED_PACKS)) {
    const actual = STAR_PACKS.find(p => p.id === id);
    
    results.push({
      id,
      expectedPrice: expected.price,
      actualPrice: actual?.price || 0,
      expectedStars: expected.stars,
      actualStars: actual?.stars || 0,
      priceMatch: actual?.price === expected.price,
      starsMatch: actual?.stars === expected.stars,
    });
  }
  
  return results;
}

/**
 * Вывести все цены в консоль (для dev)
 */
export function logAllPrices(): void {
  console.log('\n=== 🔍 ПРОВЕРКА ЦЕН LENSROOM ===\n');
  
  // 1. Проверка моделей
  console.log('📸 МОДЕЛИ:');
  console.log('─'.repeat(80));
  
  const modelResults = verifyModelPrices();
  let modelErrors = 0;
  
  for (const r of modelResults) {
    const status = r.match ? '✅' : '❌';
    const options = JSON.stringify(r.options);
    console.log(`${status} ${r.key.padEnd(25)} | ${r.modelId.padEnd(15)} | ${options.padEnd(40)} | ${r.actual}⭐ (ожид: ${r.expected}⭐)`);
    if (!r.match) modelErrors++;
  }
  
  console.log('─'.repeat(80));
  console.log(`Итого: ${modelResults.length} проверок, ${modelErrors} ошибок\n`);
  
  // 2. Проверка пакетов
  console.log('💰 ПАКЕТЫ ЗВЁЗД:');
  console.log('─'.repeat(60));
  
  const packResults = verifyStarPacks();
  let packErrors = 0;
  
  for (const r of packResults) {
    const status = r.priceMatch && r.starsMatch ? '✅' : '❌';
    console.log(`${status} Pack ${r.id.padEnd(8)} | ${r.actualPrice}₽ (ожид: ${r.expectedPrice}₽) | ${r.actualStars}⭐ (ожид: ${r.expectedStars}⭐)`);
    if (!r.priceMatch || !r.starsMatch) packErrors++;
  }
  
  console.log('─'.repeat(60));
  console.log(`Итого: ${packResults.length} пакетов, ${packErrors} ошибок\n`);
  
  // 3. Reference prices
  console.log('📊 REFERENCE_PRICES (для эквивалентов):');
  console.log('─'.repeat(40));
  for (const [key, value] of Object.entries(REFERENCE_PRICES)) {
    console.log(`  ${key.padEnd(20)} = ${value}⭐`);
  }
  
  // 4. Эквиваленты для пакетов
  console.log('\n📦 ЭКВИВАЛЕНТЫ ГЕНЕРАЦИЙ:');
  console.log('─'.repeat(60));
  for (const pack of STAR_PACKS) {
    const eq = calculateEquivalents(pack.stars);
    console.log(`Pack ${pack.id} (${pack.stars}⭐):`);
    console.log(`  ~${eq.banana} Banana | ~${eq.veoFast} Veo Fast | ~${eq.klingTurbo5s} Kling 5s`);
  }
  
  // Итоговый статус
  console.log('\n' + '='.repeat(80));
  if (modelErrors === 0 && packErrors === 0) {
    console.log('✅ ВСЕ ЦЕНЫ СООТВЕТСТВУЮТ ЮНИТ-ЭКОНОМИКЕ!');
  } else {
    console.log(`❌ НАЙДЕНЫ РАСХОЖДЕНИЯ: ${modelErrors + packErrors} ошибок`);
  }
  console.log('='.repeat(80) + '\n');
}

/**
 * Экспорт для использования в тестах
 */
export const priceVerification = {
  verifyModelPrices,
  verifyStarPacks,
  logAllPrices,
  EXPECTED_PRICES,
  EXPECTED_PACKS,
};

// Если запущен напрямую
if (typeof window === 'undefined' && require.main === module) {
  logAllPrices();
}







