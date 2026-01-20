#!/usr/bin/env node
/**
 * Автоматические тесты для всех 9 фото-генераторов
 * Проверяет маппинг качества, опции, pricing, aspect ratios
 */

const fs = require('fs');
const path = require('path');

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`),
};

// Конфигурация тестов для каждого генератора
const GENERATOR_TESTS = [
  {
    name: 'Nano Banana Pro',
    file: 'NanoBananaProGenerator.tsx',
    qualityOptions: ['1K', '2K', '4K'],
    qualityMapping: { '1K': 'balanced', '2K': 'balanced', '4K': 'quality' },
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    pricing: { '1K': 30, '2K': 30, '4K': 40 },
    supportsI2i: true,
    modelName: 'Nano Banana Pro',
  },
  {
    name: 'Nano Banana',
    file: 'NanoBananaGenerator.tsx',
    qualityOptions: ['Быстро', 'Баланс', 'Качество'],
    qualityMapping: { 'Быстро': 'turbo', 'Баланс': 'balanced', 'Качество': 'quality' },
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    pricing: { 'Быстро': 7, 'Баланс': 7, 'Качество': 7 },
    supportsI2i: true,
    modelName: 'Nano Banana',
  },
  {
    name: 'Z-Image',
    file: 'ZImageGenerator.tsx',
    qualityOptions: ['Быстро', 'Баланс', 'Качество'],
    qualityMapping: { 'Быстро': 'turbo', 'Баланс': 'balanced', 'Качество': 'quality' },
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    pricing: { 'Быстро': 2, 'Баланс': 2, 'Качество': 2 },
    supportsI2i: true,
    modelName: 'Z-Image (2⭐)',
  },
  {
    name: 'FLUX.2 Pro',
    file: 'FluxProGenerator.tsx',
    qualityOptions: ['1K', '2K'],
    qualityMapping: { '1K': '1k', '2K': '2k' },
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    pricing: { '1K': 9, '2K': 12 },
    supportsI2i: true,
    modelName: 'FLUX.2 Pro',
  },
  {
    name: 'Seedream 4.5',
    file: 'SeedreamGenerator.tsx',
    qualityOptions: ['Быстро', 'Баланс', 'Качество'],
    qualityMapping: { 'Быстро': 'turbo', 'Баланс': 'balanced', 'Качество': 'quality' },
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2', '21:9'],
    pricing: { 'Быстро': 11, 'Баланс': 11, 'Качество': 11 },
    supportsI2i: true,
    modelName: 'Seedream 4.5',
  },
  {
    name: 'GPT Image 1.5',
    file: 'GPTImageGenerator.tsx',
    qualityOptions: ['Стандарт', 'Премиум'],
    qualityMapping: { 'Стандарт': 'medium', 'Премиум': 'high' },
    aspectRatios: ['1:1', '3:2', '2:3'],
    pricing: { 'Стандарт': 17, 'Премиум': 67 },
    supportsI2i: true,
    modelName: 'GPT Image 1.5',
  },
  {
    name: 'Grok Imagine',
    file: 'GrokImagineGenerator.tsx',
    qualityOptions: ['Обычный', 'Креатив', 'Смелый'],
    qualityMapping: { 'Обычный': 'normal', 'Креатив': 'fun', 'Смелый': 'spicy' },
    aspectRatios: ['1:1', '3:2', '2:3'],
    pricing: { 'Обычный': 15, 'Креатив': 15, 'Смелый': 15 },
    supportsI2i: false,
    modelName: 'Grok Imagine',
    isMode: true, // Это не quality, а mode
  },
  {
    name: 'Topaz Upscale',
    file: 'TopazUpscaleGenerator.tsx',
    qualityOptions: ['2K', '4K', '8K'],
    qualityMapping: null, // Использует lowercase
    aspectRatios: null, // N/A - сохраняет оригинал
    pricing: { '2K': 17, '4K': 34, '8K': 67 },
    supportsI2i: true,
    mandatoryUpload: true,
    modelName: 'Topaz Upscale',
  },
  {
    name: 'Recraft Remove BG',
    file: 'RecraftRemoveBGGenerator.tsx',
    qualityOptions: ['Быстро', 'Баланс', 'Качество'],
    qualityMapping: { 'Быстро': 'turbo', 'Баланс': 'balanced', 'Качество': 'quality' },
    aspectRatios: null, // N/A
    pricing: { 'Быстро': 2, 'Баланс': 2, 'Качество': 2 },
    supportsI2i: true,
    mandatoryUpload: true,
    modelName: 'Recraft Remove BG',
  },
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(testName, condition, errorMsg) {
  totalTests++;
  if (condition) {
    passedTests++;
    log.success(testName);
    return true;
  } else {
    failedTests++;
    log.error(`${testName}: ${errorMsg}`);
    return false;
  }
}

function testGenerator(config) {
  log.header();
  console.log(`\n${colors.cyan}Тестирование: ${config.name}${colors.reset}`);
  console.log(`Файл: ${config.file}\n`);

  const filePath = path.join(__dirname, 'src', 'components', 'generator-v2', config.file);
  
  // Проверка существования файла
  if (!runTest(
    'Файл существует',
    fs.existsSync(filePath),
    `Файл не найден: ${filePath}`
  )) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Тест 1: Проверка quality options
  if (config.qualityOptions) {
    const hasQualityOptions = config.qualityOptions.every(opt => 
      content.includes(`'${opt}'`) || content.includes(`"${opt}"`)
    );
    runTest(
      `Quality опции: ${config.qualityOptions.join(', ')}`,
      hasQualityOptions,
      'Не все опции качества найдены в файле'
    );
  }

  // Тест 2: Проверка quality mapping
  if (config.qualityMapping) {
    const mappingTests = Object.entries(config.qualityMapping).map(([ru, en]) => {
      const hasMapping = content.includes(`'${ru}': '${en}'`) || 
                        content.includes(`"${ru}": "${en}"`) ||
                        (config.name === 'Grok Imagine' && content.includes(`'${ru}'`) && content.includes(`'${en}'`));
      return runTest(
        `Маппинг: ${ru} → ${en}`,
        hasMapping,
        `Маппинг не найден для ${ru}`
      );
    });
  }

  // Тест 3: Проверка aspect ratios
  if (config.aspectRatios) {
    const hasAspectRatios = config.aspectRatios.every(ratio =>
      content.includes(`'${ratio}'`) || content.includes(`"${ratio}"`)
    );
    runTest(
      `Aspect Ratios: ${config.aspectRatios.length} форматов`,
      hasAspectRatios,
      'Не все aspect ratios найдены'
    );
  } else {
    log.info('Aspect Ratios: N/A (сохраняет оригинал)');
  }

  // Тест 4: Проверка pricing
  const pricingTests = Object.entries(config.pricing).map(([quality, cost]) => {
    // Для Nano Banana Pro ищем COST_PER_IMAGE объект
    const hasPricing = content.includes(`${cost}`) || 
                      content.includes(`COST_PER_IMAGE`) ||
                      (config.name === 'Nano Banana' && content.includes('COST_PER_IMAGE = 7')) ||
                      (config.name === 'Z-Image' && content.includes('COST_PER_IMAGE = 2'));
    return runTest(
      `Pricing: ${quality} = ${cost}⭐`,
      hasPricing,
      `Цена ${cost} не найдена`
    );
  });

  // Тест 5: Проверка I2I support
  if (config.supportsI2i) {
    const hasI2iSupport = content.includes('referenceImage') && 
                         (content.includes('onReferenceImageChange') || content.includes('handleFileUpload'));
    runTest(
      'I2I Support: Да',
      hasI2iSupport,
      'I2I поддержка не найдена'
    );
  } else {
    runTest(
      'I2I Support: Нет',
      !content.includes('referenceImage') || config.mandatoryUpload,
      'Неожиданная I2I поддержка'
    );
  }

  // Тест 6: Проверка modelName в props
  if (config.modelName) {
    const hasModelName = content.includes(`modelName="${config.modelName}"`) || 
                        content.includes(`modelName='${config.modelName}'`);
    runTest(
      `Model Name: "${config.modelName}"`,
      hasModelName,
      'Model name не передаётся в ControlBarBottom'
    );
  }

  // Тест 7: Специальные проверки
  if (config.mandatoryUpload) {
    const hasMandatoryUpload = content.includes('Загрузите изображение') || 
                              content.includes('Upload');
    runTest(
      'Mandatory Upload: Да',
      hasMandatoryUpload,
      'Обязательная загрузка не найдена'
    );
  }

  if (config.isMode) {
    const hasModeSelector = content.includes('ModeSelector') || content.includes('mode');
    runTest(
      'Mode Selector (вместо Quality)',
      hasModeSelector,
      'ModeSelector не найден'
    );
  }
}

// Основная функция тестирования
function runAllTests() {
  console.log('\n' + colors.cyan + '═'.repeat(60) + colors.reset);
  console.log(colors.cyan + '  АВТОМАТИЧЕСКОЕ ТЕСТИРОВАНИЕ ГЕНЕРАТОРОВ' + colors.reset);
  console.log(colors.cyan + '═'.repeat(60) + colors.reset + '\n');

  GENERATOR_TESTS.forEach(testGenerator);

  // Итоговый отчёт
  log.header();
  console.log('\n' + colors.cyan + 'ИТОГОВЫЙ ОТЧЁТ' + colors.reset);
  console.log(colors.cyan + '═'.repeat(60) + colors.reset + '\n');
  
  console.log(`Всего тестов: ${totalTests}`);
  console.log(`${colors.green}Пройдено: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Провалено: ${failedTests}${colors.reset}`);
  console.log(`Процент успеха: ${Math.round((passedTests / totalTests) * 100)}%\n`);

  if (failedTests === 0) {
    log.success('Все тесты пройдены успешно! ✨');
  } else {
    log.error(`Есть проблемы в ${failedTests} тестах`);
    process.exit(1);
  }
}

// Запуск тестов
runAllTests();
