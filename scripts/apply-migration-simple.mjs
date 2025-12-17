#!/usr/bin/env node

/**
 * Простое применение миграции через Supabase API
 * Без внешних зависимостей
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Читаем .env.local вручную
function loadEnv() {
  try {
    const envPath = join(__dirname, '../.env.local');
    const envContent = readFileSync(envPath, 'utf8');
    const env = {};
    
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        env[key] = value;
      }
    });
    
    return env;
  } catch (error) {
    console.error('❌ Не удалось прочитать .env.local:', error.message);
    process.exit(1);
  }
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Не найдены SUPABASE_URL или SERVICE_ROLE_KEY в .env.local');
  process.exit(1);
}

console.log('📦 Применяю миграцию 020_inspiration_styles.sql...\n');

// Читаем миграцию
const migrationPath = join(__dirname, '../supabase/migrations/020_inspiration_styles.sql');
let sql;

try {
  sql = readFileSync(migrationPath, 'utf8');
} catch (error) {
  console.error('❌ Не удалось прочитать файл миграции:', error.message);
  process.exit(1);
}

// Разбиваем на отдельные команды (по точкам с запятой вне строк)
const commands = sql
  .split(';')
  .map(cmd => cmd.trim())
  .filter(cmd => cmd && !cmd.startsWith('--'));

console.log(`   Найдено команд: ${commands.length}\n`);

// Применяем каждую команду через Supabase REST API
async function runCommand(command, index) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: command + ';' })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`   ❌ Команда ${index + 1} failed:`, error.substring(0, 200));
      return false;
    }
    
    console.log(`   ✓ Команда ${index + 1} выполнена`);
    return true;
  } catch (error) {
    console.error(`   ❌ Ошибка в команде ${index + 1}:`, error.message);
    return false;
  }
}

// Применяем весь SQL целиком
async function applyMigration() {
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Ошибка при применении миграции:');
      console.error(error);
      return false;
    }
    
    console.log('✅ Миграция успешно применена!\n');
    return true;
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    return false;
  }
}

// Проверяем что таблица создана
async function checkTable() {
  const url = `${SUPABASE_URL}/rest/v1/inspiration_styles?select=count&limit=0`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'count=exact'
      }
    });

    const countHeader = response.headers.get('content-range');
    if (countHeader) {
      console.log('📊 Проверка:');
      console.log('   ✅ Таблица inspiration_styles доступна');
      console.log(`   📝 Записей: ${countHeader.split('/')[1] || 0}`);
      return true;
    }
  } catch (error) {
    console.log('   ⚠️  Не удалось проверить таблицу:', error.message);
  }
  
  return false;
}

// Главная функция
async function main() {
  const success = await applyMigration();
  
  if (success) {
    await checkTable();
    
    console.log('\n🎉 Готово! Следующие шаги:\n');
    console.log('1️⃣ Дайте себе роль админа:');
    console.log('   Откройте Supabase SQL Editor и выполните:\n');
    console.log('   -- Узнайте свой ID');
    console.log("   SELECT id, email FROM auth.users WHERE email = 'your@email.com';\n");
    console.log('   -- Дайте роль admin (замените YOUR_USER_ID)');
    console.log("   INSERT INTO public.user_roles (user_id, role)");
    console.log("   VALUES ('YOUR_USER_ID', 'admin')");
    console.log("   ON CONFLICT (user_id) DO UPDATE SET role = 'admin';\n");
    console.log('2️⃣ Откройте админ-панель: https://lensroom.ru/admin\n');
    console.log('✨ Админ-панель готова к работе!\n');
  } else {
    console.error('\n❌ Миграция не применена. Проверьте ошибки выше.\n');
    process.exit(1);
  }
}

main();
