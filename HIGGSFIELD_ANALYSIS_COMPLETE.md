# 🎬 HIGGSFIELD.AI VIDEO GENERATOR - COMPLETE ANALYSIS

**Source:** https://higgsfield.ai/create/video  
**Date:** 2026-01-26  
**Analysis:** 1:1 Reverse Engineering для LensRoom

---

## 📐 OVERALL LAYOUT

### Page Structure
```
┌─────────────────────────────────────────────────────────────────┐
│ Header (Global Navigation)                                       │
├──────────────────┬──────────────────────────────────────────────┤
│                  │                                              │
│   Left Sidebar   │          Main Content Area                   │
│   (Generator)    │          (Preview / History)                 │
│   max-w-[340px]  │                                              │
│                  │                                              │
└──────────────────┴──────────────────────────────────────────────┘
```

### Colors & Theme
- **Background:** `#0A0A0B` (почти черный)
- **Sidebar BG:** `#1A1A1C` (темно-серый)
- **Borders:** `#262626` (zinc-800)
- **Accent (Generate):** `#D4FF00` (lime-yellow)
- **Text Primary:** `#FFFFFF`
- **Text Secondary:** `#A1A1AA` (zinc-400)
- **Active Button:** `#D4FF00` с черным текстом
- **Inactive Button:** `bg-white/5` (прозрачный белый 5%)

---

## 🎯 TAB 1: CREATE VIDEO

### Components (Top to Bottom):

#### 1. **Model Card** (h-32)
```tsx
<div className="h-32 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 relative overflow-hidden">
  {/* Background Video Preview (если есть) */}
  <video className="absolute inset-0 opacity-20 blur-sm" />
  
  {/* Content */}
  <div className="relative p-3 flex flex-col justify-between h-full">
    {/* Top Right: Change Button */}
    <button className="self-end px-2.5 py-1 bg-white/15 backdrop-blur-sm rounded-md text-white text-[11px]">
      ✏️ Change
    </button>
    
    {/* Bottom Left: Model Info */}
    <div>
      <div className="text-[#D4FF00] text-xs font-bold uppercase">GENERAL</div>
      <div className="text-white text-base font-semibold">Google VEO 3.1</div>
    </div>
  </div>
</div>
```

**Features:**
- Background: gradient от синего к фиолетовому
- Video preview (опционально) с blur и opacity 20%
- Change button в правом верхнем углу
- Badge "GENERAL" lime-yellow цвет
- Model name белый, semibold

---

#### 2. **Frames / Ingredients Toggle**
```tsx
<div className="flex gap-2 p-1 bg-[#161616] rounded-xl">
  <button className={active ? 'px-4 py-2 bg-[#262626] text-white rounded-lg' : 'px-4 py-2 text-zinc-400'}>
    Frames
  </button>
  <button className={active ? 'px-4 py-2 bg-[#262626] text-white rounded-lg' : 'px-4 py-2 text-zinc-400'}>
    Ingredients
  </button>
</div>
```

**Frames Tab:**
- Показывает 2 upload area для Start Frame и End Frame
- Каждый upload: темный фон, dashed border, иконка, текст "Optional"

**Ingredients Tab:**
- Показывает upload area для референсных изображений
- Текст: "Drop or upload up to 3 images" (для Veo 3.1)
- PNG, JPG or Paste from clipboard

---

#### 3. **Start/End Frame Uploads** (только во Frames Tab)
```tsx
<div className="grid grid-cols-2 gap-3">
  {/* Start Frame */}
  <div className="border-2 border-dashed border-zinc-700 bg-zinc-900/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-800/50">
    <img src="upload-icon" className="w-8 h-8 mb-2 opacity-50" />
    <p className="text-sm text-white font-medium">Start frame</p>
    <p className="text-xs text-zinc-500">Optional</p>
  </div>
  
  {/* End Frame */}
  <div className="...same as above...">
    <img src="upload-icon" />
    <p>End frame</p>
    <p>Optional</p>
  </div>
</div>
```

---

#### 4. **Prompt Textarea**
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-white">Prompt</label>
  <textarea 
    placeholder="Describe the scene you imagine, with details."
    rows={4}
    className="w-full px-4 py-3 bg-transparent border border-[#262626] rounded-2xl text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
  />
</div>
```

**Features:**
- Transparent background
- Border zinc-600
- Focus: border становится светлее
- Placeholder серого цвета

---

#### 5. **Enhance Toggle**
```tsx
<div className="flex items-center gap-2 cursor-pointer">
  <img src="sparkles-icon" className="w-4 h-4" />
  <span className="text-sm text-white">Enhance on</span>
  <input type="checkbox" checked className="..." />
</div>
```

**Style:**
- Иконка sparkles (✨)
- Текст "Enhance on/off"
- Custom checkbox (styled switch)

---

#### 6. **Multi-shot Mode** (только для Veo 3.1)
```tsx
<div className="flex items-center justify-between p-3 bg-[#161616] rounded-2xl border border-[#262626]">
  <div className="flex items-center gap-2">
    <span className="text-sm font-medium text-white">Multi-shot mode</span>
    <button className="...info-icon...">
      <img src="info-icon" />
    </button>
  </div>
  
  {/* Toggle Switch */}
  <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-[#D4FF00]">
    <span className="inline-block h-4 w-4 transform rounded-full bg-black translate-x-6" />
  </button>
</div>
```

**Tooltip on Info Icon:**
- "Generate multiple scenes in one video with smooth transitions"

---

#### 7. **Model Selector Dropdown**
```tsx
<button className="w-full flex items-center justify-between p-3 bg-[#161616] rounded-xl border border-[#262626] hover:bg-[#1a1a1a]">
  <div>
    <div className="text-xs text-zinc-500">Model</div>
    <div className="text-sm font-medium text-white flex items-center gap-1">
      Google Veo 3.1 Fast
      <img src="google-icon" className="w-4 h-4" />
    </div>
  </div>
  <img src="chevron-down" />
</button>
```

**Opens Dropdown/Combobox with list**

---

#### 8. **Settings Row** (3 dropdowns in a row)
```tsx
<div className="flex gap-2">
  {/* Quality */}
  <button className="flex-1 flex items-center justify-between p-2 bg-[#161616] rounded-lg border border-[#262626]">
    <div>
      <div className="text-[10px] text-zinc-500 uppercase">Quality</div>
      <div className="text-sm font-medium text-white">720p</div>
    </div>
    <img src="chevron-down" className="w-4 h-4" />
  </button>
  
  {/* Ratio */}
  <button className="flex-1 ...">
    <div>
      <div className="text-[10px] text-zinc-500 uppercase">Ratio</div>
      <div className="text-sm text-white">16:9</div>
    </div>
    <img src="chevron-down" />
  </button>
  
  {/* Duration */}
  <button className="flex-1 ...">
    <div>
      <div className="text-[10px] text-zinc-500 uppercase">Duration</div>
      <div className="text-sm text-white">8s</div>
    </div>
    <img src="chevron-down" />
  </button>
</div>
```

**Layout:**
- 3 кнопки в ряд (flex-1 для равной ширины)
- Каждая кнопка: label сверху (uppercase, xs), value снизу (sm, medium)
- Chevron-down справа

---

#### 9. **Generate Button**
```tsx
<button className="w-full py-3.5 bg-[#D4FF00] text-black font-bold text-base rounded-2xl hover:bg-[#c4ef00] transition-all flex items-center justify-center gap-3">
  <span>Generate</span>
  <span className="flex items-center gap-1">
    <img src="sparkles" className="w-4 h-4" />
    22
  </span>
</button>
```

**Features:**
- Full width
- Lime-yellow background (#D4FF00)
- Black text, bold
- Sparkles icon + cost (22 credits)
- Hover: slightly darker yellow

---

## 🎯 TAB 2: EDIT VIDEO

### Components:

#### 1. **Model Card** (different from Create Video)
```tsx
<figure className="relative h-48 rounded-2xl overflow-hidden">
  {/* Background Video */}
  <video className="w-full h-full object-cover" />
  
  {/* Overlay Info */}
  <div className="absolute bottom-0 left-0 p-4">
    <div className="text-[#D4FF00] text-xs font-bold uppercase">KLING O1 EDIT</div>
    <div className="text-white text-sm">Modify, restyle, change angles, transform</div>
  </div>
  
  {/* How it works button */}
  <button className="absolute top-4 right-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-lg text-white text-xs">
    📖 How it works
  </button>
</figure>
```

---

#### 2. **Upload Video to Edit**
```tsx
<div className="border-2 border-dashed border-zinc-700 bg-zinc-900/50 rounded-xl p-8 flex flex-col items-center justify-center">
  <img src="video-icon" className="w-12 h-12 mb-3 opacity-50" />
  <p className="text-sm text-white font-medium">Upload a video to edit</p>
  <p className="text-xs text-zinc-500">Duration required: 3–10 secs</p>
</div>
```

---

#### 3. **Upload Images & Elements** (Optional)
```tsx
<div className="flex items-center gap-3 p-3 bg-[#161616] rounded-xl border border-[#262626]">
  <span className="text-xs text-zinc-500">Optional</span>
  <button className="px-3 py-1.5 bg-white/5 rounded-lg text-sm text-white">Choose File</button>
  <div className="flex items-center gap-2 cursor-pointer hover:opacity-80">
    <img src="plus-icon" className="w-5 h-5" />
    <div>
      <p className="text-sm text-white">Upload images & elements</p>
      <p className="text-xs text-zinc-500">Up to 4 images or elements</p>
    </div>
  </div>
</div>
```

---

#### 4. **Prompt**
```tsx
<div className="space-y-2">
  <p className="text-sm text-white">Prompt</p>
  <textarea 
    placeholder='Describe the visual change you want - e.g., "Make it snow" or "Make it nighttime". Add reference images or elements using @...'
    className="w-full px-4 py-3 bg-transparent border border-[#262626] rounded-2xl text-white text-sm"
  />
</div>
```

**Features:**
- Placeholder объясняет, что делать
- Mention поддержка (@) для референс изображений

---

#### 5. **Auto Settings Toggle**
```tsx
<div className="flex items-center justify-between p-3 bg-[#161616] rounded-xl border border-[#262626]">
  <span className="text-sm text-white">Auto settings</span>
  <input type="checkbox" checked className="..." />
</div>
```

---

#### 6. **Resolution Dropdown**
```tsx
<button className="w-full flex items-center justify-between p-3 bg-[#161616] rounded-xl border border-[#262626]">
  <div>
    <div className="text-xs text-zinc-500 uppercase">Resolution</div>
    <div className="text-sm text-white">720p</div>
  </div>
  <img src="chevron-down" />
</button>
```

---

#### 7. **Generate Button**
```tsx
<button className="w-full py-3.5 bg-[#D4FF00] text-black font-bold rounded-2xl">
  <span>Generate</span>
  <span className="flex items-center gap-1">
    <img src="sparkles" />
    9
  </span>
</button>
```

**Cost:** 9 credits (меньше чем Create Video)

---

## 🎯 TAB 3: MOTION CONTROL

### Components:

#### 1. **Model Card**
```tsx
<figure className="relative h-48 rounded-2xl overflow-hidden">
  <video className="w-full h-full object-cover" />
  
  {/* Overlay */}
  <div className="absolute bottom-0 left-0 p-4">
    <div className="text-[#D4FF00] text-xs font-bold uppercase">MOTION CONTROL</div>
    <div className="text-white text-sm">Control motion with video references</div>
  </div>
  
  {/* Open Motion Library button */}
  <button className="absolute top-4 right-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-lg text-white text-xs flex items-center gap-2">
    <img src="library-icon" />
    Open Motion Library
  </button>
</figure>
```

---

#### 2. **Dual Upload Areas**
```tsx
<div className="grid grid-cols-2 gap-3">
  {/* Add Motion to Copy */}
  <div className="border-2 border-dashed border-zinc-700 bg-zinc-900/50 rounded-xl p-6 flex flex-col items-center justify-center">
    <img src="video-icon" className="w-10 h-10 mb-2 opacity-50" />
    <p className="text-sm text-white font-medium">Add motion to copy</p>
    <p className="text-xs text-zinc-500">Video duration: 3–30 seconds</p>
  </div>
  
  {/* Add Your Character */}
  <div className="...same style...">
    <img src="image-icon" />
    <p className="text-sm text-white">Add your character</p>
    <p className="text-xs text-zinc-500">Image with visible face and body</p>
  </div>
</div>
```

---

#### 3. **Quality Dropdown**
```tsx
<button className="w-full flex items-center justify-between p-3 bg-[#161616] rounded-xl border border-[#262626]">
  <div>
    <div className="text-xs text-zinc-500 uppercase">Quality</div>
    <div className="text-sm text-white">720p</div>
  </div>
  <img src="chevron-down" />
</button>
```

---

#### 4. **Scene Control Mode**
```tsx
<div className="space-y-3">
  {/* Toggle Header */}
  <div className="flex items-center justify-between">
    <span className="text-sm text-white font-medium">Scene control mode</span>
    <input type="checkbox" checked className="..." />
  </div>
  
  {/* Video/Image Buttons */}
  <div>
    <div className="flex gap-2 p-1 bg-[#161616] rounded-xl">
      <button className="flex-1 flex items-center gap-2 px-3 py-2 bg-[#262626] text-white rounded-lg">
        <img src="video-icon" className="w-4 h-4" />
        Video
      </button>
      <button className="flex-1 flex items-center gap-2 px-3 py-2 text-zinc-400 rounded-lg">
        <img src="image-icon" className="w-4 h-4" />
        Image
      </button>
    </div>
    
    {/* Description */}
    <p className="text-xs text-zinc-500 mt-2">
      Choose where the background should come from: the character image or the motion video
    </p>
  </div>
</div>
```

**Features:**
- Toggle switch сверху
- Два режима: Video (active) / Image
- Active button: bg-[#262626], white text
- Inactive: transparent, zinc-400 text
- Description текст снизу

---

#### 5. **Advanced Settings** (Collapsible)
```tsx
<details className="group">
  <summary className="flex items-center justify-between cursor-pointer p-3 bg-[#161616] rounded-xl border border-[#262626]">
    <h3 className="text-sm font-medium text-white">Advanced settings</h3>
    <img src="chevron-down" className="w-4 h-4 transition-transform group-open:rotate-180" />
  </summary>
  
  <div className="mt-3 space-y-3">
    {/* Advanced settings content */}
  </div>
</details>
```

---

#### 6. **Generate Button**
```tsx
<button className="w-full py-3.5 bg-[#D4FF00] text-black font-bold rounded-2xl">
  <span>Generate</span>
  <span className="flex items-center gap-1">
    <img src="sparkles" />
    5
  </span>
</button>
```

**Cost:** 5 credits (самый дешевый режим)

---

## 🎨 MODEL SELECTOR MODAL

### Structure:
```tsx
<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
  <div className="bg-[#1A1A1C] rounded-2xl border border-zinc-800 p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
    {/* Header */}
    <div className="flex items-center justify-between mb-6">
      <div className="flex gap-4">
        {/* Tabs: Higgsfield DoP, Kling 2.5, Kling 2.6, etc. */}
        <button className="px-4 py-2 bg-white/5 rounded-lg text-white text-sm">
          Google Veo 3.1
        </button>
        {/* ... more tabs */}
      </div>
      
      {/* Search */}
      <div className="relative">
        <input 
          type="text" 
          placeholder="Search"
          className="px-4 py-2 bg-[#161616] border border-zinc-700 rounded-lg text-white"
        />
        <img src="search-icon" className="absolute right-3 top-1/2 -translate-y-1/2" />
      </div>
      
      {/* Close Button */}
      <button className="text-zinc-400 hover:text-white">
        <img src="x-icon" />
      </button>
    </div>
    
    {/* Model Card Preview */}
    <figure className="relative h-64 rounded-2xl overflow-hidden mb-6">
      <video className="w-full h-full object-cover" />
      <div className="absolute bottom-0 left-0 p-4">
        <div className="text-[#D4FF00] text-sm font-bold uppercase">GENERAL</div>
      </div>
    </figure>
  </div>
</div>
```

**Features:**
- Fixed overlay с backdrop-blur
- Tabs для категорий моделей (горизонтальный scroll)
- Search input справа
- Large preview card с видео
- Click outside to close

---

## 📊 RIGHT PANEL (History / How it works)

### Structure:
```tsx
<div className="flex-1 bg-[#0A0A0B] p-6">
  {/* Tabs */}
  <div className="flex gap-4 border-b border-zinc-800 mb-6">
    <button className="flex items-center gap-2 px-4 py-2 border-b-2 border-[#D4FF00] text-white">
      <img src="history-icon" />
      History
    </button>
    <button className="flex items-center gap-2 px-4 py-2 text-zinc-500">
      <img src="info-icon" />
      How it works
    </button>
  </div>
  
  {/* Content */}
  <div className="space-y-4">
    {/* History items or How it works content */}
  </div>
</div>
```

**Features:**
- Two tabs: History (active) and How it works
- Active tab: border-b-2 lime-yellow
- Inactive: gray text
- Icons for each tab

---

## 🎯 KEY DESIGN PATTERNS

### 1. **Upload Areas**
```css
.upload-area {
  border: 2px dashed #3f3f46; /* zinc-700 */
  background: rgba(24, 24, 27, 0.5); /* zinc-900/50 */
  border-radius: 0.75rem; /* rounded-xl */
  padding: 1.5rem; /* p-6 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 200ms;
}

.upload-area:hover {
  background: rgba(39, 39, 42, 0.5); /* zinc-800/50 */
}
```

### 2. **Dropdown Button**
```css
.dropdown-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem; /* p-3 */
  background: #161616;
  border: 1px solid #262626;
  border-radius: 0.75rem; /* rounded-xl */
  transition: background 200ms;
}

.dropdown-button:hover {
  background: #1a1a1a;
}
```

### 3. **Toggle Switch**
```css
.toggle-switch {
  position: relative;
  display: inline-flex;
  height: 1.5rem; /* h-6 */
  width: 2.75rem; /* w-11 */
  align-items: center;
  border-radius: 9999px; /* rounded-full */
  background: #D4FF00; /* when active */
  transition: background 200ms;
}

.toggle-switch-thumb {
  display: inline-block;
  height: 1rem; /* h-4 */
  width: 1rem; /* w-4 */
  border-radius: 9999px;
  background: #000;
  transform: translateX(1.5rem); /* when active */
  transition: transform 200ms;
}
```

### 4. **Button Group (Active/Inactive)**
```css
.button-group-item.active {
  background: #D4FF00;
  color: #000;
  font-weight: 700;
}

.button-group-item.inactive {
  background: rgba(255, 255, 255, 0.05); /* bg-white/5 */
  color: #fff;
}

.button-group-item.inactive:hover {
  background: rgba(255, 255, 255, 0.1); /* bg-white/10 */
}
```

---

## 🚀 IMPLEMENTATION PRIORITY

### Phase 1: Core Structure
1. ✅ Create 3-tab layout (Create Video, Edit Video, Motion Control)
2. ✅ Build left sidebar with max-w-[340px]
3. ✅ Add right panel for History/How it works

### Phase 2: Create Video Tab
1. ✅ Model Card with gradient background
2. ✅ Frames/Ingredients toggle
3. ✅ Start/End frame uploads (grid 2 columns)
4. ✅ Prompt textarea
5. ✅ Enhance toggle
6. ✅ Multi-shot mode (conditional for Veo 3.1)
7. ✅ Model selector dropdown
8. ✅ Settings row (Quality, Ratio, Duration - 3 dropdowns)
9. ✅ Generate button

### Phase 3: Edit Video Tab
1. ✅ Model card (taller, with "How it works" button)
2. ✅ Upload video area
3. ✅ Upload images & elements (optional)
4. ✅ Prompt with @ mention support
5. ✅ Auto settings toggle
6. ✅ Resolution dropdown
7. ✅ Generate button

### Phase 4: Motion Control Tab
1. ✅ Model card with "Motion Library" button
2. ✅ Dual upload areas (Motion video + Character)
3. ✅ Quality dropdown
4. ✅ Scene control mode (Video/Image toggle)
5. ✅ Advanced settings (collapsible)
6. ✅ Generate button

### Phase 5: Modal & Interactions
1. ✅ Model selector modal with tabs and search
2. ✅ Click outside to close
3. ✅ Smooth transitions
4. ✅ Hover states
5. ✅ Loading states

---

## 📝 CRITICAL DIFFERENCES FROM CURRENT LENSROOM

### ❌ Remove:
- Frames/Ingredients tabs в текущем виде (некорректная структура)
- Лишние параметры, которых нет в Higgsfield

### ✅ Add:
- Proper 3-tab navigation
- Settings row (3 dropdowns in a row вместо кнопок)
- Scene control mode в Motion Control
- Upload areas с proper styling
- Model selector modal с preview
- Advanced settings collapsible

### 🔄 Modify:
- Model Card: использовать gradient background
- Generate button: добавить sparkles icon и cost
- Prompt: убрать character counter (его нет в Higgsfield)
- Toggle switches: изменить на proper toggle design

---

## ✨ NEXT STEPS

1. **Confirm this analysis is correct** ✅
2. **Create new components based on Higgsfield:**
   - `VideoGeneratorHiruV2.tsx` (complete rewrite)
   - `CreateVideoTab.tsx`
   - `EditVideoTab.tsx`
   - `MotionControlTab.tsx`
   - `ModelSelectorModal.tsx`
3. **Update styling to match Higgsfield exactly**
4. **Test all interactions**
5. **Deploy** 🚀

---

**Ready to implement 1:1 copy! 🎬**
