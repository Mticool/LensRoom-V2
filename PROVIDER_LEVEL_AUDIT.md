# PROVIDER-LEVEL AUDIT REPORT
Date: 2026-01-27

## CRITICAL FINDING: Reference Images NOT Implemented

### Priority #1: Veo 3.1 Reference Images BROKEN ❌

**TRACE: UI → API → Provider**

1. ✅ **UI Layer** (`VideoGeneratorHiru.tsx`)
   - State: `const [referenceImages, setReferenceImages] = useState<File[]>([])`
   - Upload UI: Lines 474-503 (shows when `supportsReferenceImages`)
   - Passed to onGenerate: Line 371

2. ✅ **API Route Parsing** (`api/generate/video/route.ts`)
   - Line 70: `referenceImages` extracted from body
   - Line 102: Passed to validation
   - Line 325-338: Validated (max 3 for Veo)

3. ❌ **MISSING: Asset Upload Step**
   - Lines 646-687: Upload logic handles:
     - ✅ `referenceImage` (singular) → `imageUrl`
     - ✅ `startImage` → `imageUrl`
     - ✅ `endImage` → `lastFrameUrl`
     - ✅ `referenceVideo` → `videoUrl`
     - ❌ **`referenceImages` (array) NOT HANDLED**
   - **BUG:** Array of reference images never uploaded to storage
   - **RESULT:** No URLs generated for provider payload

4. ❌ **Provider Mapping Layer NOT USED**
   - File exists: `lib/providers/kie/video.ts`
   - Has mapping: Lines 48-50 `payload.imageUrls = request.referenceImages`
   - **BUT:** Never called from `route.ts`
   - **INSTEAD:** Old direct API calls used (lines 730-1200)

5. ❌ **Provider Payload: Reference Images NOT SENT**
   - **GenAIPro** (lines 770-900): 
     - Uses `genaiproClient.generateVideoFromText()`
     - NO imageUrls parameter
     - NO reference image support
   - **LaoZhang** (lines 909-1000):
     - Uses `videoClient.generateVideo()`
     - Has `startImageUrl` + `endImageUrl` params
     - NO `imageUrls` array parameter
   - **Kie Market** (lines 1000+):
     - Uses `kieClient.generateVideo()`
     - Has `imageUrl` (singular)
     - NO `imageUrls` array parameter

**ROOT CAUSE:**
1. New provider mapping layer (`providers/kie/video.ts`) created but NOT integrated
2. Old API client methods don't support `imageUrls` array
3. Upload logic missing for `referenceImages` array
4. Provider clients need `imageUrls` array support

---

## Technical Settings Matrix (ALL 8 Models)

### Legend
- ✅ REAL: Setting is shown, validated, mapped, and sent
- ⚠️ PARTIAL: Setting exists but incomplete wiring
- ❌ FAKE: UI control exists but never used

---

### 1. Veo 3.1 Fast (veo3_1_fast)

| Setting | UI | Request Schema | Backend Validation | Provider Mapping | Actually Sent | Status |
|---------|----|-----------------|--------------------|------------------|---------------|--------|
| **durationSec** | ❌ Hidden (fixed 8s) | ✅ Yes | ✅ fixedDuration check | ❌ Not sent (uses default) | ❌ No | ⚠️ PARTIAL |
| **aspectRatio** | ✅ Yes | ✅ Yes | ✅ Validated | ✅ Mapped | ✅ Yes | ✅ REAL |
| **quality** | ❌ Hidden | ❌ No | ✅ Rejected if provided | ❌ Not sent | ❌ No | ✅ REAL |
| **sound** | ❌ Hidden | ✅ Yes | ✅ Rejected if true | ❌ Not sent | ❌ No | ✅ REAL |
| **referenceImages** | ✅ Yes (max 3) | ✅ Yes | ✅ Validated array | ❌ NOT MAPPED | ❌ **NEVER SENT** | ❌ **FAKE** |
| **startImage** | ✅ Yes | ✅ Yes | ✅ Validated | ⚠️ Uploaded but not sent to Veo | ⚠️ Partial | ⚠️ PARTIAL |
| **endImage** | ✅ Yes | ✅ Yes | ✅ Validated | ⚠️ Uploaded but not sent to Veo | ⚠️ Partial | ⚠️ PARTIAL |
| **referenceVideo** | ✅ Yes (ref2v mode) | ✅ Yes | ✅ Mode check | ❌ Not mapped for Veo | ❌ No | ❌ FAKE |
| **fps** | ❌ Not shown | ❌ No | ❌ No | ❌ No | ❌ No | N/A |
| **seed** | ❌ Not shown | ❌ No | ❌ No | ❌ No | ❌ No | N/A |
| **cfg/strength** | ❌ Not shown | ❌ No | ❌ No | ❌ No | ❌ No | N/A |

**ISSUES:**
- ❌ **referenceImages uploaded but NEVER sent** (critical)
- ❌ **ref2v mode declared but NOT implemented**
- ⚠️ Duration fixed at 8s but not explicitly sent (relies on provider default)
- ⚠️ startImage/endImage uploaded but GenAIPro/LaoZhang don't use them for Veo

---

### 2. Kling 2.6 (kling_2_6)

| Setting | UI | Request Schema | Backend Validation | Provider Mapping | Actually Sent | Status |
|---------|----|-----------------|--------------------|------------------|---------------|--------|
| **durationSec** | ✅ 5/10s | ✅ Yes | ✅ Validated | ✅ Mapped | ✅ Yes | ✅ REAL |
| **aspectRatio** | ✅ 1:1/16:9/9:16 | ✅ Yes | ✅ Validated | ✅ Mapped | ✅ Yes | ✅ REAL |
| **quality** | ✅ 720p/1080p | ✅ Yes | ✅ Validated | ✅ resolution field | ✅ Yes | ✅ REAL |
| **sound** | ✅ Toggle | ✅ Yes | ✅ Validated | ✅ Mapped | ✅ Yes | ✅ REAL |
| **inputImage** | ✅ Yes (i2v) | ✅ Yes | ✅ Mode check | ✅ Uploaded + mapped | ✅ Yes | ✅ REAL |
| **startImage** | ✅ Yes | ✅ Yes | ✅ Validated | ✅ Uploaded + mapped | ✅ Yes | ✅ REAL |
| **endImage** | ✅ Yes | ✅ Yes | ✅ Validated | ✅ Uploaded + mapped | ✅ Yes | ✅ REAL |
| **fps** | ❌ Not shown | ❌ No | ❌ No | ❌ No | ❌ No | N/A |
| **seed** | ❌ Not shown | ❌ No | ❌ No | ❌ No | ❌ No | N/A |

**STATUS:** ✅ ALL SETTINGS REAL

---

### 3. Kling 2.5 (kling_2_5)

| Setting | UI | Request Schema | Backend Validation | Provider Mapping | Actually Sent | Status |
|---------|----|-----------------|--------------------|------------------|---------------|--------|
| **durationSec** | ✅ 5/10s | ✅ Yes | ✅ Validated | ✅ Mapped | ✅ Yes | ✅ REAL |
| **aspectRatio** | ✅ 1:1/16:9/9:16 | ✅ Yes | ✅ Validated | ✅ Mapped | ✅ Yes | ✅ REAL |
| **quality** | ✅ 720p/1080p | ✅ Yes | ✅ Validated | ✅ resolution field | ✅ Yes | ✅ REAL |
| **sound** | ❌ Hidden (false) | ✅ Yes | ✅ Validated | ❌ Not sent | ❌ No | ✅ REAL |
| **inputImage** | ✅ Yes (i2v) | ✅ Yes | ✅ Mode check | ✅ Uploaded + mapped | ✅ Yes | ✅ REAL |

**STATUS:** ✅ ALL SETTINGS REAL

---

### 4. Kling 2.1 (kling_2_1)

| Setting | UI | Request Schema | Backend Validation | Provider Mapping | Actually Sent | Status |
|---------|----|-----------------|--------------------|------------------|---------------|--------|
| **durationSec** | ✅ 5/10s | ✅ Yes | ✅ Validated | ✅ Mapped | ✅ Yes | ✅ REAL |
| **aspectRatio** | ✅ 1:1/16:9/9:16 | ✅ Yes | ✅ Validated | ✅ Mapped | ✅ Yes | ✅ REAL |
| **quality** | ✅ 5 tiers | ✅ Yes | ✅ Validated | ⚠️ qualityTier sent | ⚠️ Unknown if API accepts | ⚠️ PARTIAL |
| **inputImage** | ✅ Yes (i2v) | ✅ Yes | ✅ Mode check | ✅ Uploaded + mapped | ✅ Yes | ✅ REAL |

**ISSUES:**
- ⚠️ **qualityTier** sent but Kie API support unknown (may be ignored)

---

### 5. Grok Video (grok_video)

| Setting | UI | Request Schema | Backend Validation | Provider Mapping | Actually Sent | Status |
|---------|----|-----------------|--------------------|------------------|---------------|--------|
| **durationSec** | ❌ Hidden (fixed 6s) | ✅ Yes | ✅ fixedDuration check | ✅ Mapped | ✅ Yes | ✅ REAL |
| **aspectRatio** | ✅ 16:9/9:16/1:1/auto | ✅ Yes | ✅ Validated | ✅ Mapped | ✅ Yes | ✅ REAL |
| **quality** | ❌ Hidden | ❌ No | ✅ Rejected if provided | ❌ Not sent | ❌ No | ✅ REAL |
| **sound** | ✅ Toggle | ✅ Yes | ✅ Validated | ✅ Mapped | ✅ Yes | ✅ REAL |
| **style** | ✅ 6 options | ✅ Yes | ⚠️ Not validated | ✅ Mapped (line 86) | ⚠️ Unknown | ⚠️ PARTIAL |
| **inputImage** | ✅ Yes (i2v) | ✅ Yes | ✅ Mode check | ✅ Uploaded + mapped | ✅ Yes | ✅ REAL |

**ISSUES:**
- ⚠️ **style** selector shown but no schema validation for valid values
- ⚠️ Unknown if Kie API accepts style parameter for Grok

---

### 6. Sora 2 (sora_2)

| Setting | UI | Request Schema | Backend Validation | Provider Mapping | Actually Sent | Status |
|---------|----|-----------------|--------------------|------------------|---------------|--------|
| **durationSec** | ✅ 5/10s | ✅ Yes | ✅ Validated | ✅ Mapped | ✅ Yes | ✅ REAL |
| **aspectRatio** | ✅ portrait/landscape | ✅ Yes | ✅ Validated | ✅ Mapped | ✅ Yes | ✅ REAL |
| **quality** | ❌ Hidden | ❌ No | ✅ Rejected if provided | ❌ Not sent | ❌ No | ✅ REAL |
| **sound** | ❌ Hidden | ✅ Yes | ✅ Validated | ❌ Not sent | ❌ No | ✅ REAL |
| **inputImage** | ✅ Yes (i2v) | ✅ Yes | ✅ Mode check | ✅ Uploaded + mapped | ✅ Yes | ✅ REAL |

**STATUS:** ✅ ALL SETTINGS REAL

---

### 7. WAN 2.6 (wan_2_6)

| Setting | UI | Request Schema | Backend Validation | Provider Mapping | Actually Sent | Status |
|---------|----|-----------------|--------------------|------------------|---------------|--------|
| **durationSec** | ✅ 5/10/15s | ✅ Yes | ✅ Validated | ✅ Mapped | ✅ Yes | ✅ REAL |
| **aspectRatio** | ✅ 16:9/9:16/1:1 | ✅ Yes | ✅ Validated | ✅ Mapped | ✅ Yes | ✅ REAL |
| **quality** | ✅ 720p/1080p | ✅ Yes | ✅ Validated | ✅ resolution field | ✅ Yes | ✅ REAL |
| **sound** | ❌ Hidden (false) | ✅ Yes | ✅ Validated | ❌ Not sent | ❌ No | ✅ REAL |
| **cameraMotion** | ✅ 9 options | ✅ Yes | ⚠️ Not validated | ✅ Mapped (line 92) | ⚠️ Unknown | ⚠️ PARTIAL |
| **stylePreset** | ✅ 4 options | ✅ Yes | ⚠️ Not validated | ✅ Mapped (line 95) | ⚠️ Unknown | ⚠️ PARTIAL |
| **motionStrength** | ❌ Not shown | ✅ Yes | ⚠️ Not validated | ✅ Mapped (line 98) | ❌ Never set | ❌ FAKE |
| **v2vVideo** | ✅ Yes (v2v mode) | ✅ Yes | ✅ Mode check | ✅ Uploaded + mapped | ✅ Yes | ✅ REAL |
| **inputImage** | ✅ Yes (i2v) | ✅ Yes | ✅ Mode check | ✅ Uploaded + mapped | ✅ Yes | ✅ REAL |

**ISSUES:**
- ⚠️ **cameraMotion** shown but no validation of enum values
- ⚠️ **stylePreset** shown but no validation of enum values
- ❌ **motionStrength** in schema but NO UI control (slider missing)

---

### 8. Kling Motion Control (kling_2_6_motion_control)

| Setting | UI | Request Schema | Backend Validation | Provider Mapping | Actually Sent | Status |
|---------|----|-----------------|--------------------|------------------|---------------|--------|
| **durationSec** | ✅ 5/10/15/30s | ✅ Yes | ⚠️ Validates fixed options, not range | ✅ Mapped | ✅ Yes | ⚠️ PARTIAL |
| **aspectRatio** | ✅ 16:9/9:16/1:1 | ✅ Yes | ✅ Validated | ✅ Mapped | ✅ Yes | ✅ REAL |
| **quality** | ✅ 720p/1080p | ✅ Yes | ✅ Validated | ✅ resolution field | ✅ Yes | ✅ REAL |
| **characterImage** | ✅ Yes | ✅ Yes (as inputImage) | ✅ Required check | ✅ Uploaded + mapped | ✅ Yes | ✅ REAL |
| **referenceVideo** | ✅ Yes | ✅ Yes | ✅ Required check | ✅ Uploaded + mapped | ✅ Yes | ✅ REAL |
| **characterOrientation** | ❌ Not shown | ✅ Yes | ❌ No | ✅ Hardcoded 'video' | ✅ Yes | ⚠️ PARTIAL |
| **sceneControlMode** | ✅ Yes (video/image) | ❌ Not in schema | ❌ No | ❌ Not mapped | ❌ No | ❌ FAKE |

**ISSUES:**
- ⚠️ **durationSec** capability defines range (3-30s) but UI uses fixed options
- ⚠️ **characterOrientation** hardcoded to 'video', no UI control
- ❌ **sceneControlMode** UI toggle exists but not wired to backend

---

## SUMMARY: FAKE/PARTIAL Settings

### CRITICAL (FAKE - shown but never sent)
1. ❌ **Veo referenceImages** - UI upload, validated, but NEVER sent to provider
2. ❌ **Veo ref2v mode** - Mode selector shows it, but no provider support
3. ❌ **WAN motionStrength** - In schema, in provider mapping, but NO UI
4. ❌ **Motion Control sceneControlMode** - UI toggle but not in request

### HIGH (PARTIAL - incomplete wiring)
5. ⚠️ **Veo startImage/endImage** - Uploaded but not used by GenAIPro/LaoZhang
6. ⚠️ **Grok style** - Shown, mapped, but no validation + unknown API support
7. ⚠️ **WAN cameraMotion** - Shown, mapped, but no validation + unknown API support
8. ⚠️ **WAN stylePreset** - Shown, mapped, but no validation + unknown API support
9. ⚠️ **Kling 2.1 qualityTier** - Sent but unknown if API accepts
10. ⚠️ **Motion Control duration** - Should be range slider (3-30s), uses fixed options

---

## ROOT CAUSE ANALYSIS

### Problem 1: New Provider Mapping Layer NOT Integrated
- **Created:** `lib/providers/kie/video.ts` (lines 11-114)
- **Function:** `mapRequestToKiePayload()` + `callKieGenerateVideo()`
- **Status:** ❌ **NEVER CALLED**
- **Instead:** Old direct `kieClient.generateVideo()` calls used
- **Impact:** All new mappings (imageUrls, style, camera) not utilized

### Problem 2: Provider Clients Don't Support New Features
- **GenAIPro:** `generateVideoFromText()` doesn't accept imageUrls
- **LaoZhang:** `generateVideo()` only has startImageUrl/endImageUrl (not array)
- **Kie Market:** `generateVideo()` has imageUrl (singular), not imageUrls

### Problem 3: Upload Step Missing for Arrays
- Single file uploads work: referenceImage, startImage, endImage, referenceVideo
- **Array upload missing:** referenceImages (Veo 3.1 feature)
- Need loop to upload each image and collect URLs

---

## FIXES REQUIRED

### Fix 1: Add referenceImages Upload Logic (**CRITICAL**)
**File:** `src/app/api/generate/video/route.ts`
**Location:** After line 654 (existing upload logic)

```typescript
// Handle Veo 3.1 reference images (array)
let referenceImageUrls: string[] | undefined;
if (referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
  console.log('[API] Uploading', referenceImages.length, 'reference images for Veo');
  referenceImageUrls = [];
  for (let i = 0; i < referenceImages.length; i++) {
    const refImg = referenceImages[i];
    if (refImg) {
      const uploadedUrl = await uploadDataUrlToStorage(refImg, `ref_${i}`);
      referenceImageUrls.push(uploadedUrl);
    }
  }
  console.log('[API] Uploaded reference images:', referenceImageUrls.length);
}
```

### Fix 2: Add imageUrls Support to Kie Client (**CRITICAL**)
**File:** `src/lib/api/kie-client.ts`
**Line:** 49 (VeoGenerateRequest interface)

```typescript
export interface VeoGenerateRequest {
  prompt: string;
  model?: 'veo3' | 'veo3_fast';
  aspectRatio?: string;
  enhancePrompt?: boolean;
  useFallback?: boolean;
  // For image-to-video
  imageUrls?: string[]; // ALREADY EXISTS
  // ADD: For reference-based generation
  referenceImageUrls?: string[]; // NEW FIELD
  // For callback webhook
  callBackUrl?: string;
}
```

### Fix 3: Pass referenceImageUrls to Provider (**CRITICAL**)
**File:** `src/app/api/generate/video/route.ts`
**Location:** Lines 770-900 (GenAIPro), 909-1000 (LaoZhang)

**GenAIPro:**
```typescript
// Line 796: Add to generateVideoFromText call
const videoGenResponse = await genaiproClient.generateVideoFromText({
  prompt: fullPrompt,
  aspect_ratio: genaiproAspectRatio,
  number_of_videos: 1,
  reference_images: referenceImageUrls, // ADD THIS
});
```

**LaoZhang:**
```typescript
// Line 956: Add to generateVideo call
const videoGenResponse = await videoClient.generateVideo({
  model: videoModelId,
  prompt: fullPrompt,
  startImageUrl: startImageUrlForVideo,
  endImageUrl: endImageUrlForVideo,
  referenceImages: referenceImageUrls, // ADD THIS
});
```

### Fix 4: Add Validation for Style/Camera Enums (**HIGH**)
**File:** `src/lib/videoModels/schema.ts`
**Location:** After line 70

```typescript
// Add enums for Grok styles
export const GrokStyleEnum = z.enum([
  'realistic', 'fantasy', 'sci-fi', 'cinematic', 'anime', 'cartoon'
]);

// Add enums for WAN camera motion
export const CameraMotionEnum = z.enum([
  'static', 'pan_left', 'pan_right', 'tilt_up', 'tilt_down', 
  'zoom_in', 'zoom_out', 'orbit', 'follow'
]);

// Add enums for WAN style presets
export const WANStylePresetEnum = z.enum([
  'realistic', 'anime', 'cinematic', 'artistic'
]);
```

**Then update VideoGenerationRequestSchema:**
```typescript
// Line ~120
style: GrokStyleEnum.optional(),
cameraMotion: CameraMotionEnum.optional(),
stylePreset: WANStylePresetEnum.optional(),
```

### Fix 5: Add motionStrength UI Control (**MEDIUM**)
**File:** `src/components/video/VideoGeneratorHiru.tsx`
**Location:** After camera motion selector (after new code)

```typescript
{/* Motion Strength Slider (WAN) */}
{selectedModel === 'wan-2.6' && (
  <div className="p-3 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08]">
    <div className="flex justify-between items-center mb-2">
      <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Сила движения</div>
      <div className="text-[13px] text-white font-medium">{motionStrength}</div>
    </div>
    <input
      type="range"
      min="0"
      max="100"
      value={motionStrength}
      onChange={(e) => setMotionStrength(Number(e.target.value))}
      className="w-full accent-[#D4FF00]"
    />
  </div>
)}
```

**Add state:**
```typescript
const [motionStrength, setMotionStrength] = useState(50);
```

### Fix 6: Remove sceneControlMode UI (Motion Control) (**LOW**)
**File:** `src/components/video/VideoGeneratorHiru.tsx`
**Action:** Remove toggle or wire to characterOrientation

Either remove the UI control OR map it:
```typescript
characterOrientation: sceneControlMode === 'video' ? 'video' : 'image'
```

### Fix 7: Add Dev Logs for Verification (**HIGH**)
**File:** `src/app/api/generate/video/route.ts`
**Location:** Before provider call

```typescript
// Add comprehensive logging
console.log('[API] 🔍 PROVIDER PAYLOAD AUDIT:', {
  model: model,
  provider: modelInfo.provider,
  mode: mode,
  aspectRatio: aspectRatio,
  duration: duration,
  quality: quality,
  sound: audio,
  // Reference assets
  hasReferenceImage: !!imageUrl,
  hasReferenceImages: !!referenceImageUrls,
  referenceImagesCount: referenceImageUrls?.length || 0,
  hasStartImage: !!imageUrl && mode === 'start_end',
  hasEndImage: !!lastFrameUrl,
  hasReferenceVideo: !!videoUrl,
  // Advanced settings
  style: style || 'not set',
  cameraMotion: cameraMotion || 'not set',
  stylePreset: stylePreset || 'not set',
  motionStrength: motionStrength || 'not set',
  // URLs (redacted)
  referenceImageUrlSample: referenceImageUrls?.[0]?.substring(0, 50) || 'none',
  imageUrlSample: imageUrl?.substring(0, 50) || 'none',
});
```

---

## MANUAL VERIFICATION CHECKLIST

### Veo ref2v with Reference Images
- [ ] Upload 3 reference images in UI
- [ ] Select ref2v mode
- [ ] Enter prompt
- [ ] Click generate
- [ ] Check server logs for:
  - [ ] "Uploading 3 reference images for Veo"
  - [ ] "Uploaded reference images: 3"
  - [ ] "PROVIDER PAYLOAD AUDIT: referenceImagesCount: 3"
  - [ ] referenceImageUrlSample shows valid URL
- [ ] Check GenAIPro/LaoZhang request includes `referenceImages` field
- [ ] Verify output video reflects reference images

### Grok Style Options
- [ ] Select Grok Video model
- [ ] Change style selector (e.g., "anime")
- [ ] Generate video
- [ ] Check logs for: `style: 'anime'`
- [ ] Verify Kie API receives style parameter
- [ ] Verify output style matches selection

### WAN Camera Motion
- [ ] Select WAN 2.6 model
- [ ] Choose camera motion (e.g., "zoom_in")
- [ ] Generate video
- [ ] Check logs for: `cameraMotion: 'zoom_in'`
- [ ] Verify camera motion in output

### WAN Motion Strength
- [ ] Select WAN 2.6
- [ ] Adjust motion strength slider to 80
- [ ] Generate video
- [ ] Check logs for: `motionStrength: 80`
- [ ] Verify motion intensity in output

---

## DELIVERY

### 1. Provider-Level Audit Report
✅ **THIS DOCUMENT**

### 2. Concrete Code Changes
📦 **7 Fixes documented above with exact file paths + line numbers**

### 3. Manual Verification Checklist
✅ **4 test scenarios with log verification steps**

---

## PRIORITY SUMMARY

**MUST FIX IMMEDIATELY:**
1. ❌ Veo referenceImages upload + pass to provider (BROKEN FEATURE)
2. ❌ Add imageUrls support to client interfaces
3. ❌ Pass referenceImageUrls to GenAIPro/LaoZhang

**SHOULD FIX SOON:**
4. ⚠️ Add enum validation for style/camera/stylePreset
5. ⚠️ Add motionStrength slider for WAN
6. ⚠️ Add dev logs for verification

**CAN FIX LATER:**
7. Remove or wire sceneControlMode for Motion Control
8. Replace Motion Control duration dropdown with range slider

---

**Total Issues:** 10 settings (4 FAKE, 6 PARTIAL)
**Critical Path:** Fix referenceImages upload → update client interfaces → verify logs
