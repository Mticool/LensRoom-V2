#!/usr/bin/env node

/**
 * Применение миграции через Supabase SDK
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Читаем .env.local
function loadEnv() {
  const envPath = join(__dirname, '../.env.local');
  const envContent = readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  });
  
  return env;
}

const env = loadEnv();

console.log('📦 Применяю миграцию 020_inspiration_styles.sql...\n');

// Импортируем Supabase клиент
let createClient;
try {
  const supabaseModule = await import('@supabase/supabase-js');
  createClient = supabaseModule.createClient;
} catch (error) {
  console.error('❌ Не удалось загрузить @supabase/supabase-js');
  console.error('   Выполните: npm install @supabase/supabase-js');
  process.exit(1);
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// Читаем миграцию
const migrationPath = join(__dirname, '../supabase/migrations/020_inspiration_styles.sql');
const sql = readFileSync(migrationPath, 'utf8');

// Разбиваем на отдельные команды
const commands = [];
let currentCommand = '';
let inBegin = false;

sql.split('\n').forEach(line => {
  const trimmed = line.trim();
  
  // Пропускаем комментарии
  if (trimmed.startsWith('--') || !trimmed) {
    return;
  }
  
  if (trimmed === 'begin;') {
    inBegin = true;
    return;
  }
  
  if (trimmed === 'commit;') {
    if (currentCommand.trim()) {
      commands.push(currentCommand.trim());
      currentCommand = '';
    }
    inBegin = false;
    return;
  }
  
  currentCommand += line + '\n';
  
  // Если не внутри транзакции и есть точка с запятой - это отдельная команда
  if (!inBegin && trimmed.endsWith(';')) {
    commands.push(currentCommand.trim());
    currentCommand = '';
  }
});

if (currentCommand.trim()) {
  commands.push(currentCommand.trim());
}

console.log(`   Найдено команд: ${commands.length}\n`);

// Выполняем команды
async function runCommands() {
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    console.log(`   Команда ${i + 1}/${commands.length}...`);
    
    try {
      // Используем rpc для выполнения SQL
      const { error } = await supabase.rpc('exec', { sql: cmd });
      
      if (error) {
        console.error(`   ❌ Ошибка:`, error.message);
        
        // Если ошибка "relation already exists" - это ОК
        if (error.message.includes('already exists')) {
          console.log(`   ⚠️  Объект уже существует, пропускаем`);
          continue;
        }
        
        return false;
      }
      
      console.log(`   ✓ Выполнено`);
    } catch (error) {
      console.error(`   ❌ Ошибка:`, error.message);
      return false;
    }
  }
  
  return true;
}

// Проверка таблицы
async function checkTable() {
  try {
    const { data, error } = await supabase
      .from('inspiration_styles')
      .select('count', { count: 'exact', head: true });
    
    if (!error) {
      console.log('\n📊 Проверка:');
      console.log('   ✅ Таблица inspiration_styles доступна');
      return true;
    } else {
      console.log('   ⚠️  Таблица не найдена или недоступна');
    }
  } catch (error) {
    console.log('   ⚠️  Не удалось проверить таблицу');
  }
  
  return false;
}

// Main
(async () => {
  // Т.к. RPC может не работать, используем прямой SQL через REST API
  console.log('   Применяю миграцию напрямую через psql...\n');
  
  // Сохраняем SQL во временный файл
  const tmpPath = '/tmp/migration.sql';
  const fs = await import('fs');
  fs.writeFileSync(tmpPath, sql);
  
  console.log('✅ SQL миграция готова');
  console.log('📁 Файл сохранён: /tmp/migration.sql\n');
  console.log('🔧 Примените миграцию одним из способов:\n');
  console.log('Способ 1: Через Supabase Dashboard');
  console.log('   1. Откройте: Supabase → SQL Editor');
  console.log('   2. Скопируйте содержимое файла:');
  console.log(`      cat ${tmpPath}`);
  console.log('   3. Вставьте и выполните\n');
  console.log('Способ 2: Через psql (если есть connection string)');
  console.log(`   psql "postgresql://..." < ${tmpPath}\n`);
  console.log('📄 Или скопируйте SQL напрямую из:');
  console.log('   supabase/migrations/020_inspiration_styles.sql\n');
})();
