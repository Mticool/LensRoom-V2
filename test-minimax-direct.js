// Direct MiniMax API test
// Run: node test-minimax-direct.js

const fs = require('fs');
const path = require('path');

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const BASE_URL = 'https://api.minimax.io/v1';

if (!MINIMAX_API_KEY) {
  console.error('❌ MINIMAX_API_KEY not set');
  process.exit(1);
}

async function testTTS() {
  console.log('🧪 Testing MiniMax TTS directly...\n');

  // CORRECT FORMAT: nested voice_setting and audio_setting
  const testVoiceId = process.argv[2] || 'voice_placeholder';
  
  const requestBody = {
    model: 'speech-2.6-hd',
    text: 'Привет! Это тестовая озвучка.',
    voice_setting: {
      voice_id: testVoiceId,
    },
    audio_setting: {
      format: 'mp3',
    },
  };

  console.log('📤 REQUEST:');
  console.log(JSON.stringify(requestBody, null, 2));
  console.log('');

  try {
    const response = await fetch(`${BASE_URL}/t2a_v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📥 STATUS:', response.status, response.statusText);
    console.log('');

    const data = await response.json();
    console.log('📥 RESPONSE:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    // Check for audio
    if (data?.audio_file) {
      console.log('✅ audio_file found (base64):', data.audio_file.substring(0, 50) + '...');
    } else {
      console.log('❌ No audio_file');
    }

    if (data?.audio_url) {
      console.log('✅ audio_url found:', data.audio_url);
    } else {
      console.log('❌ No audio_url');
    }

    console.log('');
    console.log('🔍 All response keys:', Object.keys(data));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testTTS();
