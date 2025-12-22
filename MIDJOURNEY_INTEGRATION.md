# Midjourney Integration via KIE.ai API

Интеграция Midjourney в LensRoom через KIE.ai API.

## 📦 Созданные файлы

### 1. Конфигурация MJ
**`src/config/midjourneyConfig.ts`**
- Типы: `MjSpeed`, `MjVersion`, `MjSettings`
- Константы: `MJ_SPEEDS`, `MJ_VERSIONS`, `MJ_ASPECT_RATIOS`, `MJ_LIMITS`
- Дефолты: `MJ_DEFAULT_SETTINGS`
- Функции: `calculateMjCost()`, `validateMjSettings()`, `parseMjPrompt()`

### 2. UI компонент
**`src/components/studio/MidjourneySettings.tsx`**
- Селектор версии (V7, V6.1, V6, V5.2, V5.1, Niji 6)
- Селектор скорости (Relaxed, Fast, Turbo)
- Слайдеры: Stylization, Weirdness, Variety
- Переключатель авто-перевода

### 3. API метод
**`src/lib/api/kie-client.ts`** - добавлен метод:
```typescript
generateMidjourney(params: {
  prompt: string;
  version?: '7' | '6.1' | '6' | '5.2' | '5.1' | 'niji6';
  speed?: 'relaxed' | 'fast' | 'turbo';
  aspectRatio?: string;
  stylization?: number;
  weirdness?: number;
  variety?: number;
  enableTranslation?: boolean;
  imageUrl?: string;
})
```

### 4. Модель в реестре
**`src/config/models.ts`** - добавлена модель:
```typescript
{
  id: 'midjourney',
  name: 'Midjourney V7',
  apiId: 'midjourney/text-to-image',
  // ...
}
```

---

## 🎛️ Параметры Midjourney

### Version (Версия)
| ID | Название | Описание |
|----|----------|----------|
| `7` | V7 | Новейшая версия, максимальное качество |
| `6.1` | V6.1 | Улучшенная детализация |
| `6` | V6 | Стабильная версия |
| `5.2` | V5.2 | Классический стиль MJ |
| `5.1` | V5.1 | Фотореалистичный стиль |
| `niji6` | Niji 6 | Аниме/манга стиль |

### Speed (Скорость)
| ID | Название | Множитель цены | Время |
|----|----------|----------------|-------|
| `relaxed` | Relaxed | 0.5x (экономия) | 2-3 мин |
| `fast` | Fast | 1x (стандарт) | 30-60 сек |
| `turbo` | Turbo | 2x | 15-30 сек |

### Stylization (Стилизация)
- **Диапазон:** 0-1000
- **Шаг:** 10
- **По умолчанию:** 100
- **Эффект:** Низкие значения = реалистичнее, высокие = более «MJ стиль»

### Weirdness (Необычность)
- **Диапазон:** 0-3000
- **Шаг:** 50
- **По умолчанию:** 0
- **Эффект:** Добавляет сюрреалистичные элементы

### Variety (Разнообразие)
- **Диапазон:** 0-100
- **Шаг:** 5
- **По умолчанию:** 0
- **Эффект:** Увеличивает различия между вариантами

### Aspect Ratios (Соотношения сторон)
Поддерживаются все стандартные MJ форматы:
`1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `2:3`, `3:2`, `5:6`, `6:5`, `2:1`, `1:2`

---

## 💰 Ценообразование

### Базовая стоимость: 10 ⭐ (для Fast)

| Скорость | Стоимость |
|----------|-----------|
| Relaxed | 5 ⭐ |
| Fast | 10 ⭐ |
| Turbo | 20 ⭐ |

---

## 🔌 API Запрос

### KIE.ai Endpoint
```
POST https://api.kie.ai/api/v1/jobs/createTask
```

### Request Body
```json
{
  "model": "midjourney/text-to-image",
  "input": {
    "prompt": "a beautiful landscape",
    "speed": "fast",
    "aspectRatio": "16:9",
    "version": "Version 7",
    "stylization": 100,
    "weirdness": 0,
    "variety": 0,
    "enableTranslation": true
  }
}
```

### Для Image-to-Image
```json
{
  "model": "midjourney/image-to-image",
  "input": {
    "prompt": "transform this into cyberpunk style",
    "imageUrl": "https://...",
    "speed": "fast",
    "version": "Version 7"
  }
}
```

---

## 🖥️ Использование в Studio

### 1. Подключение компонента
```tsx
import { MidjourneySettings } from '@/components/studio/MidjourneySettings';
import { MJ_DEFAULT_SETTINGS, type MjSettings } from '@/config/midjourneyConfig';

const [mjSettings, setMjSettings] = useState<MjSettings>(MJ_DEFAULT_SETTINGS);
```

### 2. Рендеринг (показывать когда выбран Midjourney)
```tsx
{selectedModel?.id === 'midjourney' && (
  <MidjourneySettings
    settings={mjSettings}
    onChange={setMjSettings}
    disabled={isGenerating}
  />
)}
```

### 3. Отправка запроса
```typescript
const response = await fetch('/api/generate/photo', {
  method: 'POST',
  body: JSON.stringify({
    model: 'midjourney',
    prompt: prompt,
    aspectRatio: aspectRatio,
    mjSettings: {
      version: mjSettings.version,
      speed: mjSettings.speed,
      stylization: mjSettings.stylization,
      weirdness: mjSettings.weirdness,
      variety: mjSettings.variety,
      enableTranslation: mjSettings.enableTranslation,
    },
    referenceImage: refImage, // для i2i
  }),
});
```

---

## 🧪 Тестирование

### Локально
```bash
# 1. Убедитесь что KIE API настроен
echo "KIE_API_KEY=..." >> .env.local

# 2. Запустите dev сервер
npm run dev

# 3. Откройте /create/studio
# 4. Выберите Midjourney
# 5. Проверьте настройки и сгенерируйте
```

### API тест
```bash
curl -X POST http://localhost:3000/api/generate/photo \
  -H "Content-Type: application/json" \
  -d '{
    "model": "midjourney",
    "prompt": "a beautiful sunset over mountains",
    "aspectRatio": "16:9",
    "mjSettings": {
      "version": "7",
      "speed": "fast",
      "stylization": 100
    }
  }'
```

---

## 📝 Советы пользователям

### Когда использовать Midjourney
- ✅ Художественные/арт изображения
- ✅ Постеры и баннеры
- ✅ Стилизованные портреты
- ✅ Фантастические сцены
- ✅ Когда нужен «характер» в картинке

### Когда НЕ использовать
- ❌ Фотореалистичные продуктовые снимки (лучше FLUX/Seedream)
- ❌ Текст на изображении (лучше Ideogram)
- ❌ Быстрые итерации (дороже других моделей)

### Рекомендации по версиям
- **V7** — для максимального качества и современного стиля
- **V6.1** — если V7 слишком «стилизованный»
- **Niji 6** — только для аниме/манга стиля
- **V5.2** — для «классического» MJ стиля

### Рекомендации по скорости
- **Relaxed** — экономия 50%, подходит когда не срочно
- **Fast** — баланс цены и скорости (рекомендуется)
- **Turbo** — максимальная скорость, но дороже в 2 раза

---

## 🐛 Troubleshooting

### "Model not found"
**Причина:** Неверный apiId
**Решение:** Убедитесь что используется `midjourney/text-to-image`

### "Invalid version"
**Причина:** Неверный формат версии
**Решение:** KIE API ожидает `"Version 7"`, не `"7"`

### "Ratio error"
**Причина:** Неподдерживаемое соотношение сторон
**Решение:** Используйте только поддерживаемые форматы из списка

---

## ✅ Чеклист интеграции

- [x] Конфиг `midjourneyConfig.ts`
- [x] UI компонент `MidjourneySettings.tsx`
- [x] API метод `generateMidjourney()`
- [x] Модель в `models.ts`
- [x] KIE модель в `kieModels.ts`
- [x] API route обновлён
- [x] Build успешен
- [ ] Интеграция в Studio UI (нужно добавить)
- [ ] Тестирование с реальным API

---

## 📚 Ссылки

- [KIE.ai MJ API Preview](https://kie.ai/model-preview/features/mj-api)
- [KIE.ai Documentation](https://docs.kie.ai)
- [Midjourney Official](https://www.midjourney.com)

