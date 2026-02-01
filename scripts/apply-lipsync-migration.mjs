#!/usr/bin/env node

/**
 * Применение миграции Lip Sync (20260129_lipsync_support.sql)
 * Использует переменные из .env.local
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Не найдены NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY в .env.local');
  process.exit(1);
}

const migrationPath = join(__dirname, '../supabase/migrations/20260129_lipsync_support.sql');
let sql;
try {
  sql = readFileSync(migrationPath, 'utf8');
} catch (e) {
  console.error('❌ Не удалось прочитать файл миграции:', migrationPath);
  process.exit(1);
}

console.log('📦 Применяю миграцию Lip Sync (20260129_lipsync_support.sql)...\n');

// Supabase не предоставляет exec_sql по умолчанию - миграции применяются через Dashboard или CLI
// Выводим SQL для ручного выполнения
console.log('⚠️  Supabase REST API не поддерживает произвольный SQL.');
console.log('   Примените миграцию вручную:\n');
console.log('   1. Откройте: https://supabase.com/dashboard → ваш проект → SQL Editor');
console.log('   2. Вставьте содержимое файла: supabase/migrations/20260129_lipsync_support.sql');
console.log('   3. Нажмите Run\n');
console.log('--- SQL (скопируйте ниже) ---\n');
console.log(sql);
console.log('\n--- Конец SQL ---\n');
console.log('✅ После применения миграции деплой можно продолжать.\n');
process.exit(0);
