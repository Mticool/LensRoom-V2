# Migration Plan - Unified Generator Structure

**Дата:** 2025-12-30  
**Статус:** 🔄 Ready to Execute  
**Время:** ~2 hours  

---

## 📊 ТЕКУЩЕЕ СОСТОЯНИЕ

### Компоненты (21 файл)

```
src/components/generator/
├── Canvas.tsx                    ✅ Exists (но не используется?)
├── GeneratorCanvas.tsx           ✅ Exists (текущий)
├── HistorySidebar.tsx            ✅ Exists
├── SettingsSidebar.tsx           ✅ Exists
├── ModelModal.tsx                ✅ Exists
├── PromptBar.tsx                 ✅ Exists
├── SectionTabs.tsx               ✅ Exists
├── GenerationMetadata.tsx        ✅ Exists
├── Header.tsx                    ⚠️ Дублирует layout/header.tsx?
├── LeftSidebar.tsx               ⚠️ Дублирует HistorySidebar?
├── MainCanvas.tsx                ⚠️ Дублирует GeneratorCanvas?
├── MainContent.tsx               ⚠️ Старый компонент?
├── RightPanel.tsx                ⚠️ Дублирует SettingsSidebar?
├── Sidebar.tsx                   ⚠️ Старый компонент?
├── CANVAS_MODES.md               📄 Docs
├── COMPONENTS_OVERVIEW.md        📄 Docs
├── MODEL_MODAL.md                📄 Docs
├── PROMPT_BAR.md                 📄 Docs
├── SETTINGS_PANEL.md             📄 Docs
├── README.md                     📄 Docs
└── index.ts                      ✅ Exports
```

### UI Components (16 файлов)

```
src/components/ui/
✅ badge.tsx
✅ button.tsx
✅ card.tsx
✅ dialog.tsx
✅ input.tsx
✅ sheet.tsx
✅ slider.tsx
✅ tabs.tsx
✅ tooltip-hint.tsx
✅ skeleton.tsx
✅ loading.tsx
✅ empty-state.tsx
✅ bottom-action-bar.tsx
✅ low-balance-alert.tsx
✅ OptimizedMedia.tsx
✅ index.ts
```

---

## 🎯 ЦЕЛЕВАЯ СТРУКТУРА

### Основные компоненты (7 + exports)

```
src/components/generator/
├── Canvas.tsx                    ⭐ Унифицировать (merge GeneratorCanvas)
├── HistorySidebar.tsx            ✅ Keep as is
├── SettingsPanel.tsx             ⭐ Rename from SettingsSidebar
├── PromptBar.tsx                 ✅ Keep as is
├── ModelSelectionModal.tsx       ⭐ Rename from ModelModal
├── SectionTabs.tsx               ✅ Keep as is
├── GenerationMetadata.tsx        ✅ Keep as is
└── index.ts                      ⭐ Update exports
```

### Удалить дубликаты (6 файлов)

```
❌ GeneratorCanvas.tsx            → Merge into Canvas.tsx
❌ Header.tsx                     → Use layout/header.tsx
❌ LeftSidebar.tsx                → Already have HistorySidebar
❌ MainCanvas.tsx                 → Merge into Canvas.tsx
❌ MainContent.tsx                → Not needed
❌ RightPanel.tsx                 → Already have SettingsSidebar
❌ Sidebar.tsx                    → Not needed
```

---

## 📝 ПЛАН МИГРАЦИИ (5 шагов)

### Шаг 1: Унифицировать Canvas ⭐

**Цель:** Объединить `Canvas.tsx` и `GeneratorCanvas.tsx` в один универсальный компонент.

**Действия:**

```bash
# 1. Проверить текущий Canvas.tsx
cat src/components/generator/Canvas.tsx

# 2. Проверить текущий GeneratorCanvas.tsx
cat src/components/generator/GeneratorCanvas.tsx

# 3. Если Canvas.tsx пустой или устаревший - использовать GeneratorCanvas
# 4. Переименовать GeneratorCanvas → Canvas
mv src/components/generator/GeneratorCanvas.tsx \
   src/components/generator/Canvas.tsx.new

# 5. Объединить лучшие части обоих файлов
```

**Результат:**
```typescript
// src/components/generator/Canvas.tsx
export interface CanvasProps {
  mode: 'text' | 'image' | 'video' | 'audio';
  modelId?: string;
  chatHistory: ChatMessage[];
  currentResult: GenerationResult | null;
  isGenerating: boolean;
  generationProgress: number;
  onExampleClick: (prompt: string) => void;
}

export function Canvas({ mode, modelId, ... }: CanvasProps) {
  // Empty State
  if (chatHistory.length === 0 && !currentResult) {
    return <EmptyState mode={mode} modelId={modelId} />;
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat History */}
      <ChatHistory messages={chatHistory} />
      
      {/* Current Result */}
      {currentResult && <ResultDisplay type={mode} result={currentResult} />}
      
      {/* Loading */}
      {isGenerating && <LoadingState progress={generationProgress} />}
      
      {/* Prompt Bar (integrated) */}
      <div className="border-t p-4">
        <PromptBar {...} />
      </div>
    </div>
  );
}
```

---

### Шаг 2: Переименовать компоненты ⭐

**Цель:** Привести названия компонентов к единому стандарту.

**Действия:**

```bash
# 1. Rename SettingsSidebar → SettingsPanel
mv src/components/generator/SettingsSidebar.tsx \
   src/components/generator/SettingsPanel.tsx

# 2. Rename ModelModal → ModelSelectionModal
mv src/components/generator/ModelModal.tsx \
   src/components/generator/ModelSelectionModal.tsx

# 3. Update internal component names
# In SettingsPanel.tsx:
#   export function SettingsSidebar → export function SettingsPanel

# In ModelSelectionModal.tsx:
#   export function ModelModal → export function ModelSelectionModal
```

**Команды:**

```bash
# SettingsPanel
sed -i '' 's/SettingsSidebar/SettingsPanel/g' \
  src/components/generator/SettingsPanel.tsx

# ModelSelectionModal
sed -i '' 's/ModelModal/ModelSelectionModal/g' \
  src/components/generator/ModelSelectionModal.tsx
```

---

### Шаг 3: Удалить дубликаты ⭐

**Цель:** Убрать устаревшие/дублирующиеся компоненты.

**Действия:**

```bash
# Удалить дублирующиеся компоненты
rm src/components/generator/GeneratorCanvas.tsx   # Merged into Canvas
rm src/components/generator/Header.tsx            # Use layout/header.tsx
rm src/components/generator/LeftSidebar.tsx       # Have HistorySidebar
rm src/components/generator/MainCanvas.tsx        # Merged into Canvas
rm src/components/generator/MainContent.tsx       # Not needed
rm src/components/generator/RightPanel.tsx        # Have SettingsPanel
rm src/components/generator/Sidebar.tsx           # Not needed
```

**Проверка:**
```bash
# После удаления должны остаться только:
ls src/components/generator/*.tsx

# Ожидаемый результат:
# Canvas.tsx
# HistorySidebar.tsx
# SettingsPanel.tsx
# PromptBar.tsx
# ModelSelectionModal.tsx
# SectionTabs.tsx
# GenerationMetadata.tsx
```

---

### Шаг 4: Обновить exports ⭐

**Цель:** Обновить `index.ts` с новыми именами.

**Файл:** `src/components/generator/index.ts`

**Новый контент:**

```typescript
// Main Generator Components
export { Canvas } from './Canvas';
export type { CanvasProps, ChatMessage, GenerationResult } from './Canvas';

export { HistorySidebar } from './HistorySidebar';
export type { Generation as HistoryGeneration } from './HistorySidebar';

export { SettingsPanel } from './SettingsPanel';
export type { ModelOption, GenerationSettings, GenerationMode } from './SettingsPanel';

export { PromptBar } from './PromptBar';
export type { PromptBarProps } from './PromptBar';

export { ModelSelectionModal } from './ModelSelectionModal';
export type { Model, ModelCategory } from './ModelSelectionModal';

export { SectionTabs } from './SectionTabs';
export type { SectionType, Section } from './SectionTabs';

export { GenerationMetadata } from './GenerationMetadata';
export type { MetadataProps } from './GenerationMetadata';
```

---

### Шаг 5: Обновить импорты в страницах ⭐

**Цель:** Обновить все импорты в страницах генераторов.

**Файлы для обновления:**
```
src/app/design/page.tsx
src/app/design/[model]/page.tsx
src/app/video/page.tsx
src/app/video/[model]/page.tsx
src/app/generator/page.tsx (если используется)
```

**Старые импорты:**
```typescript
import {
  GeneratorCanvas,
  SettingsSidebar,
  ModelModal
} from '@/components/generator';
```

**Новые импорты:**
```typescript
import {
  Canvas,
  SettingsPanel,
  ModelSelectionModal
} from '@/components/generator';
```

**Команда для массовой замены:**
```bash
# Find all files importing old names
grep -r "GeneratorCanvas\|SettingsSidebar\|ModelModal" src/app --include="*.tsx"

# Replace in all pages
find src/app -name "*.tsx" -exec sed -i '' \
  -e 's/GeneratorCanvas/Canvas/g' \
  -e 's/SettingsSidebar/SettingsPanel/g' \
  -e 's/ModelModal/ModelSelectionModal/g' \
  {} +
```

---

## 🆕 СОЗДАНИЕ НОВЫХ СТРАНИЦ

### Шаг 6: Создать `/text` page

**Файл:** `src/app/text/page.tsx`

```typescript
'use client';

import { useState } from 'react';
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
    uploadedFiles,
    handleFileSelect,
    handleRemoveFile,
    handleGenerate,
    handleNewChat,
    handleSelectGeneration
  } = useGenerator('text');

  return (
    <div className="flex h-screen pt-16"> {/* pt-16 for Header */}
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
        onModelSelect={setCurrentModel}
        onModelClick={() => setShowModelModal(true)}
        onSettingChange={updateSetting}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        cost={10} // TODO: Calculate from model + settings
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

### Шаг 7: Создать `/audio` pages

**Файл:** `src/app/audio/page.tsx`

```typescript
// Same structure as /text/page.tsx
// Replace mode='text' → mode='audio'
// Replace getModelsByType('text') → getModelsByType('audio')
```

**Файл:** `src/app/audio/[model]/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  HistorySidebar,
  Canvas,
  SettingsPanel,
  ModelSelectionModal
} from '@/components/generator';
import { getModelsByType, getModelById } from '@/config/models';
import { useGenerator } from '@/hooks/useGenerator';

export default function AudioModelPage() {
  const params = useParams();
  const modelId = params.model as string;
  
  const [showModelModal, setShowModelModal] = useState(false);
  const models = getModelsByType('audio');
  const currentModelData = getModelById(modelId);
  
  const {
    currentModel,
    setCurrentModel,
    // ... rest of useGenerator
  } = useGenerator('audio', modelId);

  // Same structure as /audio/page.tsx
  // but with modelId pre-selected
}
```

---

## ✅ CHECKLIST ВЫПОЛНЕНИЯ

```bash
☐ Шаг 1: Унифицировать Canvas
  ☐ Проверить оба файла (Canvas.tsx, GeneratorCanvas.tsx)
  ☐ Объединить лучшие части
  ☐ Удалить старый GeneratorCanvas.tsx
  ☐ Обновить типы

☐ Шаг 2: Переименовать компоненты
  ☐ SettingsSidebar → SettingsPanel
  ☐ ModelModal → ModelSelectionModal
  ☐ Обновить внутренние имена компонентов

☐ Шаг 3: Удалить дубликаты
  ☐ Удалить Header.tsx
  ☐ Удалить LeftSidebar.tsx
  ☐ Удалить MainCanvas.tsx
  ☐ Удалить MainContent.tsx
  ☐ Удалить RightPanel.tsx
  ☐ Удалить Sidebar.tsx

☐ Шаг 4: Обновить exports
  ☐ Обновить index.ts
  ☐ Экспортировать новые имена
  ☐ Экспортировать типы

☐ Шаг 5: Обновить импорты в страницах
  ☐ /design/page.tsx
  ☐ /design/[model]/page.tsx
  ☐ /video/page.tsx
  ☐ /video/[model]/page.tsx
  ☐ /generator/page.tsx

☐ Шаг 6: Создать /text page
  ☐ Создать page.tsx
  ☐ Интегрировать компоненты
  ☐ Подключить useGenerator

☐ Шаг 7: Создать /audio pages
  ☐ Создать /audio/page.tsx
  ☐ Создать /audio/[model]/page.tsx
  ☐ Интегрировать компоненты

☐ Шаг 8: Тестирование
  ☐ npm run lint
  ☐ npm run type-check
  ☐ npm run build
  ☐ Test all routes (/text, /design, /video, /audio)
  ☐ Test model selection
  ☐ Test generation
  ☐ Test history navigation

☐ Шаг 9: Документация
  ☐ Update GENERATOR_COMPONENTS_COMPLETE.md
  ☐ Update NEW_GENERATOR_INTEGRATION.md
  ☐ Create component usage examples
```

---

## 🔧 BASH SCRIPT ДЛЯ МИГРАЦИИ

**Файл:** `migrate-generator.sh`

```bash
#!/bin/bash
set -e

echo "🚀 Starting Generator Structure Migration..."

# Step 1: Backup
echo "📦 Creating backup..."
cp -r src/components/generator src/components/generator.backup

# Step 2: Rename components
echo "📝 Renaming components..."
mv src/components/generator/SettingsSidebar.tsx \
   src/components/generator/SettingsPanel.tsx

mv src/components/generator/ModelModal.tsx \
   src/components/generator/ModelSelectionModal.tsx

# Step 3: Update component names inside files
echo "✏️  Updating component names..."
sed -i '' 's/SettingsSidebar/SettingsPanel/g' \
  src/components/generator/SettingsPanel.tsx

sed -i '' 's/ModelModal/ModelSelectionModal/g' \
  src/components/generator/ModelSelectionModal.tsx

# Step 4: Check if Canvas.tsx is newer than GeneratorCanvas.tsx
echo "🔍 Checking Canvas.tsx..."
if [ -f src/components/generator/Canvas.tsx ] && \
   [ -f src/components/generator/GeneratorCanvas.tsx ]; then
  echo "⚠️  Both Canvas.tsx and GeneratorCanvas.tsx exist"
  echo "   Please manually merge them, then delete GeneratorCanvas.tsx"
  echo "   After merging, run: rm src/components/generator/GeneratorCanvas.tsx"
else
  if [ -f src/components/generator/GeneratorCanvas.tsx ]; then
    echo "📝 Renaming GeneratorCanvas → Canvas"
    mv src/components/generator/GeneratorCanvas.tsx \
       src/components/generator/Canvas.tsx
  fi
fi

# Step 5: Remove duplicates
echo "🗑️  Removing duplicate components..."
rm -f src/components/generator/Header.tsx
rm -f src/components/generator/LeftSidebar.tsx
rm -f src/components/generator/MainCanvas.tsx
rm -f src/components/generator/MainContent.tsx
rm -f src/components/generator/RightPanel.tsx
rm -f src/components/generator/Sidebar.tsx

# Step 6: Update index.ts
echo "📋 Updating index.ts..."
cat > src/components/generator/index.ts << 'EOF'
// Main Generator Components
export { Canvas } from './Canvas';
export type { CanvasProps, ChatMessage, GenerationResult } from './Canvas';

export { HistorySidebar } from './HistorySidebar';
export type { Generation as HistoryGeneration } from './HistorySidebar';

export { SettingsPanel } from './SettingsPanel';
export type { ModelOption, GenerationSettings, GenerationMode } from './SettingsPanel';

export { PromptBar } from './PromptBar';
export type { PromptBarProps } from './PromptBar';

export { ModelSelectionModal } from './ModelSelectionModal';
export type { Model, ModelCategory } from './ModelSelectionModal';

export { SectionTabs } from './SectionTabs';
export type { SectionType, Section } from './SectionTabs';

export { GenerationMetadata } from './GenerationMetadata';
export type { MetadataProps } from './GenerationMetadata';
EOF

# Step 7: Update imports in pages
echo "🔄 Updating imports in pages..."
find src/app -name "*.tsx" -exec sed -i '' \
  -e 's/GeneratorCanvas/Canvas/g' \
  -e 's/SettingsSidebar/SettingsPanel/g' \
  -e 's/ModelModal/ModelSelectionModal/g' \
  {} +

echo "✅ Migration complete!"
echo ""
echo "Next steps:"
echo "1. Review changes: git diff"
echo "2. Create /text page: touch src/app/text/page.tsx"
echo "3. Create /audio pages: mkdir -p src/app/audio/[model]"
echo "4. Run tests: npm run lint && npm run type-check"
echo "5. Build: npm run build"
```

**Использование:**

```bash
chmod +x migrate-generator.sh
./migrate-generator.sh
```

---

## 📊 СРАВНЕНИЕ ДО/ПОСЛЕ

### До миграции (21 файл)

```
src/components/generator/
├── Canvas.tsx                    ⚠️ Unused?
├── GeneratorCanvas.tsx           ✅ Used
├── HistorySidebar.tsx            ✅ Used
├── SettingsSidebar.tsx           ✅ Used
├── ModelModal.tsx                ✅ Used
├── PromptBar.tsx                 ✅ Used
├── SectionTabs.tsx               ✅ Used
├── GenerationMetadata.tsx        ✅ Used
├── Header.tsx                    ⚠️ Duplicate
├── LeftSidebar.tsx               ⚠️ Duplicate
├── MainCanvas.tsx                ⚠️ Duplicate
├── MainContent.tsx               ⚠️ Old
├── RightPanel.tsx                ⚠️ Duplicate
├── Sidebar.tsx                   ⚠️ Old
├── CANVAS_MODES.md               📄 Docs
├── COMPONENTS_OVERVIEW.md        📄 Docs
├── MODEL_MODAL.md                📄 Docs
├── PROMPT_BAR.md                 📄 Docs
├── SETTINGS_PANEL.md             📄 Docs
├── README.md                     📄 Docs
└── index.ts                      ✅ Exports
```

### После миграции (14 файлов)

```
src/components/generator/
├── Canvas.tsx                    ✅ Unified
├── HistorySidebar.tsx            ✅ Keep
├── SettingsPanel.tsx             ✅ Renamed
├── PromptBar.tsx                 ✅ Keep
├── ModelSelectionModal.tsx       ✅ Renamed
├── SectionTabs.tsx               ✅ Keep
├── GenerationMetadata.tsx        ✅ Keep
├── CANVAS_MODES.md               📄 Docs
├── COMPONENTS_OVERVIEW.md        📄 Docs
├── MODEL_MODAL.md                📄 Docs
├── PROMPT_BAR.md                 📄 Docs
├── SETTINGS_PANEL.md             📄 Docs
├── README.md                     📄 Docs
└── index.ts                      ✅ Updated
```

**Итого:**
- ✅ 7 активных компонентов (вместо 14)
- ✅ 6 документов
- ✅ 1 index.ts
- ❌ Удалено 7 дублирующихся файлов

---

## 🎯 ПРЕИМУЩЕСТВА

### 1. Чистота кода
```
✅ Нет дублирующихся компонентов
✅ Единообразные названия
✅ Понятная структура
```

### 2. Переиспользование
```
✅ Canvas работает для всех типов
✅ SettingsPanel универсальна
✅ ModelSelectionModal общая
```

### 3. Поддерживаемость
```
✅ Легко найти нужный компонент
✅ Легко добавить новую страницу
✅ Легко модифицировать UI
```

---

## 🚀 ЗАПУСК МИГРАЦИИ

### Быстрый старт

```bash
# 1. Backup
cp -r src/components/generator src/components/generator.backup

# 2. Run migration script
./migrate-generator.sh

# 3. Review changes
git diff src/components/generator
git diff src/app

# 4. Test
npm run lint
npm run type-check
npm run build

# 5. Commit
git add .
git commit -m "refactor: migrate to unified generator structure"
```

---

**Создано:** 2025-12-30  
**Время выполнения:** ~2 hours  
**Статус:** 🟢 Ready to Execute  

🎯 **READY TO MIGRATE!**

