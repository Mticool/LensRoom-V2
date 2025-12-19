#!/usr/bin/env node

/**
 * Скрипт для автоматического применения миграции 020_inspiration_styles.sql
 * Использует переменные окружения из .env.local
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Загружаем .env.local
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Ошибка: SUPABASE_URL или SERVICE_ROLE_KEY не найдены в .env.local');
  process.exit(1);
}

// Читаем SQL миграцию
const migrationPath = path.join(__dirname, '../supabase/migrations/020_inspiration_styles.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

console.log('📦 Применяю миграцию 020_inspiration_styles.sql...\n');

// Извлекаем project_id из URL
const projectId = SUPABASE_URL.replace('https://', '').split('.')[0];
const apiUrl = `https://${projectId}.supabase.co/rest/v1/rpc/exec_sql`;

// Отправляем SQL через REST API
const postData = JSON.stringify({ query: sql });

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(apiUrl, options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 204) {
      console.log('✅ Миграция успешно применена!');
      console.log('\n📊 Проверка:');
      checkMigration();
    } else {
      console.error(`❌ Ошибка: HTTP ${res.statusCode}`);
      console.error(data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Ошибка при отправке запроса:', error);
  process.exit(1);
});

req.write(postData);
req.end();

// Проверяем что таблица создана
function checkMigration() {
  const checkSql = `
    SELECT 
      COUNT(*) as table_exists 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'inspiration_styles'
  `;

  const checkData = JSON.stringify({ query: checkSql });
  
  const checkReq = https.request(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Length': Buffer.byteLength(checkData)
    }
  }, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        if (result[0]?.table_exists === '1') {
          console.log('   ✅ Таблица inspiration_styles создана');
          console.log('\n🎉 Готово! Теперь дайте себе роль админа:');
          console.log('\n   Выполните в Supabase SQL Editor:');
          console.log('   -------------------------------------');
          console.log('   -- Узнайте свой ID');
          console.log("   SELECT id, email FROM auth.users WHERE email = 'your@email.com';");
          console.log('');
          console.log('   -- Дайте роль admin (замените YOUR_USER_ID)');
          console.log("   INSERT INTO public.user_roles (user_id, role)");
          console.log("   VALUES ('YOUR_USER_ID', 'admin')");
          console.log("   ON CONFLICT (user_id) DO UPDATE SET role = 'admin';");
          console.log('\n🚀 Потом откройте: https://lensroom.ru/admin\n');
        } else {
          console.log('   ⚠️  Таблица не найдена. Возможно миграция не применилась.');
        }
      } catch (e) {
        console.error('   ⚠️  Не удалось проверить таблицу:', e.message);
      }
    });
  });
  
  checkReq.on('error', (error) => {
    console.error('   ⚠️  Ошибка проверки:', error.message);
  });
  
  checkReq.write(checkData);
  checkReq.end();
}
