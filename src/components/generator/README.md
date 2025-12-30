# Generator Components

SYNTX-style generator components for LensRoom. Modular architecture with separate panels for better maintainability.

## Components

### 1. `HistorySidebar`
Left panel showing generation history with search functionality.

```tsx
import { HistorySidebar } from '@/components/generator';

<HistorySidebar
  generations={generations}
  selectedGenerationId={currentGeneration?.id}
  onSelectGeneration={(id) => setSelectedGeneration(id)}
  onNewChat={() => resetChat()}
  userBalance={1250}
/>
```

**Props:**
- `generations`: Array of generation objects with `id`, `type`, `prompt`, `model`, `timestamp`, `preview?`
- `selectedGenerationId?`: ID of currently selected generation
- `onSelectGeneration`: Callback when a generation is clicked
- `onNewChat`: Callback for "New Chat" button
- `userBalance?`: User's credit balance (optional)

**Features:**
- Search history by prompt text
- Groups generations by date
- Shows preview thumbnails for image/video
- Gradient "New Chat" button
- Balance display

---

### 2. `GeneratorCanvas`
Center panel with result display and prompt input bar.

```tsx
import { GeneratorCanvas, type Generation } from '@/components/generator';

<GeneratorCanvas
  mode="image"
  chatHistory={chatHistory}
  currentModel={{
    name: 'FLUX.2 Pro',
    provider: 'Black Forest Labs',
    description: 'High-quality image generation',
    icon: ImageIcon
  }}
  currentGeneration={{
    id: '123',
    type: 'image',
    prompt: 'Professional headshot with studio lighting',
    result: {
      imageUrl: 'https://example.com/image.png'
    },
    timestamp: new Date()
  }}
  examplePrompts={['Example 1', 'Example 2', 'Example 3']}
  isGenerating={isGenerating}
  generationProgress={75}
  prompt={prompt}
  onPromptChange={setPrompt}
  uploadedFiles={files}
  onFileSelect={handleFileSelect}
  onRemoveFile={(i) => removeFile(i)}
  onGenerate={handleGenerate}
  maxFiles={4}
  acceptedFileTypes="image/*"
/>
```

**Props:**
- `mode`: Current generation mode ('text' | 'image' | 'video' | 'audio')
- `chatHistory`: Array of chat messages (`role`, `content`, `timestamp`)
- `currentModel`: Current model info (name, provider, description, icon)
- `currentGeneration?`: Current generation result with `type`, `prompt`, `result`, `timestamp`
- `examplePrompts?`: Array of example prompts to show in empty state
- `isGenerating`: Whether generation is in progress
- `generationProgress`: Progress percentage (0-100)
- `prompt`: Current prompt text
- `onPromptChange`: Callback for prompt changes
- `uploadedFiles`: Array of File objects
- `onFileSelect`: File input change handler
- `onRemoveFile`: Callback to remove file by index
- `onGenerate`: Callback when Generate is clicked
- `maxFiles?`: Max files allowed (default: 4)
- `acceptedFileTypes?`: File input accept attribute

**Features:**
- Empty state with model info and example prompts
- **Result display for all types:**
  - **Text**: Formatted text with copy button
  - **Image**: Full-size image preview with download
  - **Video**: Video player with controls
  - **Audio**: Audio player with waveform icon
- Chat history with user/assistant messages
- File upload with previews (images show thumbnails)
- Gradient generate button
- Keyboard shortcuts (Enter/Shift+Enter)
- Copy/Download actions for results

**Generation Result Interface:**
```tsx
interface Generation {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio';
  prompt: string;
  result?: {
    text?: string;
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
  };
  timestamp: Date;
}
```

---

### 3. `SettingsSidebar`
Right panel with model selector and parameters.

```tsx
import { SettingsSidebar } from '@/components/generator';

<SettingsSidebar
  currentModel={currentModel}
  models={allModels}
  parameters={{
    quality: {
      label: 'Quality',
      type: 'select',
      options: ['HD', '2K', '4K'],
      default: '2K'
    },
    speed: {
      label: 'Speed',
      type: 'slider',
      min: 0.5,
      max: 2,
      step: 0.1,
      default: 1,
      unit: 'x'
    }
  }}
  settings={settings}
  onModelSelect={() => setShowModal(true)}
  onSettingChange={(key, value) => updateSetting(key, value)}
  onReset={() => resetSettings()}
  onGenerate={handleGenerate}
  canGenerate={!!prompt.trim()}
  isGenerating={isGenerating}
/>
```

**Props:**
- `currentModel`: Selected model with `id`, `name`, `provider`, `icon`, `cost`, `badge?`, `description`
- `models`: Array of all available models
- `parameters`: Object with parameter definitions (type, options, min/max, default)
- `settings`: Current parameter values
- `onModelSelect`: Callback to open model selector
- `onSettingChange`: Callback when parameter changes
- `onReset`: Reset all settings
- `onGenerate`: Generate button callback
- `canGenerate`: Whether generate button should be enabled
- `isGenerating`: Whether generation is in progress

**Features:**
- Model selector with icon and gradient background
- Dynamic parameter rendering (selects, sliders)
- Gradient generate button
- Cost display
- Reset button

---

### 4. `SectionTabs`
Top navigation tabs for switching sections.

```tsx
import { SectionTabs } from '@/components/generator';
import { FileText, Image, Video, Mic } from 'lucide-react';

<SectionTabs
  sections={[
    { key: 'text', label: 'Text', icon: FileText },
    { key: 'image', label: 'Design', icon: Image },
    { key: 'video', label: 'Video', icon: Video },
    { key: 'audio', label: 'Audio', icon: Mic }
  ]}
  activeSection={activeSection}
  onSectionChange={(section) => setActiveSection(section)}
/>
```

**Props:**
- `sections`: Array of section objects (`key`, `label`, `icon`)
- `activeSection`: Currently active section key
- `onSectionChange`: Callback when section changes

**Features:**
- Gradient background for active tab
- Icon + label display
- Smooth transitions

---

### 5. `ModelModal`
Modal for selecting AI models.

```tsx
import { ModelModal } from '@/components/generator';

<ModelModal
  isOpen={showModal}
  models={models}
  currentModelId={currentModel.id}
  onSelect={(id) => setCurrentModel(models.find(m => m.id === id))}
  onClose={() => setShowModal(false)}
/>
```

**Props:**
- `isOpen`: Whether modal is visible
- `models`: Array of models (`id`, `name`, `provider`, `icon`, `cost`, `badge?`)
- `currentModelId`: ID of currently selected model
- `onSelect`: Callback with selected model ID
- `onClose`: Callback to close modal

**Features:**
- Grid layout (2 columns)
- Badge display (Premium, Fast, etc.)
- Cost display
- Gradient border for selected model
- Click outside to close

---

## Example Usage

Complete integration example:

```tsx
'use client';

import { useState } from 'react';
import {
  HistorySidebar,
  GeneratorCanvas,
  SettingsSidebar,
  SectionTabs,
  ModelModal,
  type Generation,
  type SectionType
} from '@/components/generator';
import { FileText, Image, Video, Mic, Bot } from 'lucide-react';

export default function GeneratorPage() {
  const [activeSection, setActiveSection] = useState<SectionType>('text');
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [currentModel, setCurrentModel] = useState(models[0]);
  const [showModelModal, setShowModelModal] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [settings, setSettings] = useState({});
  
  return (
    <div className="h-screen flex flex-col bg-[var(--bg)] pt-16">
      <SectionTabs
        sections={sections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <HistorySidebar
          generations={generations}
          onSelectGeneration={handleSelect}
          onNewChat={handleNewChat}
          userBalance={balance}
        />
        
        <GeneratorCanvas
          chatHistory={chatHistory}
          currentModel={currentModel}
          examplePrompts={examples}
          prompt={prompt}
          onPromptChange={setPrompt}
          onGenerate={handleGenerate}
          // ... other props
        />
        
        <SettingsSidebar
          currentModel={currentModel}
          models={models}
          parameters={parameters}
          settings={settings}
          onModelSelect={() => setShowModelModal(true)}
          onSettingChange={updateSetting}
          onGenerate={handleGenerate}
          canGenerate={!!prompt.trim()}
          isGenerating={isGenerating}
        />
      </div>
      
      <ModelModal
        isOpen={showModelModal}
        models={models}
        currentModelId={currentModel.id}
        onSelect={setCurrentModel}
        onClose={() => setShowModelModal(false)}
      />
    </div>
  );
}
```

## Design System

All components use SYNTX design tokens:

```css
--accent-primary: #8b5cf6   /* Purple */
--accent-secondary: #06b6d4  /* Cyan */
--bg: #0a0a0a                /* Deep black */
--surface: #1a1a1a           /* Panel background */
--border: #2a2a2a            /* Borders */
--text: #ffffff              /* Primary text */
--muted: #9ca3af             /* Secondary text */
```

Gradient buttons use:
```css
bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]
shadow-lg shadow-purple-500/30
```
