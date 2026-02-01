#!/usr/bin/env node

/**
 * Тест API ключа MiniMax
 * Проверяет, работает ли ключ и имеет ли доступ к voice cloning
 */

const fs = require('fs');
const path = require('path');

// Читаем API ключ
const envPath = path.join(__dirname, '.env.local');
let MINIMAX_API_KEY;

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/MINIMAX_API_KEY=(.+)/);
  if (match) {
    MINIMAX_API_KEY = match[1].trim().replace(/['"]/g, '');
  }
} catch (error) {
  console.error('❌ Не удалось прочитать .env.local');
  process.exit(1);
}

if (!MINIMAX_API_KEY) {
  console.error('❌ MINIMAX_API_KEY не найден в .env.local');
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════');
console.log('    Тест API ключа MiniMax');
console.log('═══════════════════════════════════════════════════');
console.log(`API Key: ${MINIMAX_API_KEY.slice(0, 15)}...${MINIMAX_API_KEY.slice(-8)}\n`);

async function testAPIKey() {
  console.log('🔍 Проверка 1: Тест доступа к API...\n');
  
  try {
    // Пробуем сделать простой запрос к API
    const response = await fetch('https://api.minimax.io/v1/text/chatcompletion', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'abab6.5-chat',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      }),
    });

    console.log(`HTTP Status: ${response.status} ${response.statusText}`);

    if (response.status === 401) {
      console.log('❌ API ключ НЕДЕЙСТВИТЕЛЕН или ИСТЁК');
      console.log('\n💡 Решение:');
      console.log('   1. Перейдите на https://platform.minimax.io/user-center/basic-information/interface-key');
      console.log('   2. Создайте новый API ключ');
      console.log('   3. Обновите .env.local');
      return false;
    } else if (response.status === 402 || response.status === 403) {
      console.log('❌ Недостаточно прав или баланса');
      console.log('\n💡 Проверьте:');
      console.log('   1. Баланс аккаунта');
      console.log('   2. Права доступа API ключа');
      return false;
    } else if (response.status === 429) {
      console.log('⚠️  Rate limit (слишком много запросов)');
      console.log('   Но ключ РАБОТАЕТ! ✅');
      return true;
    }

    const data = await response.json();
    
    if (data.base_resp) {
      console.log(`\nОтвет API:`);
      console.log(`  status_code: ${data.base_resp.status_code}`);
      console.log(`  status_msg: ${data.base_resp.status_msg}`);
      
      if (data.base_resp.status_code === 0) {
        console.log('\n✅ API ключ РАБОТАЕТ!');
        return true;
      } else if (data.base_resp.status_code === 1008) {
        console.log('\n❌ Ошибка 1008: insufficient balance');
        console.log('\n💡 Возможные причины:');
        console.log('   1. API ключ из ДРУГОГО аккаунта (не того, где 9950 кредитов)');
        console.log('   2. Аккаунт требует верификации для voice cloning');
        console.log('   3. У аккаунта нет прав на voice cloning');
        console.log('\n📝 Создайте НОВЫЙ API ключ в аккаунте с 9950 кредитами!');
        return false;
      } else if (data.base_resp.status_code === 1004) {
        console.log('\n❌ Ошибка аутентификации');
        console.log('   API ключ неверный или истёк');
        return false;
      }
    }

    console.log('\n✅ API ключ работает!');
    return true;

  } catch (error) {
    console.error(`\n❌ Ошибка: ${error.message}`);
    return false;
  }
}

async function testVoiceCloning() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔍 Проверка 2: Права на Voice Cloning...\n');
  
  try {
    // Пробуем проверить доступ к voice cloning через список голосов
    const response = await fetch('https://api.minimax.io/v1/voice_list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`HTTP Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Доступ к Voice API есть!');
      
      if (data.voices && data.voices.length > 0) {
        console.log(`\nНайдено голосов: ${data.voices.length}`);
      }
      return true;
    } else if (response.status === 401) {
      console.log('❌ Нет доступа (401 Unauthorized)');
      return false;
    } else if (response.status === 403) {
      console.log('❌ Доступ запрещён (403 Forbidden)');
      console.log('   Возможно, нужна верификация аккаунта');
      return false;
    } else if (response.status === 404) {
      console.log('⚠️  Endpoint не найден (это нормально, API может не иметь такого метода)');
      console.log('   Но это не означает, что voice cloning не работает');
      return true;
    }

    const errorData = await response.json().catch(() => ({}));
    if (errorData.base_resp?.status_code === 1008) {
      console.log('❌ Ошибка 1008: insufficient balance');
      console.log('\n💡 API ключ НЕ СВЯЗАН с аккаунтом, где 9950 кредитов!');
      return false;
    }

  } catch (error) {
    console.log(`⚠️  Ошибка при проверке: ${error.message}`);
    console.log('   (Это не критично, продолжаем...)');
  }
}

// Запуск тестов
(async () => {
  const apiWorks = await testAPIKey();
  
  if (apiWorks) {
    await testVoiceCloning();
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('📋 ИТОГИ:');
  console.log('═══════════════════════════════════════════════════');
  
  if (!apiWorks) {
    console.log('\n❌ API ключ НЕ РАБОТАЕТ или не имеет доступа');
    console.log('\n✅ РЕШЕНИЕ:');
    console.log('   1. Войдите в аккаунт, где видите 9950 кредитов');
    console.log('   2. Создайте НОВЫЙ API ключ');
    console.log('   3. Обновите .env.local файл');
    console.log('   4. Перезапустите сервер (npm run dev)');
    console.log('\n🔗 Ссылка:');
    console.log('   https://platform.minimax.io/user-center/basic-information/interface-key');
  } else {
    console.log('\n✅ API ключ работает!');
    console.log('\nЕсли клонирование всё ещё не работает:');
    console.log('   • Проверьте, что используете правильный аккаунт');
    console.log('   • Убедитесь, что аккаунт верифицирован');
    console.log('   • Проверьте баланс на самом сайте');
  }
  
  console.log('\n═══════════════════════════════════════════════════\n');
})();
