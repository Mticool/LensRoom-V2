#!/usr/bin/env node

/**
 * Прямое применение миграции через Supabase Client
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем .env.local
config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Ошибка: Не найдены SUPABASE_URL или SERVICE_ROLE_KEY в .env.local');
  process.exit(1);
}

console.log('📦 Применяю миграцию 020_inspiration_styles.sql...\n');

// Читаем миграцию
const migrationPath = join(__dirname, '../supabase/migrations/020_inspiration_styles.sql');
const sql = readFileSync(migrationPath, 'utf8');

// Формируем URL для запроса
const apiUrl = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;

try {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ Ошибка: HTTP ${response.status}`);
    console.error(error);
    process.exit(1);
  }

  console.log('✅ Миграция успешно применена!');
  
  // Проверяем результат
  console.log('\n📊 Проверка создания таблицы...');
  
  const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      query: `
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'inspiration_styles'
      `
    })
  });

  if (checkResponse.ok) {
    const result = await checkResponse.json();
    if (result[0]?.count > 0) {
      console.log('   ✅ Таблица inspiration_styles создана успешно!');
    }
  }

  console.log('\n🎉 Готово! Следующие шаги:');
  console.log('\n1️⃣ Дайте себе роль админа:');
  console.log('   Откройте Supabase SQL Editor и выполните:');
  console.log('   -----------------------------------------------');
  console.log('   -- Узнайте свой ID');
  console.log("   SELECT id, email FROM auth.users WHERE email = 'your@email.com';");
  console.log('');
  console.log('   -- Дайте роль admin');
  console.log("   INSERT INTO public.user_roles (user_id, role)");
  console.log("   VALUES ('YOUR_USER_ID', 'admin')");
  console.log("   ON CONFLICT (user_id) DO UPDATE SET role = 'admin';");
  console.log('\n2️⃣ Откройте админ-панель: https://lensroom.ru/admin');
  console.log('\n✨ Админ-панель готова к работе!\n');

} catch (error) {
  console.error('❌ Ошибка при применении миграции:', error.message);
  process.exit(1);
}
