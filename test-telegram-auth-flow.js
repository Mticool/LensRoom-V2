#!/usr/bin/env node
/**
 * Test Telegram Auth Flow
 * Симулирует авторизацию через Telegram Mini App
 */

const crypto = require('crypto');

const BOT_TOKEN = '8239401027:AAFao47EOexUUOtl8xMSXjKTC7uv576Rovg';
const API_URL = 'https://lensroom.ru/api/telegram/auth';

// Test user data
const testUser = {
  id: 999999999,
  first_name: 'Test',
  last_name: 'User',
  username: 'testuser',
  language_code: 'ru',
};

/**
 * Create valid Telegram WebApp initData
 */
function createInitData(user) {
  const authDate = Math.floor(Date.now() / 1000);
  
  // Create data string
  const dataParams = {
    auth_date: authDate,
    user: JSON.stringify(user),
  };

  // Sort and create data-check-string
  const dataCheckString = Object.keys(dataParams)
    .sort()
    .map(k => `${k}=${dataParams[k]}`)
    .join('\n');

  // Calculate hash
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN)
    .digest();

  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // Create initData string
  const initData = new URLSearchParams({
    ...dataParams,
    hash,
  }).toString();

  return initData;
}

async function testAuthFlow() {
  console.log('🧪 Тестирование Telegram авторизации\n');

  // Step 1: Create initData
  console.log('1️⃣ Создание initData:');
  const initData = createInitData(testUser);
  console.log(`   ✅ initData создан (${initData.length} символов)`);
  console.log(`   User: ${testUser.first_name} (ID: ${testUser.id})`);
  console.log('');

  // Step 2: Send POST request
  console.log('2️⃣ Отправка POST запроса:');
  console.log(`   URL: ${API_URL}`);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ initData }),
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log('');

    // Step 3: Parse response
    console.log('3️⃣ Ответ сервера:');
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    // Step 4: Validate response
    console.log('4️⃣ Проверка ответа:');
    
    if (response.status === 200 && data.success) {
      console.log('   ✅ Авторизация успешна!');
      console.log(`   Profile ID: ${data.session?.profileId || 'N/A'}`);
      console.log(`   Auth User ID: ${data.session?.authUserId || 'N/A'}`);
      console.log(`   Balance: ${data.session?.balance || 0}⭐`);
      console.log(`   Needs Auth: ${data.session?.needsAuth ? 'Да' : 'Нет'}`);
    } else {
      console.log('   ❌ Авторизация не удалась');
      console.log(`   Error: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('   ❌ Ошибка запроса:', error.message);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ Тест завершен');
  console.log('═══════════════════════════════════════════════════');
}

testAuthFlow().catch(console.error);
