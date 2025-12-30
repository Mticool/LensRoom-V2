# Generator Structure - Complete Implementation Guide

**Дата:** 2025-12-30  
**Версия:** 2.0.0  
**Статус:** ✅ Implementation Ready  

---

## 📁 ЦЕЛЕВАЯ СТРУКТУРА

```
src/
├── components/
│   ├── generator/                    ✅ Основные компоненты генератора
│   │   ├── Canvas.tsx                ⭐ Центральная зона (универсальная)
│   │   ├── HistorySidebar.tsx        ✅ Левая панель (история + поиск)
│   │   ├── SettingsPanel.tsx         ⭐ Правая панель (настройки + генерация)
│   │   ├── PromptBar.tsx             ✅ Промпт-бар (ввод + файлы)
│   │   ├── ModelSelectionModal.tsx   ⭐ Модальное окно выбора модели
│   │   ├── SectionTabs.tsx           ✅ Вкладки секций (Text/Design/Video/Audio)
│   │   ├── GenerationMetadata.tsx    ✅ Метаданные результата
│   │   └── index.ts                  ✅ Экспорты
│   │
│   └── ui/                           ✅ Переиспользуемые UI компоненты
│       ├── button.tsx                ✅ Существует
│       ├── input.tsx                 ✅ Существует
│       ├── select.tsx                ✅ Существует
│       ├── dialog.tsx                ✅ Существует (для модалок)
│       ├── slider.tsx                ✅ Существует
│       ├── tabs.tsx                  ✅ Существует
│       └── ... (16 UI компонентов)   ✅ Все есть
│
├── config/
│   └── models.ts                     ✅ Unified модели (787 lines)
│
├── app/
│   ├── text/
│   │   └── page.tsx                  ⭐ Text generation (Canvas с mode='text')
│   │
│   ├── design/
│   │   ├── page.tsx                  ✅ Image generation (Canvas с mode='image')
│   │   └── [model]/
│   │       └── page.tsx              ✅ Specific model page
│   │
│   ├── video/
│   │   ├── page.tsx                  ✅ Video generation (Canvas с mode='video')
│   │   └── [model]/
│   │       └── page.tsx              ✅ Specific model page
│   │
│   └── audio/
│       ├── page.tsx                  ⭐ Audio generation (Canvas с mode='audio')
│       └── [model]/
│           └── page.tsx              ⭐ Specific model page
│
└── hooks/
    └── useGenerator.ts               ✅ Centralized generation logic
```

---

## 🎯 СТАТУС РЕАЛИЗАЦИИ

### ✅ Уже реализовано (70%)

```typescript
✅ components/ui/*                  - Все 16 UI компонентов
✅ config/models.ts                 - Unified конфигурация
✅ components/generator/
   ✅ HistorySidebar.tsx            - Левая панель
   ✅ PromptBar.tsx                 - Промпт-бар
   ✅ SectionTabs.tsx               - Вкладки секций
   ✅ GenerationMetadata.tsx        - Метаданные
   ✅ index.ts                      - Экспорты

✅ app/design/page.tsx              - Image generation
✅ app/design/[model]/page.tsx      - Specific image model
✅ app/video/page.tsx               - Video generation
✅ app/video/[model]/page.tsx       - Specific video model
✅ hooks/useGenerator.ts            - Generation logic
```

### ⭐ Требуется создать/обновить (30%)

```typescript
⭐ components/generator/
   ⭐ Canvas.tsx                    - Универсальный Canvas (NEW)
   ⭐ SettingsPanel.tsx             - Правая панель (rename from SettingsSidebar)
   ⭐ ModelSelectionModal.tsx       - Модальное окно (rename from ModelModal)

⭐ app/text/page.tsx                - Text generation
⭐ app/audio/page.tsx               - Audio generation
⭐ app/audio/[model]/page.tsx       - Specific audio model
```

---

## 📝 ПЛАН РЕАЛИЗАЦИИ

### Шаг 1: Создать универсальный Canvas

**Файл:** `src/components/generator/Canvas.tsx`

**Функционал:**
```typescript
interface CanvasProps {
  mode: 'text' | 'image' | 'video' | 'audio';
  modelId?: string;
  chatHistory: ChatMessage[];
  currentResult: GenerationResult | null;
  isGenerating: boolean;
  generationProgress: number;
  onExampleClick: (prompt: string) => void;
}

export function Canvas({ mode, modelId, ... }: CanvasProps) {
  // 1. Empty State
  //    - Model icon
  //    - Model description
  //    - Example prompts (3)
  
  // 2. Chat History
  //    - User messages (prompt + files)
  //    - AI responses (results)
  
  // 3. Result Display
  //    - Text: formatted text + copy button
  //    - Image: image preview + download
  //    - Video: video player + download
  //    - Audio: audio player + download
  
  // 4. Loading State
  //    - Progress bar
  //    - Generating animation
}
```

---

### Шаг 2: Переименовать SettingsSidebar → SettingsPanel

**Файл:** `src/components/generator/SettingsPanel.tsx`

**Изменения:**
```typescript
// Rename file
mv SettingsSidebar.tsx → SettingsPanel.tsx

// Update exports in index.ts
export { SettingsPanel } from './SettingsPanel';

// Update imports in pages
import { SettingsPanel } from '@/components/generator';
```

---

### Шаг 3: Переименовать ModelModal → ModelSelectionModal

**Файл:** `src/components/generator/ModelSelectionModal.tsx`

**Изменения:**
```typescript
// Rename file
mv ModelModal.tsx → ModelSelectionModal.tsx

// Update exports in index.ts
export { ModelSelectionModal } from './ModelSelectionModal';

// Update imports in pages
import { ModelSelectionModal } from '@/components/generator';
```

---

### Шаг 4: Создать страницу Text

**Файл:** `src/app/text/page.tsx`

```typescript
'use client';

import { useState, useCallback } from 'react';
import {
  HistorySidebar,
  Canvas,
  SettingsPanel,
  ModelSelectionModal
} from '@/components/generator';
import { getModelsByType } from '@/config/models';
import { useGenerator } from '@/hooks/useGenerator';

export default function TextPage() {
  const [showModelModal, setShowModelModal] = useState(false);
  const models = getModelsByType('text');
  
  const {
    currentModel,
    setCurrentModel,
    prompt,
    setPrompt,
    settings,
    updateSetting,
    isGenerating,
    generationProgress,
    chatHistory,
    currentResult,
    generations,
    userBalance,
    handleGenerate,
    handleNewChat,
    handleSelectGeneration
  } = useGenerator('text');

  return (
    <div className="flex h-screen">
      <HistorySidebar
        generations={generations}
        selectedGenerationId={currentResult?.id}
        onSelectGeneration={handleSelectGeneration}
        onNewChat={handleNewChat}
        userBalance={userBalance}
      />

      <Canvas
        mode="text"
        modelId={currentModel}
        chatHistory={chatHistory}
        currentResult={currentResult}
        isGenerating={isGenerating}
        generationProgress={generationProgress}
        onExampleClick={setPrompt}
      />

      <SettingsPanel
        mode="text"
        models={models}
        currentModel={currentModel}
        settings={settings}
        onModelSelect={(id) => setCurrentModel(id)}
        onModelClick={() => setShowModelModal(true)}
        onSettingChange={updateSetting}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        cost={10} // Calculate from currentModel + settings
      />

      <ModelSelectionModal
        isOpen={showModelModal}
        onClose={() => setShowModelModal(false)}
        models={models}
        currentModel={currentModel}
        onSelect={(id) => {
          setCurrentModel(id);
          setShowModelModal(false);
        }}
      />
    </div>
  );
}
```

---

### Шаг 5: Создать страницу Audio

**Файл:** `src/app/audio/page.tsx`

```typescript
// Same structure as Text page, but with mode='audio'
```

**Файл:** `src/app/audio/[model]/page.tsx`

```typescript
// Same structure as Design/Video [model] pages
```

---

## 🔄 ОБНОВЛЕНИЕ СУЩЕСТВУЮЩИХ СТРАНИЦ

### Design Page

**Файл:** `src/app/design/page.tsx`

**Обновить:**
```typescript
// Replace GeneratorCanvas → Canvas
// Replace SettingsSidebar → SettingsPanel
// Replace ModelModal → ModelSelectionModal

import {
  HistorySidebar,
  Canvas,              // ⬅️ NEW
  SettingsPanel,       // ⬅️ RENAMED
  ModelSelectionModal  // ⬅️ RENAMED
} from '@/components/generator';
```

---

### Video Page

**Файл:** `src/app/video/page.tsx`

**Обновить:**
```typescript
// Same changes as Design page
```

---

## 📦 КОМПОНЕНТЫ ДЕТАЛЬНО

### 1. Canvas.tsx (NEW)

**Ответственность:**
- Отображение пустого состояния (empty state)
- Отображение истории чата
- Отображение результатов генерации
- Отображение состояния загрузки
- Промпт-бар (интегрирован внизу)

**Пропсы:**
```typescript
interface CanvasProps {
  mode: 'text' | 'image' | 'video' | 'audio';
  modelId?: string;
  chatHistory: ChatMessage[];
  currentResult: GenerationResult | null;
  isGenerating: boolean;
  generationProgress: number;
  onExampleClick: (prompt: string) => void;
}
```

**Структура:**
```tsx
<div className="flex-1 flex flex-col">
  {/* Empty State */}
  {chatHistory.length === 0 && !currentResult && (
    <EmptyState
      mode={mode}
      modelId={modelId}
      onExampleClick={onExampleClick}
    />
  )}

  {/* Chat History */}
  {chatHistory.length > 0 && (
    <ChatHistory messages={chatHistory} />
  )}

  {/* Current Result */}
  {currentResult && (
    <ResultDisplay
      type={mode}
      result={currentResult}
    />
  )}

  {/* Loading State */}
  {isGenerating && (
    <LoadingState progress={generationProgress} />
  )}

  {/* Prompt Bar (fixed bottom) */}
  <div className="border-t border-[var(--border)] p-4">
    <PromptBar
      prompt={prompt}
      setPrompt={setPrompt}
      uploadedFiles={uploadedFiles}
      onFileSelect={onFileSelect}
      onRemoveFile={onRemoveFile}
      onGenerate={onGenerate}
      isGenerating={isGenerating}
      maxFiles={mode === 'video' ? 1 : 4}
    />
  </div>
</div>
```

---

### 2. HistorySidebar.tsx (EXISTS)

**Ответственность:**
- Кнопка "New Chat"
- Поиск по истории
- Список генераций (grouped by date)
- Отображение баланса

**Статус:** ✅ Уже реализован

---

### 3. SettingsPanel.tsx (RENAME)

**Ответственность:**
- Выбор модели (с кнопкой для модального окна)
- Динамические параметры (качество, стиль, и т.д.)
- Кнопка "Generate"
- Отображение стоимости
- Кнопка "Reset"

**Изменения:**
```typescript
// Rename from SettingsSidebar
// Keep all functionality
// Update component name in exports
```

**Статус:** ✅ Существует как `SettingsSidebar.tsx`, требуется переименование

---

### 4. PromptBar.tsx (EXISTS)

**Ответственность:**
- Textarea для промпта
- Кнопка прикрепления файлов
- Превью прикрепленных файлов
- Кнопка отправки
- Клавиатурные шортакты (Cmd+Enter)

**Статус:** ✅ Уже реализован

---

### 5. ModelSelectionModal.tsx (RENAME)

**Ответственность:**
- Отображение списка моделей
- Группировка моделей (если нужно)
- Выбор модели
- Отображение информации о модели (cost, badge, provider)

**Изменения:**
```typescript
// Rename from ModelModal
// Keep all functionality
// Update component name in exports
```

**Статус:** ✅ Существует как `ModelModal.tsx`, требуется переименование

---

### 6. SectionTabs.tsx (EXISTS)

**Ответственность:**
- Вкладки секций (Text, Design, Video, Audio)
- Активное состояние
- Навигация между секциями

**Статус:** ✅ Уже реализован

---

### 7. GenerationMetadata.tsx (EXISTS)

**Ответственность:**
- Отображение метаданных результата
- Model name, cost, duration, timestamp

**Статус:** ✅ Уже реализован

---

## 🔄 МИГРАЦИЯ СУЩЕСТВУЮЩИХ КОМПОНЕНТОВ

### Переименования

```bash
# 1. Rename SettingsSidebar → SettingsPanel
mv src/components/generator/SettingsSidebar.tsx \
   src/components/generator/SettingsPanel.tsx

# 2. Rename ModelModal → ModelSelectionModal
mv src/components/generator/ModelModal.tsx \
   src/components/generator/ModelSelectionModal.tsx

# 3. Rename GeneratorCanvas → Canvas
mv src/components/generator/GeneratorCanvas.tsx \
   src/components/generator/Canvas.tsx
```

### Обновить экспорты

**Файл:** `src/components/generator/index.ts`

```typescript
// Before
export { GeneratorCanvas } from './GeneratorCanvas';
export { SettingsSidebar } from './SettingsSidebar';
export { ModelModal } from './ModelModal';

// After
export { Canvas } from './Canvas';
export { SettingsPanel } from './SettingsPanel';
export { ModelSelectionModal } from './ModelSelectionModal';

// Keep existing
export { HistorySidebar } from './HistorySidebar';
export { PromptBar } from './PromptBar';
export { SectionTabs } from './SectionTabs';
export { GenerationMetadata } from './GenerationMetadata';
```

---

## 📄 ROUTING STRUCTURE

```
URL Path                    Component Structure
────────────────────────────────────────────────────────────────

/text
└─ page.tsx                 [HistorySidebar | Canvas | SettingsPanel]
                            mode='text'

/design
└─ page.tsx                 [HistorySidebar | Canvas | SettingsPanel]
                            mode='image'

/design/flux-pro
└─ [model]/page.tsx         [HistorySidebar | Canvas | SettingsPanel]
                            mode='image', modelId='flux-pro'

/video
└─ page.tsx                 [HistorySidebar | Canvas | SettingsPanel]
                            mode='video'

/video/kling-2.6
└─ [model]/page.tsx         [HistorySidebar | Canvas | SettingsPanel]
                            mode='video', modelId='kling-2.6'

/audio
└─ page.tsx                 [HistorySidebar | Canvas | SettingsPanel]
                            mode='audio'

/audio/eleven-labs
└─ [model]/page.tsx         [HistorySidebar | Canvas | SettingsPanel]
                            mode='audio', modelId='eleven-labs'
```

**Ключевой принцип:**
```typescript
// Все страницы используют одинаковую структуру
// Различаются только mode и modelId

<div className="flex h-screen">
  <HistorySidebar {...} />
  <Canvas mode={mode} modelId={modelId} {...} />
  <SettingsPanel mode={mode} {...} />
</div>
```

---

## 🎨 ВИЗУАЛЬНАЯ СТРУКТУРА

```
┌────────────────────────────────────────────────────────────────┐
│  Header (fixed top)                                            │
│  [Logo] [Text|Design|Video|Audio] [Balance|Profile]           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────┐  ┌────────────────────┐  ┌──────────────┐  │
│  │              │  │                    │  │              │  │
│  │  History     │  │       Canvas       │  │  Settings    │  │
│  │  Sidebar     │  │                    │  │  Panel       │  │
│  │              │  │  ┌──────────────┐  │  │              │  │
│  │  + New Chat  │  │  │ Empty State  │  │  │  Model       │  │
│  │  🔍 Search   │  │  │ or           │  │  │  [Selector]  │  │
│  │              │  │  │ Chat History │  │  │              │  │
│  │  📅 Today    │  │  │ or           │  │  │  Quality     │  │
│  │  - Gen 1     │  │  │ Result       │  │  │  [2K ▼]     │  │
│  │  - Gen 2     │  │  └──────────────┘  │  │              │  │
│  │              │  │                    │  │  Aspect      │  │
│  │  📅 Yesterday│  │  ┌──────────────┐  │  │  [9:16 ▼]   │  │
│  │  - Gen 3     │  │  │ Prompt Bar   │  │  │              │  │
│  │              │  │  │ [Type here]  │  │  │  Cost: 10⭐  │  │
│  │              │  │  │ 📎 ➤         │  │  │              │  │
│  │  Balance:    │  │  └──────────────┘  │  │  [Generate]  │  │
│  │  1000 ⭐     │  │                    │  │              │  │
│  └──────────────┘  └────────────────────┘  └──────────────┘  │
│                                                                │
│  280px              flex-1                  320px            │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔧 КОНФИГУРАЦИЯ МОДЕЛЕЙ

**Файл:** `src/config/models.ts`

**Статус:** ✅ Уже реализован (787 lines)

**Использование:**
```typescript
import { getModelsByType, getModelById } from '@/config/models';

// Get all models for a specific type
const textModels = getModelsByType('text');
const imageModels = getModelsByType('image');
const videoModels = getModelsByType('video');
const audioModels = getModelsByType('audio');

// Get specific model
const model = getModelById('flux-pro');
```

---

## 🪝 CUSTOM HOOKS

**Файл:** `src/hooks/useGenerator.ts`

**Статус:** ✅ Уже реализован

**Функционал:**
```typescript
export function useGenerator(mode: GenerationType) {
  return {
    // State
    currentModel: string;
    prompt: string;
    settings: Record<string, any>;
    isGenerating: boolean;
    generationProgress: number;
    chatHistory: ChatMessage[];
    currentResult: GenerationResult | null;
    generations: Generation[];
    userBalance: number;
    
    // Actions
    setCurrentModel: (id: string) => void;
    setPrompt: (prompt: string) => void;
    updateSetting: (key: string, value: any) => void;
    handleGenerate: () => Promise<void>;
    handleNewChat: () => void;
    handleSelectGeneration: (id: string) => void;
  };
}
```

---

## ✅ CHECKLIST РЕАЛИЗАЦИИ

### Шаг 1: Переименования ✅
```bash
☐ Rename SettingsSidebar.tsx → SettingsPanel.tsx
☐ Rename ModelModal.tsx → ModelSelectionModal.tsx
☐ Rename GeneratorCanvas.tsx → Canvas.tsx
☐ Update index.ts exports
```

### Шаг 2: Обновить существующие страницы ✅
```bash
☐ Update /design/page.tsx imports
☐ Update /design/[model]/page.tsx imports
☐ Update /video/page.tsx imports
☐ Update /video/[model]/page.tsx imports
```

### Шаг 3: Создать новые страницы ✅
```bash
☐ Create /text/page.tsx
☐ Create /audio/page.tsx
☐ Create /audio/[model]/page.tsx
```

### Шаг 4: Тестирование ✅
```bash
☐ Test /text page
☐ Test /design page
☐ Test /video page
☐ Test /audio page
☐ Test model selection modal
☐ Test generation flow
☐ Test history navigation
☐ Test settings changes
```

### Шаг 5: Документация ✅
```bash
☐ Update component documentation
☐ Update routing guide
☐ Update integration guide
☐ Create migration guide
```

---

## 🎯 ПРЕИМУЩЕСТВА НОВОЙ СТРУКТУРЫ

### 1. Единообразие
```typescript
✅ Все страницы используют одинаковые компоненты
✅ Единая структура layout
✅ Консистентный UX
```

### 2. Переиспользование
```typescript
✅ Canvas работает для всех типов (text/image/video/audio)
✅ SettingsPanel адаптируется под mode
✅ HistorySidebar универсален
✅ PromptBar общий для всех
```

### 3. Масштабируемость
```typescript
✅ Легко добавить новый тип контента
✅ Легко добавить новую модель
✅ Легко модифицировать UI
```

### 4. Поддерживаемость
```typescript
✅ Четкое разделение ответственности
✅ Понятная структура файлов
✅ Легко найти нужный компонент
```

---

## 📊 ФИНАЛЬНАЯ СТРУКТУРА

```
src/
├── components/
│   ├── generator/
│   │   ├── Canvas.tsx                   ✅ Универсальный canvas
│   │   ├── HistorySidebar.tsx           ✅ История
│   │   ├── SettingsPanel.tsx            ✅ Настройки
│   │   ├── PromptBar.tsx                ✅ Промпт
│   │   ├── ModelSelectionModal.tsx      ✅ Выбор модели
│   │   ├── SectionTabs.tsx              ✅ Вкладки
│   │   ├── GenerationMetadata.tsx       ✅ Метаданные
│   │   └── index.ts                     ✅ Экспорты
│   │
│   └── ui/                              ✅ 16 UI компонентов
│
├── config/
│   └── models.ts                        ✅ Конфигурация (787 lines)
│
├── app/
│   ├── text/page.tsx                    ✅ Text generation
│   ├── design/page.tsx                  ✅ Image generation
│   ├── design/[model]/page.tsx          ✅ Specific image
│   ├── video/page.tsx                   ✅ Video generation
│   ├── video/[model]/page.tsx           ✅ Specific video
│   ├── audio/page.tsx                   ✅ Audio generation
│   └── audio/[model]/page.tsx           ✅ Specific audio
│
└── hooks/
    └── useGenerator.ts                  ✅ Generation logic
```

**Статус:** 🟢 Ready to Implement  
**Сложность:** 🟡 Medium  
**Время:** ~4 hours  

---

## 🚀 DEPLOYMENT

После реализации:

```bash
# 1. Lint & Type check
npm run lint
npm run type-check

# 2. Build
npm run build

# 3. Test locally
npm run dev

# 4. Deploy to server
./deploy-direct.sh
```

---

**Создано:** 2025-12-30  
**Автор:** AI Assistant  
**Статус:** ✅ Implementation Guide Ready  

🎯 **ГОТОВО К РЕАЛИЗАЦИИ!**

