#!/usr/bin/env node

/**
 * Утилита для проверки баланса MiniMax API
 * 
 * Использование:
 *   node check-minimax-balance.js
 */

const fs = require('fs');
const path = require('path');

// Читаем .env.local файл
let MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;

if (!MINIMAX_API_KEY) {
  try {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/MINIMAX_API_KEY=(.+)/);
    if (match) {
      MINIMAX_API_KEY = match[1].trim().replace(/['"]/g, '');
    }
  } catch (error) {
    // Игнорируем ошибку, проверим ниже
  }
}

if (!MINIMAX_API_KEY) {
  console.error('❌ MINIMAX_API_KEY не найден в .env.local');
  process.exit(1);
}

console.log('🔍 Проверка баланса MiniMax...\n');

async function checkBalance() {
  try {
    // Попробуем получить информацию об аккаунте
    const response = await fetch('https://api.minimax.io/v1/user/info', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`HTTP Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('\n❌ Ошибка при запросе:');
      console.error(errorText);
      
      if (response.status === 401) {
        console.error('\n💡 Возможные причины:');
        console.error('  - Неверный API ключ');
        console.error('  - API ключ истёк');
        console.error('\n📝 Проверьте ключ на: https://platform.minimax.io/user-center/basic-information/interface-key');
      }
      
      process.exit(1);
    }

    const data = await response.json();
    console.log('\n✅ Ответ от сервера:');
    console.log(JSON.stringify(data, null, 2));

    // Попробуем найти информацию о балансе
    if (data.balance !== undefined) {
      console.log(`\n💰 Текущий баланс: ${data.balance} кредитов`);
    } else if (data.data?.balance !== undefined) {
      console.log(`\n💰 Текущий баланс: ${data.data.balance} кредитов`);
    } else {
      console.log('\n⚠️  Информация о балансе не найдена в ответе');
      console.log('💡 Проверьте баланс вручную на: https://platform.minimax.io/');
    }

  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.error('💡 Проверьте подключение к интернету');
    }
  }
}

// Также попробуем проверить через альтернативный endpoint
async function checkBalanceAlternative() {
  console.log('\n📊 Попытка альтернативного способа проверки...\n');
  
  try {
    // Попробуем получить список моделей (обычно доступно даже с нулевым балансом)
    const response = await fetch('https://api.minimax.io/v1/text/chatcompletion', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'abab6.5-chat',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      }),
    });

    if (response.status === 401) {
      console.log('❌ API ключ недействителен или истёк');
    } else if (response.status === 429) {
      console.log('⚠️  Достигнут лимит запросов (rate limit)');
    } else if (response.status === 402 || response.status === 403) {
      console.log('❌ Недостаточно средств на балансе');
    } else if (response.ok) {
      console.log('✅ API ключ работает! (баланс есть)');
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log(`❓ Статус: ${response.status}`);
      if (errorData.base_resp?.status_code === 1008) {
        console.log('❌ Подтверждено: недостаточно средств (код 1008)');
      }
    }
  } catch (error) {
    console.error('Ошибка при альтернативной проверке:', error.message);
  }
}

// Запуск проверки
(async () => {
  console.log('═══════════════════════════════════════════════════');
  console.log('    Проверка баланса MiniMax API');
  console.log('═══════════════════════════════════════════════════');
  console.log(`API Key: ${MINIMAX_API_KEY.slice(0, 8)}...${MINIMAX_API_KEY.slice(-4)}\n`);

  await checkBalance();
  await checkBalanceAlternative();

  console.log('\n═══════════════════════════════════════════════════');
  console.log('📝 Полезные ссылки:');
  console.log('   • Dashboard: https://platform.minimax.io/');
  console.log('   • API Keys: https://platform.minimax.io/user-center/basic-information/interface-key');
  console.log('   • Billing: https://platform.minimax.io/user-center/basic-information/recharge');
  console.log('   • Docs: https://platform.minimax.io/docs');
  console.log('═══════════════════════════════════════════════════\n');
})();
