/* eslint-disable no-console */
// Простая проверка TTS API через Node (fetch)
// Запуск: node scripts/test-tts-api.js

const BASE_URL = process.env.TTS_BASE_URL || 'http://localhost:3000';
const VOICE_ID = process.env.TTS_VOICE_ID;
const VOICE_DB_ID = process.env.TTS_VOICE_DB_ID;
const SAMPLE_TEXT = process.env.TTS_SAMPLE_TEXT || 'Привет! Это тест озвучки MiniMax.';

async function main() {
  console.log('TTS API smoke test');
  console.log('Base URL:', BASE_URL);

  const voicesRes = await fetch(`${BASE_URL}/api/tts/voices`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  const voicesData = await voicesRes.json().catch(() => ({}));
  console.log('Voices status:', voicesRes.status, 'count:', voicesData?.voices?.length || 0);

  if (!voicesRes.ok) {
    console.log('Voices error:', voicesData);
    process.exit(1);
  }

  if (!VOICE_ID || !VOICE_DB_ID) {
    console.log('⚠️  TTS_VOICE_ID/TTS_VOICE_DB_ID не заданы, пропускаем генерацию');
    return;
  }

  const generateRes = await fetch(`${BASE_URL}/api/tts/generate-audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      voice_id: VOICE_ID,
      voice_db_id: VOICE_DB_ID,
      text: SAMPLE_TEXT,
      language: 'ru',
      output_format: 'mp3',
    }),
  });

  const generateData = await generateRes.json().catch(() => ({}));
  console.log('Generate status:', generateRes.status, 'audio:', generateData?.audio_url || 'none');

  if (!generateRes.ok) {
    console.log('Generate error:', generateData);
    process.exit(1);
  }

  console.log('✅ MiniMax TTS OK');
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});