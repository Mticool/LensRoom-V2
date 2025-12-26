/**
 * Скрипт для проверки всех моделей через KIE API
 * Usage: npx tsx scripts/test-all-models-api.ts
 */

import { PHOTO_MODELS, VIDEO_MODELS } from '../src/config/models';
import type { PhotoModelConfig, VideoModelConfig, VideoModelVariant } from '../src/config/models';

// Цвета для вывода
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

interface TestResult {
  id: string;
  name: string;
  apiId: string;
  type: 'photo' | 'video';
  provider: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  hasI2v?: boolean;
  variants?: string[];
}

// Проверка API ID на валидность формата
function validateApiId(apiId: string): { valid: boolean; message: string } {
  if (!apiId || apiId.trim() === '') {
    return { valid: false, message: 'API ID пустой' };
  }

  // Проверка базового формата
  const validPatterns = [
    /^[a-z0-9\-\.]+\/[a-z0-9\-\.]+$/, // provider/model-name (с точками для версий)
    /^[a-z0-9\-]+$/, // simple name (veo3, z-image)
  ];

  const isValid = validPatterns.some((pattern) => pattern.test(apiId));

  if (!isValid) {
    return { valid: false, message: 'Некорректный формат API ID' };
  }

  return { valid: true, message: 'Формат OK' };
}

// Проверка фото-модели
function testPhotoModel(model: PhotoModelConfig): TestResult {
  const validation = validateApiId(model.apiId);

  let status: 'ok' | 'warning' | 'error' = validation.valid ? 'ok' : 'error';
  let message = validation.message;

  // Дополнительные проверки
  const warnings: string[] = [];

  if (!model.pricing || (typeof model.pricing === 'object' && Object.keys(model.pricing).length === 0)) {
    warnings.push('отсутствует pricing');
    status = 'error';
  }

  if (model.supportsI2i && !model.apiId.includes('image-to-image') && !model.apiId.includes('i2i')) {
    warnings.push('supportsI2i=true но API ID не содержит i2i');
  }

  if (!model.aspectRatios || model.aspectRatios.length === 0) {
    warnings.push('нет aspect ratios');
    status = status === 'ok' ? 'warning' : status;
  }

  if (warnings.length > 0) {
    message += ` (${warnings.join(', ')})`;
  }

  return {
    id: model.id,
    name: model.name,
    apiId: model.apiId,
    type: 'photo',
    provider: model.provider,
    status,
    message,
  };
}

// Проверка видео-модели
function testVideoModel(model: VideoModelConfig): TestResult {
  const validation = validateApiId(model.apiId);

  let status: 'ok' | 'warning' | 'error' = validation.valid ? 'ok' : 'error';
  let message = validation.message;

  // Проверка вариантов
  const variantNames: string[] = [];
  if (model.modelVariants && model.modelVariants.length > 0) {
    for (const variant of model.modelVariants) {
      variantNames.push(variant.name);
      const varValidation = validateApiId(variant.apiId);
      if (!varValidation.valid) {
        status = 'error';
        message += ` | Вариант "${variant.name}": ${varValidation.message}`;
      }
    }
  }

  // Дополнительные проверки
  const warnings: string[] = [];

  if (!model.pricing || (typeof model.pricing === 'object' && Object.keys(model.pricing).length === 0)) {
    warnings.push('отсутствует pricing');
    status = 'error';
  }

  if (model.supportsI2v && !model.apiIdI2v) {
    warnings.push('supportsI2v=true но нет apiIdI2v');
    status = status === 'ok' ? 'warning' : status;
  }

  // Note: audioToggle is optional, supportsAudio just indicates audio capability exists

  if (warnings.length > 0) {
    message += ` (${warnings.join(', ')})`;
  }

  return {
    id: model.id,
    name: model.name,
    apiId: model.apiId,
    type: 'video',
    provider: model.provider,
    status,
    message,
    hasI2v: !!model.apiIdI2v,
    variants: variantNames.length > 0 ? variantNames : undefined,
  };
}

// Главная функция
async function main() {
  console.log(`${colors.bold}${colors.blue}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('   ПРОВЕРКА ВСЕХ МОДЕЛЕЙ - API ENDPOINTS');
  console.log('═══════════════════════════════════════════════════════');
  console.log(colors.reset);

  const results: TestResult[] = [];

  // Проверка фото-моделей
  console.log(`\n${colors.bold}📸 ФОТО-МОДЕЛИ (${PHOTO_MODELS.length})${colors.reset}\n`);

  for (const model of PHOTO_MODELS) {
    const result = testPhotoModel(model);
    results.push(result);

    const statusColor = result.status === 'ok' ? colors.green : result.status === 'warning' ? colors.yellow : colors.red;
    const statusIcon = result.status === 'ok' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';

    console.log(
      `${statusIcon} ${colors.bold}${model.name}${colors.reset}` +
        `\n   ID: ${model.id}` +
        `\n   API: ${colors.blue}${model.apiId}${colors.reset}` +
        `\n   Provider: ${model.provider}` +
        `\n   Status: ${statusColor}${result.message}${colors.reset}` +
        `\n`
    );
  }

  // Проверка видео-моделей
  console.log(`\n${colors.bold}🎥 ВИДЕО-МОДЕЛИ (${VIDEO_MODELS.length})${colors.reset}\n`);

  for (const model of VIDEO_MODELS) {
    const result = testVideoModel(model);
    results.push(result);

    const statusColor = result.status === 'ok' ? colors.green : result.status === 'warning' ? colors.yellow : colors.red;
    const statusIcon = result.status === 'ok' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';

    console.log(
      `${statusIcon} ${colors.bold}${model.name}${colors.reset}` +
        `\n   ID: ${model.id}` +
        `\n   API T2V: ${colors.blue}${model.apiId}${colors.reset}` +
        (model.apiIdI2v ? `\n   API I2V: ${colors.blue}${model.apiIdI2v}${colors.reset}` : '') +
        (result.variants ? `\n   Варианты: ${result.variants.join(', ')}` : '') +
        `\n   Provider: ${model.provider}` +
        `\n   Status: ${statusColor}${result.message}${colors.reset}` +
        `\n`
    );
  }

  // Статистика
  console.log(`\n${colors.bold}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}📊 СТАТИСТИКА${colors.reset}\n`);

  const totalModels = results.length;
  const okCount = results.filter((r) => r.status === 'ok').length;
  const warningCount = results.filter((r) => r.status === 'warning').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  const photoCount = results.filter((r) => r.type === 'photo').length;
  const videoCount = results.filter((r) => r.type === 'video').length;

  console.log(`Всего моделей: ${colors.bold}${totalModels}${colors.reset}`);
  console.log(`  - Фото: ${photoCount}`);
  console.log(`  - Видео: ${videoCount}`);
  console.log('');
  console.log(`${colors.green}✅ OK: ${okCount}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Warnings: ${warningCount}${colors.reset}`);
  console.log(`${colors.red}❌ Errors: ${errorCount}${colors.reset}`);

  // Список уникальных API endpoints
  console.log(`\n${colors.bold}🔗 УНИКАЛЬНЫЕ API ENDPOINTS${colors.reset}\n`);

  const uniqueApiIds = new Set<string>();
  results.forEach((r) => uniqueApiIds.add(r.apiId));

  // Добавляем I2V endpoints
  VIDEO_MODELS.forEach((model) => {
    if (model.apiIdI2v) uniqueApiIds.add(model.apiIdI2v);
    if (model.modelVariants) {
      model.modelVariants.forEach((v) => {
        uniqueApiIds.add(v.apiId);
        if (v.apiIdI2v) uniqueApiIds.add(v.apiIdI2v);
      });
    }
  });

  const sortedApiIds = Array.from(uniqueApiIds).sort();
  sortedApiIds.forEach((apiId, index) => {
    console.log(`${index + 1}. ${colors.blue}${apiId}${colors.reset}`);
  });

  console.log(`\n${colors.bold}Всего уникальных endpoints: ${sortedApiIds.length}${colors.reset}`);

  // Результат
  console.log(`\n${colors.bold}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);

  if (errorCount === 0 && warningCount === 0) {
    console.log(`${colors.bold}${colors.green}✅ ВСЕ МОДЕЛИ ПРОШЛИ ПРОВЕРКУ!${colors.reset}\n`);
    process.exit(0);
  } else if (errorCount > 0) {
    console.log(`${colors.bold}${colors.red}❌ НАЙДЕНЫ ОШИБКИ (${errorCount})${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.bold}${colors.yellow}⚠️  ЕСТЬ ПРЕДУПРЕЖДЕНИЯ (${warningCount})${colors.reset}\n`);
    process.exit(0);
  }
}

// Запуск
main().catch((error) => {
  console.error(`${colors.red}${colors.bold}Ошибка:${colors.reset}`, error);
  process.exit(1);
});

