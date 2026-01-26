# COMPLETE REFACTOR PLAN: Hiru Video Generator (Higgsfield Style)

## 📋 ОТВЕТЫ НА ВОПРОСЫ:

### 1. ❓ Что делает "Edit Video" режим?
**Ответ:** На основе анализа models.ts:
- **WAN 2.6** поддерживает `v2v` (video-to-video) - reference-guided generation
- **Grok Video** поддерживает `style_transfer` - перенос стиля на видео

**РЕШЕНИЕ:** Edit Video = Video-to-Video режим
- Upload reference video
- Add prompt to describe desired changes
- Apply style transfer (для Grok)
- Generate modified video

**Доступные модели для Edit Video:**
- WAN 2.6 (v2v mode)
- Grok Video (style_transfer mode)

---

### 2. ❓ Frames/Ingredients - удалить или оставить?
**Ответ:** **УДАЛИТЬ!**

**Причина:** 
- В Higgsfield.ai нет такой структуры
- Start/End frames должны быть **опциональными uploads** в Create Video
- Для моделей, которые их поддерживают (Veo 3.1, Kling 2.1/2.5/2.6, Grok)

**Новая структура:**
```
Create Video
├── Mode Toggle: Text→Video | Image→Video
├── Reference Image upload (optional, для Image→Video)
├── Start Frame upload (optional, для Veo/Kling/Grok)
├── End Frame upload (optional, для Veo/Kling/Grok)
└── Dynamic Settings (duration, resolution, etc.)
```

---

### 3. ❓ Какой API endpoint для генерации?
**Ответ:** `/api/generate/video/route.ts`

**Поддерживаемые параметры:**
```typescript
{
  prompt: string;
  model: string; // 'veo-3.1-fast', 'kling-2.6', etc.
  mode: 't2v' | 'i2v' | 'v2v' | 'style_transfer';
  duration: number;
  resolution: '720p' | '1080p';
  aspectRatio: '16:9' | '9:16' | '1:1' | 'portrait' | 'landscape';
  quality?: VideoQuality;
  
  // Optional files
  referenceImage?: File; // For i2v mode
  startImage?: File; // For start/end frame mode
  endImage?: File; // For start/end frame mode
  referenceVideo?: File; // For motion control
  videoUrl?: string; // For v2v mode (WAN 2.6)
  
  // Extended parameters
  style?: GrokVideoStyle; // For Grok
  cameraMotion?: CameraMotion; // For WAN 2.6
  motionStrength?: number; // For Motion Control & WAN 2.6
  characterOrientation?: 'image' | 'video'; // For Motion Control
  
  // Audio
  audio?: boolean;
  soundPreset?: string;
}
```

---

### 4. ❓ Advanced Settings в Motion Control?
**Ответ:** На основе текущего кода:
- **Motion Strength slider** (0-100%, default: 70%)
- **Scene Control Mode** toggle (Video / Image)
  - `video`: Use uploaded video as background (max 30s)
  - `image`: Use uploaded image as background (max 10s)
- **Quality** (720p = 16⭐/sec, 1080p = 25⭐/sec)

**Дополнительные настройки (опционально):**
- **Trim video** toggle (auto-trim > 30s)
- **Keep audio** toggle (preserve original audio)

---

### 5. ❓ Как считается стоимость?
**Ответ:** **Динамическая**, зависит от:
1. **Модель** (pricing в models.ts)
2. **Длительность** (seconds)
3. **Resolution** (720p vs 1080p)

**Примеры:**
```typescript
// Veo 3.1 Fast
{ '4': 50, '6': 75, '8': 99 } // Fixed per duration

// Kling 2.1
{ '5': 200, '10': 400 } // Fixed per duration

// Kling Motion Control
{ '720p': { per_second: 16 }, '1080p': { per_second: 25 } } // Per-second pricing

// Grok Video
{ '6': 25, '12': 45, '18': 65, '24': 85, '30': 105 }
```

**Функция расчета:**
```typescript
function calculateCost(model, duration, resolution) {
  const modelConfig = VIDEO_MODELS.find(m => m.id === model);
  const pricing = modelConfig.pricing;
  
  if (pricing[duration]) {
    return pricing[duration]; // Fixed pricing
  }
  
  if (pricing[resolution]?.per_second) {
    return pricing[resolution].per_second * duration; // Per-second
  }
  
  return 0;
}
```

---

### 6. ❓ Предварительные просмотры моделей?
**Ответ:** **НЕТ** (пока)

**Причина:**
- Текущий ModelCard показывает gradient background
- Preview можно добавить позже (Phase 2)
- Сейчас фокус на функциональности

---

## 🎯 ФИНАЛЬНАЯ СТРУКТУРА

### **TAB 1: Create Video** (Default)

**UI Components:**
1. **Model Selector** (ModelCard)
   - Shows: Icon, Name, Duration range, Badges
   - Click "Change" → Opens Modal with 7 standard models
   - Default: Veo 3.1 Fast

2. **Mode Toggle** (Button Group)
   - Text → Video (default)
   - Image → Video

3. **Reference Image Upload** (Optional, только для Image→Video)
   - Drag & drop или click to upload
   - Formats: PNG, JPG, WebP
   - Max size: 10MB

4. **Start/End Frames** (Optional, conditional)
   - Показывать только для моделей с `supportsFirstLastFrame: true`
   - Veo 3.1, Kling 2.1/2.5/2.6, Grok Video
   - Two upload areas side-by-side

5. **Prompt** (Textarea)
   - Placeholder: "Describe the scene you imagine, with details."
   - Character counter: 150/500
   - Max length: 500

6. **Enhance Toggle** (Switch)
   - Icon: Sparkles
   - Label: "Enhance on/off"

7. **Multi-shot Mode** (Checkbox, только для Veo 3.1)
   - Tooltip: "Generate multiple scenes in one video with smooth transitions"

8. **Duration Selector** (Dynamic Button Group)
   - Veo 3.1: 4s, 6s, 8s
   - Kling 2.1/2.5/2.6: 5s, 10s
   - Grok: 6s, 12s, 18s, 24s, 30s
   - Sora 2: 10s, 15s
   - WAN 2.6: 5s, 10s, 15s

9. **Resolution** (Button Group)
   - 720p | 1080p
   - Show cost: "16⭐/sec" vs "25⭐/sec" (для Motion Control)

10. **Aspect Ratio** (Button Group)
    - Veo/Kling 2.x: 16:9, 9:16
    - Kling 2.1/2.5/2.6: +1:1
    - Grok: 9:16, 1:1, 3:2, 2:3
    - Sora 2: Portrait (9:16), Landscape (16:9)
    - WAN 2.6: 16:9, 9:16, 1:1

11. **Model-Specific Settings** (Dynamic)
    - **Grok Video:** Style selector (realistic, fantasy, sci-fi, cinematic, anime, cartoon)
    - **WAN 2.6:** Camera Motion selector (static, pan_left, pan_right, tilt_up, tilt_down, zoom_in, zoom_out, orbit, follow)
    - **WAN 2.6:** Motion Strength slider (0-100%)
    - **Kling 2.6:** Generate Audio checkbox

12. **Generate Button**
    - Text: "Generate ✨ {cost}"
    - Full width, lime-yellow (#D4FF00)
    - Loading state: spinner + "Generating..."
    - Disabled if no prompt

---

### **TAB 2: Edit Video**

**Available Models:**
- WAN 2.6 (v2v mode)
- Grok Video (style_transfer mode)

**UI Components:**
1. **Model Selector**
   - Only shows WAN 2.6 and Grok Video
   - Default: WAN 2.6

2. **Upload Reference Video**
   - Drag & drop video file
   - Max duration: 30s (auto-trim option)
   - Formats: MP4, MOV, WebM

3. **Prompt** (Textarea)
   - "Describe the changes you want to make"
   - Character counter

4. **Mode-specific Settings:**
   - **WAN 2.6 (v2v):**
     - Duration (inherited from video or select: 5s, 10s, 15s)
     - Resolution (720p, 1080p)
     - Camera Motion
     - Motion Strength slider
   
   - **Grok (style_transfer):**
     - Style selector (6 styles)
     - Duration (6s, 12s, 18s, 24s, 30s)
     - Aspect Ratio

5. **Keep Original Audio** (Toggle, for WAN 2.6)

6. **Generate Button**
   - Same as Create Video

---

### **TAB 3: Motion Control**

**Model:** Kling Motion Control (fixed)

**UI Components:**
1. **Model Display**
   - "Kling Motion Control - Motion Transfer"
   - No model selector (fixed model)

2. **Upload Areas** (2 side-by-side)
   - **Left:** "Motion video"
     - Upload video 3-30s
     - Shows motion that will be transferred
   - **Right:** "Character"
     - Upload image with face/object
     - Motion will be applied to this

3. **Scene Control Mode** (Toggle)
   - Video mode (max 30s): Use video as background
   - Image mode (max 10s): Use image as background
   - Description: "Choose where background should come from"

4. **Quality** (Button Group)
   - 720p (16⭐/sec) | 1080p (25⭐/sec)
   - Shows cost per second

5. **Motion Strength** (Slider)
   - Range: 0-100%
   - Default: 70%
   - Description: "Intensity of motion transfer"

6. **Advanced Settings** (Collapsible)
   - **Auto-trim:** Toggle (trim videos > 30s)
   - **Keep audio:** Toggle (preserve original audio)

7. **Generate Button**
   - Dynamic cost based on video duration × quality
   - Example: 10s × 25⭐/sec = 250⭐

---

## 🛠️ IMPLEMENTATION CHECKLIST

### Phase 1: Structure Refactor
- [ ] Remove Frames/Ingredients tabs completely
- [ ] Create 3 main tabs: Create Video, Edit Video, Motion Control
- [ ] Update VideoGeneratorHiru.tsx with new tab structure
- [ ] Create conditional rendering for each tab

### Phase 2: Create Video Tab
- [ ] Add Mode Toggle (Text→Video / Image→Video)
- [ ] Add Reference Image upload (conditional, for Image→Video)
- [ ] Add Start/End Frames uploads (conditional, for supported models)
- [ ] Make Duration selector dynamic based on selected model
- [ ] Add model-specific settings (Grok styles, WAN camera motion, etc.)
- [ ] Update DynamicSettings to handle new parameters

### Phase 3: Edit Video Tab
- [ ] Create EditVideoTab.tsx component
- [ ] Add video upload area
- [ ] Filter model selector (only WAN 2.6 and Grok)
- [ ] Add mode-specific settings
- [ ] Connect to API with v2v/style_transfer modes

### Phase 4: Motion Control Tab
- [ ] Create MotionControlTab.tsx component
- [ ] Remove model selector (fixed: Kling Motion Control)
- [ ] Add dual upload areas (Motion Video + Character)
- [ ] Add Scene Control Mode toggle
- [ ] Add Motion Strength slider
- [ ] Add Advanced Settings collapsible section
- [ ] Dynamic cost calculation (duration × quality)

### Phase 5: API Integration
- [ ] Update handleGenerate() to support all 3 tabs
- [ ] Add proper error handling for each mode
- [ ] Add loading states
- [ ] Add success/error toasts
- [ ] Test with all 8 models

### Phase 6: UI/UX Polish
- [ ] Update model cards with badges (FAST, MASTER, TURBO, etc.)
- [ ] Add tooltips for all info icons
- [ ] Add shimmer effects on Generate button
- [ ] Test modal close on outside click
- [ ] Ensure responsive design
- [ ] Add keyboard shortcuts

### Phase 7: Testing
- [ ] Test Create Video with all 7 standard models
- [ ] Test Edit Video with WAN 2.6 and Grok
- [ ] Test Motion Control with different durations
- [ ] Test cost calculation for all scenarios
- [ ] Test error states (missing files, invalid params)
- [ ] Test with different aspect ratios

---

## 📐 STYLING REFERENCE

```tsx
// Sidebar
className="w-full max-w-[340px] bg-[#1A1A1C] border-r border-zinc-800 p-4"

// Model Card (compact)
className="h-32 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600"

// Button Group (Mode/Duration/Resolution)
className="grid grid-cols-2 gap-2"
// Active button
className="bg-[#D4FF00] text-black font-bold"
// Inactive button
className="bg-white/5 text-white hover:bg-white/10"

// Generate Button
className="w-full py-3.5 bg-[#D4FF00] text-black font-bold rounded-2xl"

// Upload Area
className="border-2 border-dashed border-zinc-700 bg-zinc-900/50 rounded-xl p-6"

// Tabs
className="flex gap-2 p-2 bg-[#161616] rounded-xl"
// Active tab
className="px-4 py-2 bg-[#D4FF00] text-black rounded-lg"
// Inactive tab
className="px-4 py-2 text-zinc-400 hover:text-white"
```

---

## 🚀 READY TO START?

Confirm to begin complete refactor! 🎬
