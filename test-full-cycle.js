// Full cycle test: Upload → Clone → TTS
// node test-full-cycle.js path/to/audio.mp3

const fs = require('fs');
const path = require('path');

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || 'sk-api-Gmv63B3PSPAGNHMTfx-zvIJqDeTj2SJb52zPVMmeQIXWGk6mFUNY-145zDuzDfFSIGEDSflI0KwuSavjG4myQX7fYXjl5GzWW2dNLYQvsxAuvRy9Ys4vTEM';
const BASE_URL = 'https://api.minimax.io/v1';

async function fullCycle() {
  console.log('🚀 Starting FULL CYCLE TEST\n');

  const audioPath = process.argv[2];
  if (!audioPath || !fs.existsSync(audioPath)) {
    console.error('❌ Usage: node test-full-cycle.js path/to/audio.mp3');
    console.error('   Audio file must be 10+ seconds, mp3/wav/m4a');
    process.exit(1);
  }

  // Step 1: Upload
  console.log('━━━━ STEP 1: UPLOAD ━━━━');
  const formData = new FormData();
  const audioBlob = new Blob([fs.readFileSync(audioPath)]);
  formData.append('file', audioBlob, path.basename(audioPath));
  formData.append('purpose', 'voice_clone');

  const uploadRes = await fetch(`${BASE_URL}/files/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${MINIMAX_API_KEY}` },
    body: formData,
  });

  console.log('Upload status:', uploadRes.status);
  const uploadData = await uploadRes.json();
  console.log('Upload response:', JSON.stringify(uploadData, null, 2));

  const fileId = uploadData?.file?.file_id || uploadData?.file_id;
  if (!fileId) {
    console.error('❌ No file_id in upload response');
    process.exit(1);
  }
  console.log('✅ file_id:', fileId);

  // Step 2: Clone
  console.log('\n━━━━ STEP 2: CLONE ━━━━');
  const voiceId = `test_voice_${Date.now()}`;
  const cloneBody = {
    file_id: fileId,
    voice_id: voiceId,
    model: 'speech-2.6-hd',
    text: 'Тестовая фраза для клонирования',
    need_noise_reduction: false,
    need_volumn_normalization: false,
    continuous_sound: false,
  };

  console.log('Clone request:', JSON.stringify(cloneBody, null, 2));

  const cloneRes = await fetch(`${BASE_URL}/voice_clone`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cloneBody),
  });

  console.log('Clone status:', cloneRes.status);
  const cloneData = await cloneRes.json();
  console.log('Clone response:', JSON.stringify(cloneData, null, 2));

  if (cloneData.base_resp && cloneData.base_resp.status_code !== 0) {
    console.error('❌ Clone failed:', cloneData.base_resp);
    process.exit(1);
  }
  console.log('✅ Voice cloned with voice_id:', voiceId);

  // Wait a bit for processing
  console.log('\n⏳ Waiting 2 seconds...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 3: TTS
  console.log('\n━━━━ STEP 3: TTS ━━━━');
  const ttsBody = {
    model: 'speech-2.6-hd',
    text: 'Привет! Это тестовая озвучка клонированным голосом.',
    voice_setting: {
      voice_id: voiceId,
    },
    audio_setting: {
      format: 'mp3',
    },
  };

  console.log('TTS request:', JSON.stringify(ttsBody, null, 2));

  const ttsRes = await fetch(`${BASE_URL}/t2a_v2`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ttsBody),
  });

  console.log('TTS status:', ttsRes.status);
  const ttsData = await ttsRes.json();
  console.log('TTS response:', JSON.stringify(ttsData, null, 2));
  console.log('TTS response keys:', Object.keys(ttsData));

  if (ttsData.audio_file) {
    console.log('\n✅✅✅ SUCCESS! audio_file found:', ttsData.audio_file.substring(0, 50) + '...');
  } else if (ttsData.audio_url) {
    console.log('\n✅✅✅ SUCCESS! audio_url found:', ttsData.audio_url);
  } else {
    console.error('\n❌❌❌ FAILED! No audio in response');
    console.error('base_resp:', ttsData.base_resp);
  }
}

fullCycle().catch(console.error);
