# ✅ UI UPDATES COMPLETE

**Date:** 2026-01-26  
**Status:** ALL CHANGES IMPLEMENTED

---

## ИЗМЕНЕНИЯ

### 1. ✅ Grok Video: Простой Image Input
**Было:** Tabs "Frames/Ingredients" + Start/End frames  
**Стало:** Простой "Reference Image (Optional)" для I2V mode

**Изменения:**
- `models.ts`: `supportsFirstLastFrame: false` для Grok Video
- `VideoGeneratorHiru.tsx`: Добавлен `useSimpleImageInput` для Grok и Sora
- Показывается один upload area вместо tabs

---

### 2. ✅ Sora 2: Reference Image включен
**Было:** Нет загрузки изображений  
**Стало:** Простой "Reference Image (Optional)" для I2V mode

**Изменения:**
- `VideoGeneratorHiru.tsx`: `useSimpleImageInput` включает Sora 2
- Добавлен `referenceImage` state
- Передается в API через `onGenerate()`

---

### 3. ✅ Kling 2.6: Audio Pricing
**Было:** Audio не влияет на цену  
**Стало:** Audio toggle + увеличение цены на +30 credits

**Изменения:**
- Добавлен `audioEnabled` state
- Добавлен "Audio Generation" toggle с tooltip
- `calculateCost()`: если `audioEnabled` для Kling 2.6 или Grok → +30 credits
- Tooltip: "Generate synchronized audio for your video (+30 credits)"

---

### 4. ✅ Motion Control: Pricing Info
**Было:** Нет информации о ценообразовании  
**Стало:** Blue info block с пояснением

**Добавлено:**
```tsx
<div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
  <div className="flex items-start gap-2">
    <Info className="w-4 h-4 text-blue-400" />
    <div className="text-xs text-blue-200">
      <span className="font-semibold">Per-second pricing:</span> Cost depends on your motion video duration.
      {quality === '720p' && ' 16 credits/second at 720p'}
      {quality === '1080p' && ' 25 credits/second at 1080p'}
    </div>
  </div>
</div>
```

---

## ФАЙЛЫ

### Изменённые:
1. **`src/config/models.ts`**
   - Grok Video: `supportsFirstLastFrame: false`

2. **`src/components/video/VideoGeneratorHiru.tsx`**
   - Добавлен `referenceImage` state (простой I2V input)
   - Добавлен `audioEnabled` state
   - Добавлен `useSimpleImageInput` для Grok + Sora
   - Обновлён `calculateCost()` для audio pricing
   - Добавлен Audio Generation toggle
   - Добавлен Pricing Info в Motion Control
   - Conditional rendering: `useSimpleImageInput` → показать простой input, иначе tabs

---

## ТЕСТИРОВАНИЕ

### Grok Video:
- [x] НЕ показывает tabs "Frames/Ingredients"
- [x] Показывает простой "Reference Image (Optional)"
- [x] Purple gradient с hover effect
- [x] Upload работает корректно
- [x] Cost 25 по умолчанию
- [ ] Audio toggle увеличивает до 55 (25 + 30)

### Sora 2:
- [x] НЕ показывает tabs
- [x] Показывает "Reference Image (Optional)"
- [x] Gradient purple→blue→cyan
- [x] Upload работает корректно
- [x] Cost 250 по умолчанию (10s)

### Kling 2.6:
- [x] Показывает "Audio Generation" toggle
- [x] Tooltip: "+30 credits"
- [ ] Cost при audio OFF: 105 (5s), 210 (10s)
- [ ] Cost при audio ON: 135 (5s), 240 (10s)

### Motion Control:
- [x] Показывает blue info block
- [x] Текст: "Per-second pricing: Cost depends on your motion video duration"
- [x] Динамическое отображение: "16 credits/second at 720p" / "25 credits/second at 1080p"

---

## СТРУКТУРА КОДА

### Simple Image Input Logic:
```typescript
// Grok и Sora используют простой I2V input
const useSimpleImageInput = ['grok-video', 'sora-2'].includes(selectedModel) && supportsI2v;

{useSimpleImageInput && (
  <label>
    <input onChange={(e) => setReferenceImage(e.target.files?.[0] || null)} />
    <div>Reference Image (Optional)</div>
  </label>
)}

// Frames/Ingredients только если НЕ useSimpleImageInput
{!useSimpleImageInput && (supportsStartEndFrames || supportsReferenceImages) && (
  <div>Tabs: Frames | Ingredients</div>
)}
```

### Audio Pricing Logic:
```typescript
const calculateCost = () => {
  let baseCost = pricing[duration] || 22;
  
  // Kling 2.6 & Grok: Audio adds +30 credits
  if ((selectedModel === 'kling-2.6' || selectedModel === 'grok-video') && audioEnabled) {
    baseCost += 30;
  }
  
  return baseCost;
};
```

---

## READY FOR TESTING ✅

**All UI changes implemented!**  
**No linter errors!**  
**Ready for user review!**

**Test URL:** http://localhost:3000/create/studio?section=video
