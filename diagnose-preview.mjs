#!/usr/bin/env node
/**
 * Диагностика системы превью
 * Проверяет что всё настроено правильно
 */

import { readFileSync, existsSync } from 'fs';
import { spawn } from 'child_process';

console.log('🔍 Диагностика Системы Превью');
console.log('='.repeat(60));

// 1. Проверка файлов
console.log('\n📁 Проверка файлов...');
const files = [
  'src/lib/previews/index.ts',
  'supabase/migrations/025_preview_system.sql',
  'package.json'
];

let allFilesExist = true;
files.forEach(file => {
  if (existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - НЕ НАЙДЕН!`);
    allFilesExist = false;
  }
});

// 2. Проверка зависимостей
console.log('\n📦 Проверка зависимостей...');
try {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  
  if (deps.sharp) {
    console.log(`✅ sharp: ${deps.sharp}`);
  } else {
    console.log('❌ sharp - НЕ УСТАНОВЛЕН!');
  }
  
  if (deps['fluent-ffmpeg']) {
    console.log(`✅ fluent-ffmpeg: ${deps['fluent-ffmpeg']}`);
  } else {
    console.log('❌ fluent-ffmpeg - НЕ УСТАНОВЛЕН!');
  }
} catch (e) {
  console.log('❌ Ошибка чтения package.json');
}

// 3. Проверка FFmpeg
console.log('\n📹 Проверка FFmpeg...');
const ffmpegCheck = spawn('ffmpeg', ['-version']);
let ffmpegWorks = false;

ffmpegCheck.on('close', (code) => {
  if (code === 0) {
    console.log('✅ FFmpeg установлен и работает');
    ffmpegWorks = true;
  } else {
    console.log('❌ FFmpeg не работает!');
  }
});

ffmpegCheck.on('error', () => {
  console.log('❌ FFmpeg не найден!');
  console.log('   Установите: brew install ffmpeg');
});

// 4. Проверка сервера
console.log('\n🌐 Проверка сервера...');
setTimeout(async () => {
  try {
    const response = await fetch('http://localhost:3002/api/health');
    if (response.ok) {
      console.log('✅ Сервер работает на http://localhost:3002');
    } else {
      console.log('⚠️  Сервер отвечает, но с ошибкой');
    }
  } catch (e) {
    console.log('❌ Сервер не запущен на порту 3002!');
    console.log('   Запустите: npm run start');
  }
  
  // 5. Итоговая проверка
  console.log('\n' + '='.repeat(60));
  console.log('📊 ИТОГ:\n');
  
  if (allFilesExist) {
    console.log('✅ Все файлы на месте');
  } else {
    console.log('❌ Не хватает файлов - переустановите обновление');
  }
  
  console.log('\n💡 ЧТО ДЕЛАТЬ ДАЛЬШЕ:');
  console.log('\n1. Если всё ✅ - создайте НОВУЮ генерацию:');
  console.log('   👉 http://localhost:3002/create/studio');
  console.log('\n2. Дождитесь завершения генерации');
  console.log('\n3. Проверьте Library:');
  console.log('   👉 http://localhost:3002/library');
  console.log('\n⚠️  ВАЖНО: Превью создаются только для НОВЫХ генераций!');
  console.log('   Старые генерации не будут иметь превью автоматически.');
  
  console.log('\n4. Если превью нет - откройте консоль браузера (F12)');
  console.log('   и посмотрите есть ли ошибки.');
  
  console.log('\n5. Для деплоя на продакшн (lensroom.ru):');
  console.log('   bash DEPLOY_TO_PRODUCTION.sh');
  console.log('');
}, 1000);


