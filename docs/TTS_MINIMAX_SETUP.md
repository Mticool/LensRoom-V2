# MiniMax TTS (speech-2.8-hd) — быстрый запуск

## 1) Переменные окружения

Скопируйте `.env.example` в `.env.local` и укажите ключ MiniMax:

```
MINIMAX_API_KEY=ваш_ключ
MINIMAX_T2A_ENDPOINT=https://api-uw.minimax.io/v1/t2a_v2
MINIMAX_T2A_MODEL=speech-2.8-hd
```

> `MINIMAX_T2A_ENDPOINT` и `MINIMAX_T2A_MODEL` уже имеют дефолты, но можно переопределять.

## 2) Запуск

Из корня `lensroom-v2`:

```bash
npm install
npm run dev
```

Демо‑страница: `http://localhost:3000/tts-demo.html`

## 3) Пример curl (русский по умолчанию)

```bash
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Привет! Это тест <#1.0#> (laughs)",
    "voiceId": "Russian_expressive_narrator",
    "outputFormat": "hex"
  }'
```

Ответ:

```json
{
  "audioUrl": "data:audio/mp3;base64,...",
  "meta": {
    "audioLength": 11124,
    "sampleRate": 32000,
    "size": 179926,
    "bitrate": 128000,
    "wordCount": 163
  }
}
```