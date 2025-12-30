#!/usr/bin/env node

/**
 * Veo 3.1 Direct Integration Test
 * Добавляет задачи напрямую в generation_queue минуя API
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Загрузка env вручную из .env.local
const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Тестовый пользователь (возьмем первого доступного или создадим)
const TEST_USER_ID = 'test-veo-user-001';

async function ensureTestUser() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', TEST_USER_ID)
    .maybeSingle();
  
  if (!data) {
    console.log('📝 Создаю тестового пользователя...');
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: TEST_USER_ID,
        username: 'veo_test_user',
        credits: 10000,
      });
    
    if (insertError) {
      console.error('❌ Ошибка создания пользователя:', insertError);
      // Попробуем использовать реального пользователя
      const { data: realUser } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();
      
      if (realUser) {
        console.log('✅ Используем существующего пользователя:', realUser.id);
        return realUser.id;
      }
      throw insertError;
    }
  }
  
  console.log('✅ Тестовый пользователь готов:', TEST_USER_ID);
  return TEST_USER_ID;
}

async function createTestGeneration(userId, testName, params) {
  console.log(`\n📝 Создаю генерацию: ${testName}`);
  
  // 1. Создать запись в generations
  const { data: generation, error: genError } = await supabase
    .from('generations')
    .insert({
      user_id: userId,
      type: 'video',
      model_id: 'veo-3.1',
      model_name: 'Veo 3.1',
      prompt: params.prompt,
      credits_used: 100,
      status: 'queued',
      settings: params.settings || {},
    })
    .select()
    .single();
  
  if (genError) {
    console.error('❌ Ошибка создания generation:', genError);
    throw genError;
  }
  
  console.log('✅ Generation создан:', generation.id);
  
  // 2. Добавить в очередь
  const { data: queueTask, error: queueError } = await supabase
    .from('generation_queue')
    .insert({
      generation_id: generation.id,
      type: 'video',
      priority: 10, // Высокий приоритет для тестов
      status: 'pending',
      params: {
        userId,
        model: 'veo-3.1',
        modelInfo: {
          id: 'veo-3.1',
          name: 'Veo 3.1',
          apiId: 'veo3',
          provider: 'kie_veo',
          fixedDuration: 8,
          supportsAudio: true,
        },
        prompt: params.prompt,
        duration: 8,
        mode: params.mode || 't2v',
        quality: params.quality || 'fast',
        aspectRatio: params.aspectRatio || '16:9',
        referenceImages: params.referenceImages || [],
        seeds: params.seeds,
        enableTranslation: params.enableTranslation !== false,
        creditCost: 100,
      },
    })
    .select()
    .single();
  
  if (queueError) {
    console.error('❌ Ошибка добавления в очередь:', queueError);
    throw queueError;
  }
  
  console.log('✅ Задача добавлена в очередь:', queueTask.id);
  
  return { generationId: generation.id, queueId: queueTask.id };
}

async function waitForCompletion(generationId, timeout = 120000) {
  console.log('⏳ Ожидание завершения (макс ' + (timeout / 1000) + ' сек)...');
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const { data, error } = await supabase
      .from('generations')
      .select('status, result_urls, error, settings')
      .eq('id', generationId)
      .single();
    
    if (error) {
      console.error('❌ Ошибка проверки статуса:', error);
      return null;
    }
    
    process.stdout.write('.');
    
    if (data.status === 'success' || data.status === 'completed') {
      console.log('\n✅ Генерация завершена успешно!');
      console.log('📹 URLs:', data.result_urls);
      console.log('🎬 Metadata:', data.settings?.metadata);
      return data;
    }
    
    if (data.status === 'failed') {
      console.log('\n❌ Генерация провалена!');
      console.log('Error:', data.error);
      return null;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n⏱️ Таймаут ожидания');
  return null;
}

async function runTests() {
  console.log('🧪 VEO 3.1 DIRECT INTEGRATION TEST');
  console.log('===================================\n');
  
  try {
    // Подготовка
    const userId = await ensureTestUser();
    
    // ТЕСТ 1: Text→Video
    console.log('\n📝 ТЕСТ 1: Text→Video (без изображений)');
    console.log('----------------------------------------');
    const test1 = await createTestGeneration(userId, 'Text→Video', {
      prompt: 'A cat walking on a beach at sunset, cinematic 4k',
      mode: 't2v',
      quality: 'fast',
      aspectRatio: '16:9',
      settings: {
        veoMode: 'text',
        quality: 'fast',
        size: '16:9',
        duration: 8,
      },
    });
    
    const result1 = await waitForCompletion(test1.generationId);
    
    if (result1) {
      console.log('✅ ТЕСТ 1 ПРОЙДЕН!\n');
      
      // Проверка что imageUrls НЕ было отправлено
      const { data: queueData } = await supabase
        .from('generation_queue')
        .select('params')
        .eq('id', test1.queueId)
        .single();
      
      if (queueData) {
        const hasImages = queueData.params.referenceImages && queueData.params.referenceImages.length > 0;
        console.log('📊 Проверка: imageUrls отсутствует =', !hasImages ? '✅' : '❌');
      }
      
      // ТЕСТ 2: Reference Mode (только если ТЕСТ 1 прошел)
      console.log('\n📚 ТЕСТ 2: Reference→Video (с imageUrls)');
      console.log('----------------------------------------');
      const test2 = await createTestGeneration(userId, 'Reference→Video', {
        prompt: 'Create cinematic video based on this reference image',
        mode: 'reference',
        quality: 'fast',
        aspectRatio: '16:9',
        referenceImages: [
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4', // Пример URL
        ],
        settings: {
          veoMode: 'reference',
          quality: 'fast',
          size: '16:9',
          duration: 8,
        },
      });
      
      const result2 = await waitForCompletion(test2.generationId);
      
      if (result2) {
        console.log('✅ ТЕСТ 2 ПРОЙДЕН!\n');
      } else {
        console.log('❌ ТЕСТ 2 ПРОВАЛЕН\n');
      }
    } else {
      console.log('❌ ТЕСТ 1 ПРОВАЛЕН - пропускаем остальные тесты\n');
    }
    
    console.log('\n===================================');
    console.log('🎉 Тестирование завершено!');
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

// Запуск
runTests().then(() => {
  console.log('\n✅ Скрипт завершен');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Ошибка:', error);
  process.exit(1);
});

