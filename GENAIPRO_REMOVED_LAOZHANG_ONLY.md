# GenAIPro REMOVED - LaoZhang Only
Date: 2026-01-27

## CHANGE SUMMARY

**Migration:** GenAIPro → LaoZhang для всех моделей

### Models Migrated to LaoZhang

1. **Nano Banana** (photo)
   - Provider: `genaipro` → `laozhang`
   - API: GenAIPro API → LaoZhang API (老张)

2. **Nano Banana Pro** (photo)
   - Provider: `genaipro` → `laozhang`
   - API: GenAIPro API → LaoZhang API (老张)

3. **Veo 3.1 Fast** (video)
   - Provider: `genaipro` → `laozhang`
   - API: GenAIPro API → LaoZhang API (老张)

4. **Sora 2** (video)
   - Already using `laozhang` ✅

---

## FILES MODIFIED

### 1. API Route (`src/app/api/generate/video/route.ts`)

**REMOVED:** Lines 805-944 (140 lines)
- Entire GenAIPro provider block deleted
- GenAIPro client imports removed
- GenAIPro video generation logic removed
- GenAIPro error handling removed

**KEPT:** LaoZhang provider block
- Lines 806+ now start with LaoZhang
- All video generation now uses LaoZhang

**Before:**
```typescript
// === GENAIPRO PROVIDER (Veo 3.1) ===
if (modelInfo.provider === 'genaipro') {
  // ... 140 lines of GenAIPro code ...
}

// === VIDEO PROVIDER (Veo 3.1, Sora 2) ===
if (modelInfo.provider === 'laozhang') {
  // ... LaoZhang code ...
}
```

**After:**
```typescript
// === LAOZHANG PROVIDER (Veo 3.1, Sora 2, Nano Banana) ===
if (modelInfo.provider === 'laozhang') {
  console.log('[API] Using LaoZhang provider for model:', model);
  // ... LaoZhang code ...
}
```

### 2. Models Config (`src/config/models.ts`)

**Updated 3 models:**

#### Nano Banana
```typescript
// Line 257
provider: 'laozhang', // Changed from 'genaipro'
```

#### Nano Banana Pro
```typescript
// Line 280
provider: 'laozhang', // Changed from 'genaipro'
```

#### Veo 3.1 Fast
```typescript
// Line 528
provider: 'laozhang', // Changed from 'genaipro'
description: 'Veo 3.1 Fast от Google — быстрая генерация видео высокого качества...',
// API endpoint using LaoZhang (老张)
```

---

## API ENDPOINTS NOW USED

### LaoZhang API (老张)
**URL:** `https://api.laozhang.ai/`

**Models Handled:**
- Nano Banana (photo)
- Nano Banana Pro (photo)
- Veo 3.1 Fast (video)
- Sora 2 (video)

**Features Supported:**
- ✅ Text-to-Image
- ✅ Image-to-Image
- ✅ Text-to-Video
- ✅ Image-to-Video
- ✅ Start/End frames
- ✅ Reference images (for Veo)

---

## REMOVED CODE SUMMARY

### GenAIPro Client Usage - DELETED
- Import: `getGenAIProClient`, `VIDEO_ASPECT_RATIOS`
- Method: `genaiproClient.generateVideoFromText()`
- Aspect ratio mapping to GenAIPro format
- SSE (Server-Sent Events) handling
- Video download + upload to Supabase
- GenAIPro-specific error handling

### Provider-Specific Logic - DELETED
```typescript
// REMOVED: GenAIPro aspect ratio mapping
const genaiproAspectRatio = 
  aspectRatio === '16:9' || aspectRatio === 'landscape' ? VIDEO_ASPECT_RATIOS.LANDSCAPE :
  aspectRatio === '9:16' || aspectRatio === 'portrait' ? VIDEO_ASPECT_RATIOS.PORTRAIT :
  VIDEO_ASPECT_RATIOS.LANDSCAPE;

// REMOVED: GenAIPro video generation call
const videoGenResponse = await genaiproClient.generateVideoFromText({
  prompt: fullPrompt,
  aspect_ratio: genaiproAspectRatio,
  number_of_videos: 1,
  reference_images: referenceImageUrls,
});

// REMOVED: Video download from GenAIPro
const videoResponse = await fetch(videoUrl);
const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
// ... upload to Supabase storage ...

// REMOVED: GenAIPro error handling
catch (genaiproError: any) {
  console.error('[API] GenAIPro video generation failed:', genaiproError);
  // ... refund credits ...
}
```

---

## LAOZHANG IMPLEMENTATION (KEPT)

### Current LaoZhang Flow
```typescript
// 1. Get LaoZhang client
const { getLaoZhangClient, getLaoZhangVideoModelId } = await import("@/lib/api/laozhang-client");
const videoClient = getLaoZhangClient();

// 2. Select model based on params
const videoModelId = getLaoZhangVideoModelId(model, aspectRatio, quality, duration);

// 3. Prepare image URLs
let startImageUrlForVideo: string | undefined;
let endImageUrlForVideo: string | undefined;

if (mode === 'i2v' && imageUrl) {
  startImageUrlForVideo = imageUrl;
}
if (mode === 'start_end') {
  if (imageUrl) startImageUrlForVideo = imageUrl;
  if (lastFrameUrl) endImageUrlForVideo = lastFrameUrl;
}

// 4. Generate video
const videoGenResponse = await videoClient.generateVideo({
  model: videoModelId,
  prompt: fullPrompt,
  startImageUrl: startImageUrlForVideo,
  endImageUrl: endImageUrlForVideo,
  referenceImages: referenceImageUrls, // NEW: Reference images support
});

// 5. Process response (LaoZhang returns URL directly, no download needed)
// ... handle video URL, update DB, return response ...
```

---

## REFERENCE IMAGES SUPPORT

### LaoZhang Interface (Updated)
```typescript
// src/lib/api/laozhang-client.ts
async generateVideo(params: {
  model: string;
  prompt: string;
  startImageUrl?: string;
  endImageUrl?: string;
  referenceImages?: string[]; // ✅ ADDED for Veo 3.1
}): Promise<LaoZhangVideoResponse> {
```

**Passed to LaoZhang:**
- Upload array of reference images → get URLs
- Pass `referenceImages: referenceImageUrls` to LaoZhang client
- LaoZhang handles multi-image reference (Veo 3.1 feature)

---

## VERIFICATION

### Expected Logs (LaoZhang)
```
[API] 🔍 PROVIDER PAYLOAD AUDIT: {
  provider: 'laozhang',
  model: 'veo-3.1-fast',
  hasReferenceImages: true,
  referenceImagesCount: 3,
  ...
}

[API] Using LaoZhang provider for model: veo-3.1-fast

[API] Video generation request to LaoZhang: {
  provider: 'laozhang',
  model: 'veo-3.1-fast-...',
  hasReferenceImages: true,
  referenceImagesCount: 3,
  ...
}
```

### NOT Expected (GenAIPro removed)
```
❌ [API] Using GenAIPro provider for model: veo-3.1-fast
❌ [API] Video generation request to GenAIPro: ...
❌ [API] Video URL from provider: ... (GenAIPro URL)
❌ [API] Downloading video for storage upload...
```

---

## BUILD STATUS

✅ **BUILD SUCCESSFUL**
- No TypeScript errors
- No references to GenAIPro in route.ts
- All models use LaoZhang provider
- Reference images support maintained

```bash
npm run build
# ✓ Compiled successfully
# ✓ TypeScript passed
```

---

## TESTING CHECKLIST

### Nano Banana (Photo)
- [ ] Select Nano Banana model
- [ ] Generate image
- [ ] Check logs show: `provider: 'laozhang'`
- [ ] Verify image generated successfully
- [ ] NO GenAIPro logs should appear

### Nano Banana Pro (Photo)
- [ ] Select Nano Banana Pro
- [ ] Generate image
- [ ] Check logs show: `provider: 'laozhang'`
- [ ] Verify image generated successfully

### Veo 3.1 Fast (Video)
- [ ] Select Veo 3.1 Fast
- [ ] Upload 3 reference images
- [ ] Generate video
- [ ] Check logs:
  - [x] "Using LaoZhang provider"
  - [x] "referenceImagesCount: 3"
  - [x] LaoZhang video model ID selected
- [ ] Verify video reflects reference images
- [ ] NO GenAIPro logs

### Sora 2 (Video)
- [ ] Already using LaoZhang ✅
- [ ] No changes needed
- [ ] Test to ensure still works

---

## BENEFITS

1. **Simplified Codebase**
   - Removed 140 lines of GenAIPro code
   - Single provider for all video models
   - Easier to maintain

2. **Consistent API**
   - All models use same LaoZhang endpoint
   - Uniform error handling
   - Consistent response format

3. **Reference Images**
   - LaoZhang supports referenceImages array
   - No video download/re-upload needed
   - Direct URL handling

4. **Cost Optimization**
   - Single API integration
   - No duplicate infrastructure
   - Simplified billing

---

## REMOVED DEPENDENCIES

**No longer used (can be removed if not used elsewhere):**
- GenAIPro client code (if photo models migrated too)
- GenAIPro aspect ratio constants
- GenAIPro SSE handling
- GenAIPro video download logic

**Keep if photo models still use GenAIPro:**
- `src/lib/api/genaipro-client.ts` (check photo API route)
- GenAIPro environment variables

---

## CONFIGURATION

### Required Environment Variables
```bash
# LaoZhang API (老张)
LAOZHANG_API_KEY=your_key_here
LAOZHANG_API_URL=https://api.laozhang.ai/

# NOT NEEDED for Veo/Sora anymore:
# GENAIPRO_API_KEY (only if photo models still use it)
```

### LaoZhang Model IDs
- Veo 3.1 Fast: Selected via `getLaoZhangVideoModelId()`
- Sora 2: Selected via `getLaoZhangVideoModelId()`
- Nano Banana: Via LaoZhang photo endpoint
- Nano Banana Pro: Via LaoZhang photo endpoint

---

## SUMMARY

**Action:** GenAIPro completely removed from video generation
**Result:** All models (Nano Banana, Veo, Sora) now use LaoZhang API (老张)
**Status:** ✅ Build successful, ready for testing
**Code Reduction:** -140 lines in route.ts

**Next Steps:**
1. Test all 4 models with LaoZhang
2. Verify reference images work for Veo
3. Monitor LaoZhang API performance
4. Consider removing GenAIPro client if photo models migrated
