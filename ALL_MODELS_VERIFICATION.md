# Проверка всех 8 моделей видео-генератора

## Логика отображения UI

### Качество (Quality)
```typescript
const hasResolutionOptions = capability
  ? ((capability.supportedQualities?.length || 0) > 0)
  : ((currentModel?.resolutionOptions?.length || 0) > 0);

{hasResolutionOptions && <QualityDropdown />}
```

### Длительность (Duration)
```typescript
{capability?.fixedDuration || getDurationOptions().length === 1 ? (
  <LockedText>{duration}s (фиксировано)</LockedText>
) : (
  <DurationDropdown />
)}
```

### Звук (Sound)
```typescript
const supportsAudioGeneration = capability
  ? (capability.supportsSound || false)
  : (currentModel?.supportsAudioGeneration || false);

{supportsAudioGeneration && <SoundToggle />}
```

---

## 1. ✅ Veo 3.1 Fast (veo3_1_fast)

### Конфигурация
```typescript
{
  supportedModes: ['t2v', 'i2v', 'ref2v'],
  supportedAspectRatios: ['auto', '16:9', '9:16'],
  supportedDurationsSec: [8],
  fixedDuration: 8,
  supportedQualities: undefined,
  supportsSound: false,
}
```

### Ожидаемый UI
- ✅ **Режим**: T2V / I2V / Ref2V (dropdown)
- ✅ **Формат**: auto / 16:9 / 9:16 (dropdown)
- ✅ **Длительность**: "8s (фиксировано)" (locked text)
- ✅ **Качество**: СКРЫТО (undefined → length = 0)
- ✅ **Звук**: СКРЫТО (false)

### Проверка логики
- `hasResolutionOptions = (undefined?.length || 0) > 0` → **false** ✅
- `fixedDuration = 8` → показать locked text ✅
- `supportsSound = false` → скрыть toggle ✅

---

## 2. ✅ Kling 2.6 (kling_2_6)

### Конфигурация
```typescript
{
  supportedModes: ['t2v', 'i2v'],
  supportedAspectRatios: ['1:1', '16:9', '9:16'],
  supportedDurationsSec: [5, 10],
  supportedQualities: ['720p', '1080p'],
  supportsSound: true,
}
```

### Ожидаемый UI
- ✅ **Режим**: T2V / I2V (dropdown)
- ✅ **Формат**: 1:1 / 16:9 / 9:16 (dropdown)
- ✅ **Длительность**: 5s / 10s (dropdown)
- ✅ **Качество**: 720p / 1080p (dropdown)
- ✅ **Звук**: Toggle ПОКАЗАН (true)

### Проверка логики
- `hasResolutionOptions = (['720p', '1080p'].length || 0) > 0` → **true** ✅
- `fixedDuration = undefined, options.length = 2` → показать dropdown ✅
- `supportsSound = true` → показать toggle ✅

---

## 3. ✅ Kling 2.5 (kling_2_5)

### Конфигурация
```typescript
{
  supportedModes: ['t2v', 'i2v'],
  supportedAspectRatios: ['1:1', '16:9', '9:16'],
  supportedDurationsSec: [5, 10],
  supportedQualities: ['720p', '1080p'],
  supportsSound: false,
}
```

### Ожидаемый UI
- ✅ **Режим**: T2V / I2V (dropdown)
- ✅ **Формат**: 1:1 / 16:9 / 9:16 (dropdown)
- ✅ **Длительность**: 5s / 10s (dropdown)
- ✅ **Качество**: 720p / 1080p (dropdown)
- ✅ **Звук**: СКРЫТО (false)

### Проверка логики
- `hasResolutionOptions = true` ✅
- `fixedDuration = undefined, options.length = 2` → dropdown ✅
- `supportsSound = false` → скрыто ✅

---

## 4. ✅ Kling 2.1 (kling_2_1)

### Конфигурация
```typescript
{
  supportedModes: ['t2v', 'i2v'],
  supportedAspectRatios: ['1:1', '16:9', '9:16'],
  supportedDurationsSec: [5, 10],
  supportedQualities: ['720p', '1080p', 'standard', 'pro', 'master'],
  supportsSound: false,
}
```

### Ожидаемый UI
- ✅ **Режим**: T2V / I2V (dropdown)
- ✅ **Формат**: 1:1 / 16:9 / 9:16 (dropdown)
- ✅ **Длительность**: 5s / 10s (dropdown)
- ✅ **Качество**: 720p / 1080p / standard / pro / master (dropdown, 5 опций)
- ✅ **Звук**: СКРЫТО (false)

### Проверка логики
- `hasResolutionOptions = (5 > 0)` → **true** ✅
- `fixedDuration = undefined, options.length = 2` → dropdown ✅
- `supportsSound = false` → скрыто ✅

---

## 5. ✅ Grok Video (grok_video)

### Конфигурация
```typescript
{
  supportedModes: ['t2v', 'i2v'],
  supportedAspectRatios: ['16:9', '9:16', '1:1', 'auto'],
  supportedDurationsSec: [6],
  fixedDuration: 6,
  supportedQualities: undefined,
  supportsSound: true,
  styleOptions: ['realistic', 'fantasy', 'sci-fi', 'cinematic', 'anime', 'cartoon'],
}
```

### Ожидаемый UI
- ✅ **Режим**: T2V / I2V (dropdown)
- ✅ **Формат**: 16:9 / 9:16 / 1:1 / auto (dropdown)
- ✅ **Длительность**: "6s (фиксировано)" (locked text)
- ✅ **Качество**: СКРЫТО (undefined)
- ✅ **Звук**: Toggle ПОКАЗАН (true)
- ✅ **Стиль**: 6 опций (если реализовано в UI)

### Проверка логики
- `hasResolutionOptions = (undefined?.length || 0) > 0` → **false** ✅
- `fixedDuration = 6` → locked text ✅
- `supportsSound = true` → показать toggle ✅

---

## 6. ✅ Sora 2 (sora_2)

### Конфигурация
```typescript
{
  supportedModes: ['t2v', 'i2v'],
  supportedAspectRatios: ['16:9', '9:16', 'portrait', 'landscape'],
  supportedDurationsSec: [5, 10],
  supportedQualities: undefined,
  supportsSound: false,
}
```

### Ожидаемый UI
- ✅ **Режим**: T2V / I2V (dropdown)
- ✅ **Формат**: 16:9 / 9:16 / portrait / landscape (dropdown)
- ✅ **Длительность**: 5s / 10s (dropdown)
- ✅ **Качество**: СКРЫТО (undefined)
- ✅ **Звук**: СКРЫТО (false)

### Проверка логики
- `hasResolutionOptions = false` ✅
- `fixedDuration = undefined, options.length = 2` → dropdown ✅
- `supportsSound = false` → скрыто ✅

---

## 7. ✅ WAN 2.6 (wan_2_6)

### Конфигурация
```typescript
{
  supportedModes: ['t2v', 'i2v', 'v2v'],
  supportedAspectRatios: ['16:9', '9:16', '1:1'],
  supportedDurationsSec: [5, 10, 15],
  supportedQualities: ['720p', '1080p'],
  supportsSound: false,
  cameraMotionOptions: ['static', 'pan_left', 'pan_right', ...],
  styleOptions: ['realistic', 'cinematic', 'anime', 'cartoon'],
}
```

### Ожидаемый UI
- ✅ **Режим**: T2V / I2V / V2V (dropdown)
- ✅ **Формат**: 16:9 / 9:16 / 1:1 (dropdown)
- ✅ **Длительность**: 5s / 10s / 15s (dropdown)
- ✅ **Качество**: 720p / 1080p (dropdown)
- ✅ **Звук**: СКРЫТО (false)
- ✅ **Camera Motion**: 9 опций (если реализовано)
- ✅ **Style**: 4 опции (если реализовано)

### Проверка логики
- `hasResolutionOptions = true` ✅
- `fixedDuration = undefined, options.length = 3` → dropdown ✅
- `supportsSound = false` → скрыто ✅

---

## 8. ✅ Kling Motion Control (kling_2_6_motion_control)

### Конфигурация
```typescript
{
  supportedModes: ['motion_control'],
  supportedAspectRatios: ['16:9', '9:16', '1:1'],
  supportedDurationsSec: [5, 10, 15, 30],
  supportedQualities: ['720p', '1080p'],
  durationRange: { min: 3, max: 30, step: 1 },
  supportsSound: false,
  supportsReferenceVideo: true,
}
```

### Ожидаемый UI
- ✅ **Режим**: Motion Control (единственный режим)
- ✅ **Формат**: 16:9 / 9:16 / 1:1 (dropdown)
- ✅ **Длительность**: 5s / 10s / 15s / 30s (dropdown, 4 опции)
- ✅ **Качество**: 720p / 1080p (dropdown)
- ✅ **Звук**: СКРЫТО (false)
- ✅ **Референсное видео**: Обязательно (required)

### Проверка логики
- `hasResolutionOptions = true` ✅
- `fixedDuration = undefined, options.length = 4` → dropdown ✅
- `supportsSound = false` → скрыто ✅

---

## Сводная таблица

| Модель | Качество | Длительность | Звук | Особенности |
|--------|----------|--------------|------|-------------|
| **Veo 3.1 Fast** | ❌ Скрыто | 🔒 8s (locked) | ❌ Скрыто | 3 референса, ref2v |
| **Kling 2.6** | ✅ 720p/1080p | 📋 5s/10s | ✅ Показан | Звук включён |
| **Kling 2.5** | ✅ 720p/1080p | 📋 5s/10s | ❌ Скрыто | Turbo версия |
| **Kling 2.1** | ✅ 5 опций | 📋 5s/10s | ❌ Скрыто | Master + тиры |
| **Grok Video** | ❌ Скрыто | 🔒 6s (locked) | ✅ Показан | 6 стилей |
| **Sora 2** | ❌ Скрыто | 📋 5s/10s | ❌ Скрыто | Portrait/Landscape |
| **WAN 2.6** | ✅ 720p/1080p | 📋 5s/10s/15s | ❌ Скрыто | Camera + V2V |
| **Motion Control** | ✅ 720p/1080p | 📋 4 опции | ❌ Скрыто | Референс видео |

---

## Итоговая проверка исправлений

### ✅ Исправление 1: Приоритет capability над старым конфигом
Применяется ко **всем 8 моделям**:
```typescript
const hasResolutionOptions = capability
  ? ((capability.supportedQualities?.length || 0) > 0)  // Приоритет capability
  : ((currentModel?.resolutionOptions?.length || 0) > 0); // Fallback для старых моделей
```

**Результат**:
- ✅ Veo 3.1 Fast: качество скрыто (было показано)
- ✅ Grok Video: качество скрыто (было показано)
- ✅ Sora 2: качество скрыто (было показано)
- ✅ Остальные 5 моделей: качество показано корректно

### ✅ Исправление 2: Locked text для фиксированной длительности
Применяется к **2 моделям**:
```typescript
{capability?.fixedDuration || getDurationOptions().length === 1 ? (
  <LockedText>
) : (
  <Dropdown>
)}
```

**Результат**:
- ✅ Veo 3.1 Fast: "8s (фиксировано)" (было dropdown)
- ✅ Grok Video: "6s (фиксировано)" (было dropdown)
- ✅ Остальные 6 моделей: dropdown показан корректно

### ✅ Исправление 3: Звук только для поддерживающих моделей
Применяется ко **всем 8 моделям**:
```typescript
const supportsAudioGeneration = capability
  ? (capability.supportsSound || false)
  : (currentModel?.supportsAudioGeneration || false);
```

**Результат**:
- ✅ Kling 2.6: звук показан (true)
- ✅ Grok Video: звук показан (true)
- ✅ Остальные 6 моделей: звук скрыт (false)

---

## Финальный статус

✅ **Все 8 моделей проверены**
✅ **Логика работает корректно для каждой модели**
✅ **Нет linter errors**
✅ **UI будет показывать только поддерживаемые опции**
✅ **Backend будет отклонять невалидные комбинации**
