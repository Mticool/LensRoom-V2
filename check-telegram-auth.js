#!/usr/bin/env node
/**
 * Check Telegram Auth and Database
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ndhykojwzazgmgvjaqgt.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kaHlrb2p3emF6Z21ndmphcWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTU4ODg3OCwiZXhwIjoyMDgxMTY0ODc4fQ.QCd7bpnvrBJD1syVvGm0HdUny-5frSQpLhmbKqc9MwQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkAuth() {
  console.log('🔍 Проверка Telegram авторизации и базы данных\n');

  // 1. Check telegram_profiles table
  console.log('1️⃣ Проверка таблицы telegram_profiles:');
  const { data: profiles, error: profilesError } = await supabase
    .from('telegram_profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (profilesError) {
    console.error('   ❌ Ошибка:', profilesError.message);
  } else {
    console.log(`   ✅ Найдено профилей: ${profiles.length}`);
    if (profiles.length > 0) {
      console.log('   Последние профили:');
      profiles.forEach(p => {
        console.log(`     - ID: ${p.telegram_id}, Имя: ${p.first_name}, auth_user_id: ${p.auth_user_id || 'NULL'}`);
      });
    }
  }
  console.log('');

  // 2. Check auth.users
  console.log('2️⃣ Проверка auth.users (Telegram пользователи):');
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('   ❌ Ошибка:', authError.message);
  } else {
    const telegramUsers = authData.users.filter(u => u.user_metadata?.telegram_id);
    console.log(`   ✅ Всего auth users: ${authData.users.length}`);
    console.log(`   ✅ Telegram users: ${telegramUsers.length}`);
    
    if (telegramUsers.length > 0) {
      console.log('   Последние Telegram users:');
      telegramUsers.slice(0, 5).forEach(u => {
        console.log(`     - Auth ID: ${u.id}`);
        console.log(`       Telegram ID: ${u.user_metadata.telegram_id}`);
        console.log(`       Email: ${u.email}`);
        console.log(`       Created: ${new Date(u.created_at).toLocaleString()}`);
      });
    }
  }
  console.log('');

  // 3. Check credits table
  console.log('3️⃣ Проверка таблицы credits:');
  const { data: credits, error: creditsError } = await supabase
    .from('credits')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (creditsError) {
    console.error('   ❌ Ошибка:', creditsError.message);
  } else {
    console.log(`   ✅ Найдено записей: ${credits.length}`);
    if (credits.length > 0) {
      console.log('   Последние credits:');
      credits.forEach(c => {
        console.log(`     - User ID: ${c.user_id}`);
        console.log(`       Balance: ${c.amount}⭐`);
        console.log(`       Package: ${c.package_stars}⭐, Subscription: ${c.subscription_stars}⭐`);
      });
    }
  }
  console.log('');

  // 4. Check if telegram_profiles have auth_user_id column
  console.log('4️⃣ Проверка связи telegram_profiles <-> auth.users:');
  const { data: linkedProfiles } = await supabase
    .from('telegram_profiles')
    .select('telegram_id, first_name, auth_user_id')
    .not('auth_user_id', 'is', null)
    .limit(5);

  if (linkedProfiles && linkedProfiles.length > 0) {
    console.log(`   ✅ Профилей со связью: ${linkedProfiles.length}`);
    linkedProfiles.forEach(p => {
      console.log(`     - Telegram ID: ${p.telegram_id} → Auth ID: ${p.auth_user_id}`);
    });
  } else {
    console.log('   ⚠️  Нет профилей со связью auth_user_id');
  }
  console.log('');

  // 5. Check for orphaned profiles (no auth_user_id)
  console.log('5️⃣ Проверка профилей без auth_user_id:');
  const { data: orphanedProfiles, count } = await supabase
    .from('telegram_profiles')
    .select('*', { count: 'exact' })
    .is('auth_user_id', null);

  console.log(`   ${count > 0 ? '⚠️' : '✅'}  Профилей без auth_user_id: ${count || 0}`);
  if (orphanedProfiles && orphanedProfiles.length > 0) {
    console.log('   Примеры:');
    orphanedProfiles.slice(0, 3).forEach(p => {
      console.log(`     - ${p.first_name} (TG ID: ${p.telegram_id})`);
    });
  }
  console.log('');

  // 6. Test auth endpoint
  console.log('6️⃣ Проверка API endpoint /api/telegram/auth:');
  console.log('   Endpoint должен быть доступен на: https://lensroom.ru/api/telegram/auth');
  console.log('   Метод: POST');
  console.log('   Body: { "initData": "..." }');
  console.log('');

  console.log('═══════════════════════════════════════════════════');
  console.log('✅ Проверка завершена');
  console.log('═══════════════════════════════════════════════════');
}

checkAuth().catch(console.error);
