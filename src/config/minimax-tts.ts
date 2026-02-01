// MiniMax T2A HTTP конфиг (фиксируем модель speech-2.8-hd)
// Источник: https://platform.minimax.io/docs/api-reference/speech-t2a-http

export const MINIMAX_T2A_ENDPOINT =
  process.env.MINIMAX_T2A_ENDPOINT || 'https://api-uw.minimax.io/v1/t2a_v2';

export const MINIMAX_T2A_MODEL =
  process.env.MINIMAX_T2A_MODEL || 'speech-2.8-hd';

export const DEFAULT_T2A_STREAM = false;
export const DEFAULT_LANGUAGE_BOOST = 'auto';
export const DEFAULT_CONTINUOUS_SOUND = false;

export const DEFAULT_VOICE_SETTING = {
  // Можно заменить на ваши ID клонированных голосов (русский по умолчанию)
  voice_id: 'Russian_expressive_narrator',
  speed: 1,
  vol: 1,
  pitch: 0,
};

export const DEFAULT_AUDIO_SETTING = {
  sample_rate: 32000,
  bitrate: 128000,
  format: 'mp3',
  channel: 1,
};

export const DEFAULT_VOICE_MODIFY = {
  pitch: 0,
  intensity: 0,
  timbre: 0,
  sound_effects: 'spacious_echo',
};