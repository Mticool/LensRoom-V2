# Нейросети и источники API на сайте LensRoom

Сводный список всех AI-сервисов, используемых на сайте, и откуда берётся API для каждого.

---

## 1. Генерация изображений (фото)

| Модель / сервис | Провайдер API | URL API | Переменная окружения |
|-----------------|---------------|---------|----------------------|
| **Grok Imagine** (xAI) | KIE.ai Market | `https://api.kie.ai/api/v1/jobs/createTask` | `KIE_API_KEY` |
| **Nano Banana** | LaoZhang | `https://api.laozhang.ai/v1` | `LAOZHANG_API_KEY` |
| **Nano Banana Pro** | LaoZhang | `https://api.laozhang.ai/v1` | `LAOZHANG_API_KEY` |
| **Nano Banana / Nano Banana Pro** (альт.) | GenAIPro | `https://genaipro.vn/api/v1` | `GENAIPRO_API_KEY` |
| **Seedream 4.5** | KIE.ai Market | `https://api.kie.ai/api/v1/jobs/createTask` | `KIE_API_KEY` |
| **FLUX.2 Pro** | KIE.ai Market | `https://api.kie.ai/api/v1/jobs/createTask` | `KIE_API_KEY` |
| **Z-Image Turbo** | KIE.ai Market | `https://api.kie.ai/api/v1/jobs/createTask` | `KIE_API_KEY` |
| **Recraft Remove Background** | KIE.ai Market | `https://api.kie.ai/api/v1/jobs/createTask` | `KIE_API_KEY` |
| **Topaz Upscale** | KIE.ai Market | `https://api.kie.ai/api/v1/jobs/createTask` | `KIE_API_KEY` |
| **GPT Image 1.5** (OpenAI) | KIE.ai Market или OpenAI | KIE: `https://api.kie.ai`; OpenAI: `https://api.openai.com/v1` | `KIE_API_KEY` или `OPENAI_API_KEY` |

- Документация KIE: https://docs.kie.ai  
- LaoZhang: https://api.laozhang.ai  
- GenAIPro: https://genaipro.vn/docs-api  
- OpenAI Images: https://platform.openai.com/docs/guides/image-generation  

---

## 2. Генерация видео

| Модель / сервис | Провайдер API | URL API | Переменная окружения |
|-----------------|---------------|---------|----------------------|
| **Veo 3.1 Fast** (Google) | KIE.ai Veo | `https://api.kie.ai/api/v1/veo/generate` | `KIE_API_KEY` |
| **Veo 3.1** (альт.) | GenAIPro | `https://genaipro.vn/api/v1` | `GENAIPRO_API_KEY` |
| **Kling 2.1** | KIE.ai Market | `https://api.kie.ai/api/v1/jobs/createTask` | `KIE_API_KEY` |
| **Kling 2.5** | KIE.ai Market | `https://api.kie.ai/api/v1/jobs/createTask` | `KIE_API_KEY` |
| **Kling 2.6** | KIE.ai Market | `https://api.kie.ai/api/v1/jobs/createTask` | `KIE_API_KEY` |
| **Kling Motion Control** | KIE.ai Market | `https://api.kie.ai/api/v1/jobs/createTask` | `KIE_API_KEY` |
| **Grok Video** (xAI) | KIE.ai Market | `https://api.kie.ai/api/v1/jobs/createTask` | `KIE_API_KEY` |
| **Sora 2** (OpenAI) | LaoZhang | `https://api.laozhang.ai/v1` | `LAOZHANG_API_KEY` |
| **WAN 2.6** | KIE.ai Market | `https://api.kie.ai/api/v1/jobs/createTask` | `KIE_API_KEY` |
| **Kling O1** (I2V, first/last frame) | FAL.ai | `https://queue.fal.run` (fal-ai/kling-video/o1/...) | `FAL_KEY` |
| **Kling AI Avatar** (lip sync) | KIE.ai Market | `https://api.kie.ai/api/v1/jobs/createTask` | `KIE_API_KEY` |
| **InfiniteTalk** (480p / 720p, lip sync) | KIE.ai Market | `https://api.kie.ai/api/v1/jobs/createTask` | `KIE_API_KEY` |

- KIE Veo: https://docs.kie.ai (Veo API)  
- FAL Kling O1: https://fal.ai/models/fal-ai/kling-video/o1/standard/image-to-video  

---

## 3. Аудио: музыка и речь (TTS / клонирование голоса)

| Сервис | Провайдер API | URL API | Переменная окружения |
|--------|----------------|---------|----------------------|
| **Suno** (генерация, extend, cover, add-vocals, separate) | KIE.ai Market | `https://api.kie.ai` (ai-music-api/...) | `KIE_API_KEY` |
| **ElevenLabs V3 Text-to-Dialogue** | KIE.ai Market | `https://api.kie.ai` (elevenlabs/text-to-dialogue-v3) | `KIE_API_KEY` |
| **MiniMax TTS** (озвучка текста) | MiniMax | `https://api.minimax.io/v1`, `https://api-uw.minimax.io/v1/t2a_v2` | `MINIMAX_API_KEY` |
| **MiniMax клонирование голоса** | MiniMax | `https://api.minimax.io/v1` (voice_clone, files/upload) | `MINIMAX_API_KEY` |
| **FAL.ai ElevenLabs TTS** | FAL.ai | fal-ai/elevenlabs/tts/turbo-v2.5, eleven-v3 | `FAL_KEY` |
| **FAL.ai клонирование голоса** | FAL.ai | fal-ai/elevenlabs/voice-cloning | `FAL_KEY` |

- KIE ElevenLabs: https://kie.ai/elevenlabs/text-to-dialogue-v3  
- MiniMax: https://platform.minimax.io/docs  
- FAL.ai (ElevenLabs): используется через `fal` npm, ключ в `FAL_KEY`  

---

## 4. Сводная таблица по провайдерам API

| Провайдер | Что даёт | Base URL | Ключ в .env |
|-----------|----------|-----------|-------------|
| **KIE.ai** | Рынок моделей (фото/видео/аудио), Veo 3.1, Suno, ElevenLabs V3, Kling, Grok, WAN, lip sync | `https://api.kie.ai` | `KIE_API_KEY` |
| **LaoZhang** | Nano Banana, Nano Banana Pro, Sora 2 | `https://api.laozhang.ai/v1` | `LAOZHANG_API_KEY` |
| **GenAIPro** | Nano Banana, Nano Banana Pro (фото), Veo 3.1 (видео) | `https://genaipro.vn/api/v1` | `GENAIPRO_API_KEY` |
| **OpenAI** | GPT Image 1.5 (прямой путь) | `https://api.openai.com/v1` | `OPENAI_API_KEY` |
| **FAL.ai** | Kling O1 (видео), ElevenLabs TTS и voice cloning | `https://queue.fal.run` / fal.ai models | `FAL_KEY` |
| **MiniMax** | TTS, клонирование голоса, системные голоса | `https://api.minimax.io/v1` | `MINIMAX_API_KEY` |

---

## 5. Переменные окружения (.env.local)

```bash
# Обязательные для генерации
KIE_API_KEY=           # KIE.ai (фото, видео, аудио, lip sync)
LAOZHANG_API_KEY=      # LaoZhang (Nano Banana, Sora 2)
FAL_KEY=               # FAL.ai (Kling O1, TTS/voice clone)
MINIMAX_API_KEY=       # MiniMax (TTS, клонирование голоса)

# Опциональные / альтернативные
OPENAI_API_KEY=        # Прямой OpenAI (GPT Image 1.5)
GENAIPRO_API_KEY=      # GenAIPro (Nano Banana, Veo 3.1)

# Callbacks (KIE)
KIE_CALLBACK_URL=      # например https://lensroom.ru/api/webhooks/kie
KIE_CALLBACK_SECRET=   # секрет для webhook
```

Подробнее: `docs/ENV_API_KEYS_MAP.md`.
