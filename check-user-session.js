#!/usr/bin/env node

/**
 * Проверка состояния пользователя на сервере
 * Используется для диагностики проблемы с неактивной кнопкой Generate
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserSession() {
  console.log('\n════════════════════════════════════════════════════');
  console.log('🔍 ПРОВЕРКА СОСТОЯНИЯ ПОЛЬЗОВАТЕЛЯ');
  console.log('════════════════════════════════════════════════════\n');

  try {
    // 1. Получить последнего авторизованного пользователя
    console.log('📊 1. ПОСЛЕДНИЕ АВТОРИЗАЦИИ:');
    const { data: profiles, error: profilesError } = await supabase
      .from('telegram_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (profilesError) {
      console.error('❌ Ошибка получения профилей:', profilesError);
      return;
    }

    console.log(`   Найдено профилей: ${profiles.length}\n`);

    profiles.forEach((profile, i) => {
      console.log(`   ${i + 1}. User ${profile.telegram_id}:`);
      console.log(`      • ID: ${profile.id}`);
      console.log(`      • Username: ${profile.username || 'N/A'}`);
      console.log(`      • First Name: ${profile.first_name || 'N/A'}`);
      console.log(`      • Created: ${new Date(profile.created_at).toLocaleString('ru-RU')}`);
      console.log(`      • Last Seen: ${profile.last_seen_at ? new Date(profile.last_seen_at).toLocaleString('ru-RU') : 'N/A'}`);
      console.log('');
    });

    // 2. Проверить credits для последнего пользователя
    if (profiles.length > 0) {
      const lastUser = profiles[0];
      console.log('💰 2. БАЛАНС ПОСЛЕДНЕГО ПОЛЬЗОВАТЕЛЯ:');
      
      const { data: creditsData, error: creditsError } = await supabase
        .from('credits')
        .select('*')
        .eq('user_id', lastUser.id)
        .single();

      if (creditsError) {
        console.log(`   ❌ Баланс не найден для user_id: ${lastUser.id}`);
        console.log(`   Ошибка:`, creditsError.message);
      } else {
        console.log(`   ✅ User ID: ${creditsData.user_id}`);
        console.log(`   💎 Balance: ${creditsData.balance} stars`);
        console.log(`   📅 Updated: ${new Date(creditsData.updated_at).toLocaleString('ru-RU')}`);
      }
      console.log('');

      // 3. Проверить auth.users
      console.log('🔐 3. AUTH.USERS:');
      const { data: authUsers, error: authError } = await supabase
        .from('users')
        .select('*')
        .in('id', profiles.map(p => p.id))
        .limit(5);

      if (authError) {
        console.log(`   ⚠️  Не удалось получить auth.users:`, authError.message);
      } else {
        console.log(`   Найдено в auth.users: ${authUsers.length}`);
        authUsers.forEach(user => {
          console.log(`   • ${user.email || user.id} (${user.created_at})`);
        });
      }
      console.log('');

      // 4. Проверить последние генерации
      console.log('🎨 4. ПОСЛЕДНИЕ ГЕНЕРАЦИИ:');
      const { data: generations, error: genError } = await supabase
        .from('generations')
        .select('id, user_id, status, model, created_at')
        .eq('user_id', lastUser.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (genError) {
        console.log(`   ⚠️  Генерации не найдены:`, genError.message);
      } else if (generations.length === 0) {
        console.log(`   ℹ️  Пользователь еще не делал генераций`);
      } else {
        console.log(`   Найдено генераций: ${generations.length}`);
        generations.forEach((gen, i) => {
          console.log(`   ${i + 1}. ${gen.model} - ${gen.status} (${new Date(gen.created_at).toLocaleString('ru-RU')})`);
        });
      }
      console.log('');
    }

    // 5. Рекомендации
    console.log('═══════════════════════════════════════════════════');
    console.log('💡 РЕКОМЕНДАЦИИ:');
    console.log('═══════════════════════════════════════════════════\n');

    if (profiles.length === 0) {
      console.log('❌ ПРОБЛЕМА: Нет авторизованных пользователей');
      console.log('   → Войдите через Telegram на сайте');
      console.log('   → Проверьте, что бот @LensRoom_bot отвечает');
    } else {
      const lastUser = profiles[0];
      const { data: creditsData } = await supabase
        .from('credits')
        .select('balance')
        .eq('user_id', lastUser.id)
        .single();

      if (!creditsData || creditsData.balance === 0) {
        console.log('❌ ПРОБЛЕМА: Баланс = 0 stars');
        console.log('   → Пополните баланс через /tariffs');
        console.log('   → Новые пользователи должны получать 50⭐ автоматически');
        console.log('   → Проверьте trigger при создании telegram_profiles');
      } else if (creditsData.balance < 30) {
        console.log('⚠️  ПРЕДУПРЕЖДЕНИЕ: Недостаточно кредитов');
        console.log(`   → Баланс: ${creditsData.balance}⭐`);
        console.log(`   → Минимум для генерации: 30⭐ (1K качество)`);
        console.log('   → Пополните баланс');
      } else {
        console.log('✅ Баланс достаточный');
        console.log('');
        console.log('🔍 ДАЛЬНЕЙШАЯ ДИАГНОСТИКА:');
        console.log('   1. Откройте https://lensroom.ru в браузере');
        console.log('   2. Нажмите F12 → Console');
        console.log('   3. Выполните:');
        console.log('      fetch("/api/auth/me").then(r => r.json()).then(console.log)');
        console.log('   4. Если видите {"error":"Not authenticated"}:');
        console.log('      → Cookie lr_session отсутствует или истек');
        console.log('      → Перелогиньтесь через Telegram');
        console.log('   5. Если видите {"user": {...}, "telegramId": ...}:');
        console.log('      → Авторизация OK');
        console.log('      → Проверьте баланс в UI');
        console.log('      → Возможно, проблема в frontend state');
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

checkUserSession();
