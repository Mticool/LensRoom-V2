import { fetchWithTimeout } from './fetch-with-timeout';

export class MiniMaxAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'MiniMaxAPIError';
  }

  static async fromResponse(response: Response): Promise<MiniMaxAPIError> {
    let details: any;
    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }
    
    const message = details?.base_resp?.status_msg || details?.message || `MiniMax API error: ${response.status}`;
    return new MiniMaxAPIError(message, response.status, details);
  }
}

export interface MiniMaxUploadResponse {
  file_id: number;
}

export interface MiniMaxVoiceCloneResponse {
  voice_id: string;
}

export interface MiniMaxTTSResponse {
  audio_url?: string;
  audio_file?: string;
}

export interface MiniMaxVoice {
  voice_id: string;
  name: string;
  language?: string;
  gender?: string;
  description?: string;
}

// Preset system voices from MiniMax (Russian voices only)
export const MINIMAX_SYSTEM_VOICES: MiniMaxVoice[] = [
  // Russian-speaking voices (use Chinese/multilingual voices that support Russian)
  { voice_id: 'male-qn-qingse', name: 'Мужской голос (молодой)', language: 'ru', gender: 'male', description: 'Молодой мужской голос' },
  { voice_id: 'male-qn-jingying', name: 'Мужской голос (деловой)', language: 'ru', gender: 'male', description: 'Деловой мужской голос' },
  { voice_id: 'male-qn-badao', name: 'Мужской голос (властный)', language: 'ru', gender: 'male', description: 'Властный мужской голос' },
  { voice_id: 'male-qn-daxuesheng', name: 'Мужской голос (студент)', language: 'ru', gender: 'male', description: 'Голос молодого студента' },
  { voice_id: 'female-shaonv', name: 'Женский голос (молодой)', language: 'ru', gender: 'female', description: 'Молодой женский голос' },
  { voice_id: 'female-yujie', name: 'Женский голос (элегантный)', language: 'ru', gender: 'female', description: 'Элегантный женский голос' },
  { voice_id: 'female-chengshu', name: 'Женский голос (зрелый)', language: 'ru', gender: 'female', description: 'Зрелый женский голос' },
  { voice_id: 'female-tianmei', name: 'Женский голос (милый)', language: 'ru', gender: 'female', description: 'Милый женский голос' },
];

export class MiniMaxClient {
  private apiKey: string;
  private baseUrl = 'https://api.minimax.io/v1';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('MINIMAX_API_KEY is required');
    }
    this.apiKey = apiKey;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private generateVoiceId(): string {
    const timestamp = Date.now().toString(36);
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    return `voice${timestamp}${randomSuffix}`;
  }


  async uploadAudio(file: File): Promise<MiniMaxUploadResponse> {
    const endpoint = `${this.baseUrl}/files/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', 'voice_clone'); // Required by MiniMax API

    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: this.headers,
      body: formData,
      timeout: 60000, // 60s for audio file upload
    });

    if (!response.ok) {
      throw await MiniMaxAPIError.fromResponse(response);
    }

    const data = (await response.json()) as any;
    console.log('[MiniMax Upload] Response:', JSON.stringify(data, null, 2));
    
    // Check various possible response formats from MiniMax API
    // According to docs: { "file": { "file_id": "123456789012345678" } }
    const fileId = data?.file?.file_id || data?.file_id || data?.data?.file_id || data?.id;
    
    if (!fileId) {
      console.error('[MiniMax Upload] Missing file_id in response:', data);
      throw new MiniMaxAPIError('MiniMax upload missing file_id', response.status, data);
    }
    
    console.log('[MiniMax Upload] Extracted file_id:', fileId);
    // CRITICAL: file_id must be a number (integer) according to MiniMax API docs
    return { file_id: fileId };
  }

  async cloneVoice(params: {
    file_id: number;
    voice_id?: string;
    model?: string;
    text?: string;
    language_boost?: string;
  }): Promise<MiniMaxVoiceCloneResponse> {
    const endpoint = `${this.baseUrl}/voice_clone`;

    // Генерируем уникальный voice_id
    const voiceId = params.voice_id || this.generateVoiceId();
    
    const requestBody: Record<string, unknown> = {
      file_id: Number(params.file_id),
      voice_id: voiceId,
    };

    if (params.text) {
      requestBody.text = params.text;
      requestBody.model = params.model || 'speech-2.8-hd';
    }

    if (params.language_boost) {
      requestBody.language_boost = params.language_boost;
    }

    console.log('[MiniMax Clone] Request:', JSON.stringify(requestBody, null, 2));
    console.log('[MiniMax Clone] file_id type:', typeof requestBody.file_id, 'value:', requestBody.file_id);

    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      timeout: 120000, // 2 minutes for voice cloning
    });

    if (!response.ok) {
      throw await MiniMaxAPIError.fromResponse(response);
    }

    const data = (await response.json()) as any;
    console.log('[MiniMax Clone] Response:', JSON.stringify(data, null, 2));
    
    // Проверка статуса
    if (data.base_resp) {
      const statusCode = data.base_resp.status_code;
      const statusMsg = data.base_resp.status_msg;
      
      console.log('[MiniMax Clone] status_code:', statusCode);
      console.log('[MiniMax Clone] status_msg:', statusMsg);
      
      if (statusCode !== 0) {
        console.error('[MiniMax Clone] ❌ Cloning FAILED!');
        console.error('[MiniMax Clone] Error:', statusMsg);
        throw new MiniMaxAPIError(
          `Voice cloning failed: ${statusMsg}`,
          response.status,
          data
        );
      }
    }
    
    // Возвращаем voice_id (который мы отправили или пришёл в ответе)
    const returnedVoiceId = data.voice_id || voiceId;
    
    console.log('[MiniMax Clone] ✅ Clone successful! voice_id:', returnedVoiceId);
    return { voice_id: returnedVoiceId };
  }

  async generateTTS(params: {
    text: string;
    voice_id: string;
  }): Promise<MiniMaxTTSResponse> {
    const endpoint = `${this.baseUrl}/t2a_v2`;

    // DIAGNOSTIC: Validate input
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[MiniMax TTS DIAGNOSTIC] Starting TTS request');
    console.log('[MiniMax TTS DIAGNOSTIC] Endpoint:', endpoint);
    console.log('[MiniMax TTS DIAGNOSTIC] Input text length:', params.text.length);
    console.log('[MiniMax TTS DIAGNOSTIC] Input voice_id:', params.voice_id);

    // CORRECT: MiniMax requires nested structure
    const requestBody = {
      model: 'speech-2.8-hd',
      text: params.text,
      voice_setting: {
        voice_id: params.voice_id,
      },
      audio_setting: {
        format: 'mp3',
      },
    };

    console.log('[MiniMax TTS DIAGNOSTIC] Request payload:');
    console.log(JSON.stringify(requestBody, null, 2));

    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      timeout: 120000, // 2 minutes for TTS generation
    });

    console.log('[MiniMax TTS DIAGNOSTIC] HTTP Status:', response.status, response.statusText);

    if (!response.ok) {
      throw await MiniMaxAPIError.fromResponse(response);
    }

    const data = (await response.json()) as any;
    
    // DIAGNOSTIC: Show full response structure
    console.log('[MiniMax TTS DIAGNOSTIC] Full response:');
    console.log(JSON.stringify(data, null, 2));
    console.log('[MiniMax TTS DIAGNOSTIC] Response keys:', Object.keys(data));
    
    if (data.base_resp) {
      console.log('[MiniMax TTS DIAGNOSTIC] base_resp:', data.base_resp);
      if (data.base_resp.status_code !== 0) {
        throw new MiniMaxAPIError(
          `MiniMax TTS error: ${data.base_resp.status_msg}`,
          response.status,
          data
        );
      }
    }

    // DIAGNOSTIC: Search for audio in ALL possible locations
    const possiblePaths = [
      { path: 'audio', value: data?.audio },
      { path: 'audio_file', value: data?.audio_file },
      { path: 'audio_url', value: data?.audio_url },
      { path: 'data.audio', value: data?.data?.audio },
      { path: 'data.audio_file', value: data?.data?.audio_file },
      { path: 'data.audio_url', value: data?.data?.audio_url },
      { path: 'extra_info.audio_file', value: data?.extra_info?.audio_file },
      { path: 'extra_info.audio_url', value: data?.extra_info?.audio_url },
    ];

    console.log('[MiniMax TTS DIAGNOSTIC] Searching for audio in all possible paths:');
    possiblePaths.forEach(({ path, value }) => {
      if (value) {
        const preview = typeof value === 'string' ? value.substring(0, 50) + '...' : 'present';
        console.log(`  ✅ Found at ${path}:`, preview);
      } else {
        console.log(`  ❌ Not found at ${path}`);
      }
    });

    // Extract audio from response
    const audioFile = data?.audio_file || data?.audio || data?.data?.audio_file || data?.data?.audio || data?.extra_info?.audio_file;
    const audioUrl = data?.audio_url || data?.data?.audio_url || data?.extra_info?.audio_url;

    if (!audioFile && !audioUrl) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('[MiniMax TTS DIAGNOSTIC] ❌ NO AUDIO FOUND');
      console.error('[MiniMax TTS DIAGNOSTIC] Possible causes:');
      console.error('  1. voice_id does not exist in MiniMax');
      console.error('  2. voice_id was not successfully cloned');
      console.error('  3. Request format is incorrect');
      console.error('  4. Model mismatch between cloning and TTS');
      console.error('[MiniMax TTS DIAGNOSTIC] Request sent:');
      console.error(JSON.stringify(requestBody, null, 2));
      console.error('[MiniMax TTS DIAGNOSTIC] Response received:');
      console.error(JSON.stringify(data, null, 2));
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      throw new MiniMaxAPIError('MiniMax returned no audio data', response.status, data);
    }

    console.log('[MiniMax TTS DIAGNOSTIC] ✅ SUCCESS - Audio found!');
    console.log('[MiniMax TTS DIAGNOSTIC] audio_file:', audioFile ? `present (${audioFile.length} chars)` : 'none');
    console.log('[MiniMax TTS DIAGNOSTIC] audio_url:', audioUrl || 'none');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return {
      audio_file: audioFile,
      audio_url: audioUrl,
    };
  }
}

let minimaxClientInstance: MiniMaxClient | null = null;

export function getMiniMaxClient(): MiniMaxClient {
  if (!minimaxClientInstance) {
    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      throw new Error('MINIMAX_API_KEY environment variable is not set');
    }
    minimaxClientInstance = new MiniMaxClient(apiKey);
  }
  return minimaxClientInstance;
}