#!/usr/bin/env node
/**
 * PWA Icon Generator для LensRoom
 * 
 * Использование:
 * 1. npm install sharp (если не установлен)
 * 2. node scripts/generate-icons.js
 * 
 * Или создайте иконки вручную из public/icon.svg
 */

const fs = require('fs');
const path = require('path');

// Попробуем использовать sharp если установлен
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp не установлен. Устанавливаем...');
  console.log('Запустите: npm install sharp');
  console.log('\nИли создайте иконки вручную из public/icon.svg:');
  console.log('- icon-72x72.png');
  console.log('- icon-96x96.png');
  console.log('- icon-128x128.png');
  console.log('- icon-144x144.png');
  console.log('- icon-152x152.png');
  console.log('- icon-192x192.png');
  console.log('- icon-384x384.png');
  console.log('- icon-512x512.png');
  console.log('- apple-touch-icon.png (180x180)');
  console.log('- favicon-16x16.png');
  console.log('- favicon-32x32.png');
  console.log('- favicon.ico (можно использовать онлайн конвертер)');
  process.exit(0);
}

const PUBLIC_DIR = path.join(__dirname, '../public');
const SVG_PATH = path.join(PUBLIC_DIR, 'icon.svg');

const ICON_SIZES = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

// Badge для уведомлений (монохромная версия)
const BADGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
  <circle cx="36" cy="36" r="32" fill="#D4AF37"/>
  <text x="28" y="46" font-family="Arial" font-size="28" font-weight="bold" fill="#0A0A0B">L</text>
</svg>`;

async function generateIcons() {
  console.log('🎨 Генерация PWA иконок...\n');

  if (!fs.existsSync(SVG_PATH)) {
    console.error('❌ Файл icon.svg не найден в public/');
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(SVG_PATH);

  for (const icon of ICON_SIZES) {
    const outputPath = path.join(PUBLIC_DIR, icon.name);
    
    try {
      await sharp(svgBuffer)
        .resize(icon.size, icon.size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ ${icon.name} (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`❌ ${icon.name}: ${error.message}`);
    }
  }

  // Генерируем badge для уведомлений
  try {
    const badgePath = path.join(PUBLIC_DIR, 'badge-72x72.png');
    await sharp(Buffer.from(BADGE_SVG))
      .resize(72, 72)
      .png()
      .toFile(badgePath);
    console.log('✅ badge-72x72.png (72x72)');
  } catch (error) {
    console.error(`❌ badge: ${error.message}`);
  }

  // Создаём favicon.ico из 16x16 и 32x32
  console.log('\n📝 Для favicon.ico используйте онлайн конвертер:');
  console.log('   https://favicon.io/favicon-converter/');
  console.log('   Загрузите icon-512x512.png');

  console.log('\n✨ Готово! Иконки созданы в public/');
}

generateIcons().catch(console.error);

