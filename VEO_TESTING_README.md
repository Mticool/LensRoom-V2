# Veo 3.1 Testing Guide

## 🚀 Quick Start

### Run All Tests
```bash
npm run test:veo:all
```

### Individual Tests

#### 1. Model Transformation Tests
```bash
npm run test:veo
```
Tests все варианты трансформации моделей (12 тестов)

#### 2. Model Availability Check
```bash
npm run test:veo:check
```
Проверяет доступность всех 8 вариантов Veo моделей и выводит usage guide

---

## 📊 Test Coverage

### Unit Tests (`test-veo-models.ts`)
- ✅ 4 теста: модели без референсов
- ✅ 4 теста: модели с референсами
- ✅ 2 теста: защита от двойной трансформации
- ✅ 2 теста: другие модели не затронуты
- ✅ 8 проверок констант
- ✅ 3 примера API payloads

**Всего: 12 тестов + 8 проверок констант**

### Integration Check (`check-veo-availability.ts`)
- ✅ Список всех 8 моделей
- ✅ Usage guide с примерами
- ✅ Логика выбора модели
- ✅ Требования API
- ✅ Итоговая сводка

---

## 🎯 Expected Results

### Success Output
```
🧪 Testing Veo 3.1 Model Transformations
════════════════════════════════════════════════════════════════════════════════
✅ Test 1: PASS
✅ Test 2: PASS
...
✅ Test 12: PASS

📊 Test Results: 12 passed, 0 failed out of 12 tests

🔍 Verifying LAOZHANG_MODELS constants:
✅ VEO_31: "veo-3.1"
✅ VEO_31_FAST: "veo-3.1-fast"
...

✅ ✅ ✅ ALL TESTS PASSED! ✅ ✅ ✅
```

---

## 🐛 Troubleshooting

### Test Failures
If tests fail, check:
1. **laozhang-client.ts** - убедитесь, что логика трансформации правильная
2. **Константы** - проверьте `LAOZHANG_MODELS` объект
3. **Синтаксис** - запустите `npm run lint`

### Example Fix
```typescript
// ❌ Wrong
if (hasReferenceImages) {
  finalModel = `${baseName}-fl-${lastPart}`; // veo-3.1-fl-fast
}

// ✅ Correct
if (hasReferenceImages) {
  finalModel = `${params.model}-fl`; // veo-3.1-fast-fl
}
```

---

## 📦 Files

| File | Purpose |
|------|---------|
| `test-veo-models.ts` | Unit tests для трансформации моделей |
| `check-veo-availability.ts` | Проверка доступности и usage guide |
| `VEO_3_1_COMPLETE.md` | Полная документация интеграции |
| `VEO_REFERENCE_IMAGES_FIX.md` | История исправления бага |

---

## 🚀 Деплой

После успешных тестов:
```bash
# Полная проверка
npm run test:veo:all
npm run lint
npm run type-check

# Деплой
./deploy-quick.sh
```

---

## 📝 Test Scenarios

### Scenario 1: Text-to-Video (no refs)
```typescript
Input:  { model: "veo-3.1-fast", referenceImages: [] }
Output: { model: "veo-3.1-fast" }  // No transformation
```

### Scenario 2: With Reference Images
```typescript
Input:  { model: "veo-3.1-fast", referenceImages: [img1, img2] }
Output: { model: "veo-3.1-fast-fl" }  // Auto-transformed
```

### Scenario 3: Already has -fl
```typescript
Input:  { model: "veo-3.1-fast-fl", referenceImages: [img1] }
Output: { model: "veo-3.1-fast-fl" }  // No double transformation
```

---

## ✅ Ready for Production

После прохождения всех тестов:
- ✅ All 12 tests passed
- ✅ All 8 constants verified
- ✅ API payloads correct
- ✅ Documentation complete

**Status**: 🎉 Production Ready!
