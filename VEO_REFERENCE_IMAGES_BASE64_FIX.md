# Veo Reference Images - Base64 Fix
Date: 2026-01-27

## CRITICAL CHANGE

**Problem:** Veo reference images через LaoZhang API не работали
**Root Cause:** 
1. Референсы загружались в storage как URLs
2. Veo API требует Base64 data URLs (не HTTP URLs)
3. Нужна модель с суффиксом `-fl` для работы с референсами

**Solution:** 
1. ✅ Оставляем референсы как Base64 data URLs (не загружаем в storage)
2. ✅ Передаем через `messages/content` как `image_url` объекты
3. ✅ Автоматически добавляем `-fl` суффикс к модели Veo при наличии референсов
4. ✅ Лимитируем до 2 референсов (recommended by Google)

---

## KEY REQUIREMENTS (от laozhang.ai)

### 1. Формат: Base64 Data URLs
```typescript
// ✅ CORRECT
"data:image/jpeg;base64,{BASE64_STRING}"

// ❌ WRONG
"https://storage.supabase.co/..."
"gs://bucket/..."
```

### 2. Модель: с суффиксом -fl
```typescript
// ✅ CORRECT for reference images
"veo-3.1-fl"
"veo-3.1-fl-fast"
"veo-3.1-fl-landscape"

// ❌ WRONG - будет игнорировать референсы
"veo-3.1"
"veo-3.1-fast"
```

### 3. Лимит: 2-3 референса
- Veo 3.1 поддерживает до 3 изображений
- **Рекомендуется 2** для стабильности
- Наш код: лимит = 2

### 4. Структура: через messages/content
```json
{
  "model": "veo-3.1-fl-generate",
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text", "text": "A person walks carrying a vase" },
      { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." } },
      { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." } }
    ]
  }]
}
```

---

## CHANGES SUMMARY

### Files Modified: 2

1. **`src/app/api/generate/video/route.ts`**
   - Removed storage upload for `referenceImages`
   - Keep as Base64 data URLs
   - Limit to 2 images
   - Pass to LaoZhang as `referenceImageBase64s`

2. **`src/lib/api/laozhang-client.ts`**
   - Auto-add `-fl` suffix for Veo with reference images
   - Build `messages/content` array with `image_url` objects
   - Validate Base64 format (must start with `data:image/`)

---

## DETAILED CHANGES

### Change 1: Keep Reference Images as Base64 (route.ts)

**Before:**
```typescript
// Lines 656-670 (REMOVED)
let referenceImageUrls: string[] | undefined;
if (referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
  console.log('[API] Uploading', referenceImages.length, 'reference images for Veo');
  referenceImageUrls = [];
  for (let i = 0; i < referenceImages.length; i++) {
    const refImg = referenceImages[i];
    if (refImg) {
      const uploadedUrl = await uploadDataUrlToStorage(refImg, `ref_${i}`); // ❌ WRONG
      referenceImageUrls.push(uploadedUrl);
    }
  }
}
```

**After:**
```typescript
// Lines 656-667 (NEW)
let referenceImageBase64s: string[] | undefined;
if (referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
  // Limit to 2 images for stability (Veo supports up to 3, but 2 is recommended)
  const maxRefs = 2;
  referenceImageBase64s = referenceImages.slice(0, maxRefs); // ✅ Keep as Base64
  console.log('[API] Veo reference images:', {
    total: referenceImages.length,
    using: referenceImageBase64s.length,
    format: 'base64 data URLs', // ✅ No upload
    limited: referenceImages.length > maxRefs,
  });
}
```

**Impact:**
- ✅ No storage upload (faster)
- ✅ Correct format for Veo API
- ✅ Limit to 2 images
- ✅ Keep original Base64 from UI

### Change 2: Pass Base64 to LaoZhang Client (route.ts)

**Before:**
```typescript
// Line 859
const videoGenResponse = await videoClient.generateVideo({
  model: videoModelId,
  prompt: fullPrompt,
  startImageUrl: startImageUrlForVideo,
  endImageUrl: endImageUrlForVideo,
  referenceImages: referenceImageUrls, // ❌ Storage URLs
});
```

**After:**
```typescript
// Lines 854-863
const videoGenResponse = await videoClient.generateVideo({
  model: videoModelId,
  prompt: fullPrompt,
  startImageUrl: startImageUrlForVideo,
  endImageUrl: endImageUrlForVideo,
  referenceImages: referenceImageBase64s, // ✅ Base64 data URLs
});
```

**Logs Updated:**
```typescript
console.log('[API] Video generation request to LaoZhang:', {
  hasReferenceImages: !!referenceImageBase64s,
  referenceImagesCount: referenceImageBase64s?.length || 0,
  referenceImagesFormat: referenceImageBase64s ? 'base64 data URLs' : 'none', // ✅ NEW
  // ...
});
```

### Change 3: Auto-add -fl Suffix (laozhang-client.ts)

**Added:**
```typescript
// Lines 387-402 (NEW)
let finalModel = params.model;
const hasReferenceImages = params.referenceImages && params.referenceImages.length > 0;

if (hasReferenceImages && params.model.startsWith('veo') && !params.model.includes('-fl')) {
  // Add -fl suffix for Veo with reference images (required by API)
  const parts = params.model.split('-');
  const baseName = parts.slice(0, -1).join('-'); // e.g., "veo-3.1"
  const lastPart = parts[parts.length - 1]; // e.g., "fast" or "landscape"
  
  if (lastPart === 'fast' || lastPart === 'landscape') {
    finalModel = `${baseName}-fl-${lastPart}`; // "veo-3.1-fl-fast"
  } else {
    finalModel = `${params.model}-fl`; // "veo-3.1-fl"
  }
  
  console.log('[Video API] Using -fl model for reference images:', {
    original: params.model,
    final: finalModel,
    referenceCount: params.referenceImages?.length || 0,
  });
}
```

**Examples:**
```typescript
"veo-3.1" → "veo-3.1-fl"
"veo-3.1-fast" → "veo-3.1-fl-fast"
"veo-3.1-landscape" → "veo-3.1-fl-landscape"
"sora-2" → "sora-2" (no change, not Veo)
```

### Change 4: Build messages/content Array (laozhang-client.ts)

**Before:**
```typescript
// Lines 403-416 (OLD)
if (params.startImageUrl || params.endImageUrl) {
  // i2v or start_end mode
  // ... only handled start/end images
} else {
  messageContent = params.prompt;
}
```

**After:**
```typescript
// Lines 404-434 (NEW)
if (hasReferenceImages) {
  // ref2v mode - prompt + reference images (Base64)
  const contentParts: { type: string; text?: string; image_url?: { url: string } }[] = [
    { type: "text", text: params.prompt }
  ];
  
  // Add reference images (must be Base64 data URLs)
  if (params.referenceImages) {
    for (const refImageBase64 of params.referenceImages) {
      if (!refImageBase64.startsWith('data:image/')) {
        console.warn('[Video API] Reference image not in Base64 format, skipping');
        continue;
      }
      contentParts.push({
        type: "image_url",
        image_url: { url: refImageBase64 } // ✅ Base64 data URL
      });
    }
  }
  
  messageContent = contentParts;
  console.log("[Video API] Using ref2v mode with reference images:", {
    referenceCount: params.referenceImages?.length || 0,
    format: 'base64 data URLs',
  });
} else if (params.startImageUrl || params.endImageUrl) {
  // i2v or start_end mode (existing logic)
  // ...
} else {
  // t2v mode - text only
  messageContent = params.prompt;
}
```

**Priority:**
1. Reference images (ref2v) - highest priority
2. Start/End images (i2v/start_end)
3. Text only (t2v)

### Change 5: Update Logs (laozhang-client.ts)

**Added to logs:**
```typescript
console.log("[Video API] Request to LaoZhang:", {
  model: finalModel, // ✅ May have -fl suffix
  originalModel: params.model,
  hasReferenceImages: hasReferenceImages, // ✅ NEW
  referenceImagesCount: params.referenceImages?.length || 0, // ✅ NEW
  // ...
});
```

---

## REQUEST FLOW

### Example: Veo 3.1 Fast with 2 Reference Images

**1. UI sends:**
```json
{
  "model": "veo-3.1-fast",
  "referenceImages": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  ],
  "prompt": "A person walks carrying a vase"
}
```

**2. route.ts processes:**
```typescript
// Keep as Base64, limit to 2
referenceImageBase64s = referenceImages.slice(0, 2);

// Pass to LaoZhang client
videoClient.generateVideo({
  model: "veo-3.1-fast",
  referenceImages: referenceImageBase64s,
  prompt: "..."
});
```

**3. laozhang-client.ts transforms:**
```typescript
// Add -fl suffix
finalModel = "veo-3.1-fl-fast";

// Build messages array
messageContent = [
  { type: "text", text: "A person walks carrying a vase" },
  { type: "image_url", image_url: { url: "data:image/jpeg;base64,..." } },
  { type: "image_url", image_url: { url: "data:image/jpeg;base64,..." } }
];
```

**4. HTTP request to LaoZhang:**
```json
POST https://api.laozhang.ai/v1/chat/completions
{
  "model": "veo-3.1-fl-fast",
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text", "text": "A person walks carrying a vase" },
      { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." } },
      { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." } }
    ]
  }]
}
```

**5. LaoZhang responds:**
```json
{
  "id": "chatcmpl-...",
  "model": "veo-3.1-fl-fast",
  "created": 1738012345,
  "choices": [{
    "message": {
      "content": "[download video](https://api.laozhang.ai/video/...)"
    }
  }]
}
```

---

## EXPECTED LOGS

### route.ts
```
[API] Veo reference images: {
  total: 3,
  using: 2,
  format: 'base64 data URLs',
  limited: true
}

[API] 🔍 PROVIDER PAYLOAD AUDIT: {
  model: 'veo-3.1-fast',
  provider: 'laozhang',
  hasReferenceImages: true,
  referenceImagesCount: 2,
  referenceImagesFormat: 'base64 data URLs',
  referenceImageSample: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  ...
}

[API] Video generation request to LaoZhang: {
  provider: 'laozhang',
  model: 'veo-3.1-fast',
  hasReferenceImages: true,
  referenceImagesCount: 2,
  referenceImagesFormat: 'base64 data URLs',
  ...
}
```

### laozhang-client.ts
```
[Video API] Using -fl model for reference images: {
  original: 'veo-3.1-fast',
  final: 'veo-3.1-fl-fast',
  referenceCount: 2
}

[Video API] Using ref2v mode with reference images: {
  referenceCount: 2,
  format: 'base64 data URLs'
}

[Video API] Request to LaoZhang: {
  model: 'veo-3.1-fl-fast',
  originalModel: 'veo-3.1-fast',
  hasReferenceImages: true,
  referenceImagesCount: 2,
  ...
}
```

---

## VALIDATION CHECKLIST

### Pre-Request Validation
- [x] Reference images are Base64 data URLs (start with `data:image/`)
- [x] Limited to 2 images maximum
- [x] Model gets `-fl` suffix when hasReferenceImages
- [x] Content array includes text + image_url objects

### Runtime Validation (Dev Console)
```javascript
// Check request payload
console.log(requestBody);
// Should see:
// - model: "veo-3.1-fl-fast" (with -fl)
// - messages[0].content[0].type: "text"
// - messages[0].content[1].type: "image_url"
// - messages[0].content[1].image_url.url: "data:image/jpeg;base64,..."
```

### Expected Behavior
1. ✅ UI uploads 2-3 reference images
2. ✅ route.ts limits to 2, keeps as Base64
3. ✅ laozhang-client adds `-fl` suffix
4. ✅ Builds messages/content array
5. ✅ LaoZhang API receives correct format
6. ✅ Video generation uses reference images
7. ✅ Output video reflects reference style/assets

### Not Expected
- ❌ Storage upload for reference images
- ❌ HTTP URLs in referenceImages
- ❌ Model without `-fl` suffix (when refs present)
- ❌ More than 2 reference images sent

---

## MIME TYPES SUPPORTED

```typescript
✅ "data:image/jpeg;base64,..."
✅ "data:image/png;base64,..."
❌ "data:image/heic;base64,..." // Not supported by Veo
❌ "https://..." // Not Base64 data URL
```

**Note:** HEIC/HEIF images are already converted to JPEG in route.ts (lines 623-627)

---

## REFERENCE TYPE (optional)

In official Vertex AI API, there's a `referenceType` parameter:
- `"asset"` - for characters, objects (up to 3 images)
- `"style"` - for style transfer (only 1 image)

**Our Implementation:**
- Currently NOT sending `referenceType`
- LaoZhang OpenAI-compatible API may not support it
- If needed, can add as query param or in request body

---

## BUILD STATUS

✅ **BUILD SUCCESSFUL**
```bash
npm run build
# ✓ Compiled successfully
# ✓ TypeScript passed
# ✓ All routes generated
```

**No errors, no warnings related to reference images.**

---

## TESTING PLAN

### Test 1: Veo with 2 Reference Images
1. Select `veo-3.1-fast`
2. Upload 2 reference images (JPEG/PNG)
3. Enter prompt
4. Generate
5. Check logs:
   - `using: 2`
   - `format: 'base64 data URLs'`
   - `final: 'veo-3.1-fl-fast'`
6. Verify video reflects reference images

### Test 2: Veo with 3 Reference Images (Limit Test)
1. Select `veo-3.1-fast`
2. Upload 3 reference images
3. Generate
4. Check logs:
   - `total: 3`
   - `using: 2`
   - `limited: true`
5. Verify only 2 images sent

### Test 3: Veo without Reference Images
1. Select `veo-3.1-fast`
2. No reference images
3. Generate
4. Check logs:
   - `hasReferenceImages: false`
   - Model: `veo-3.1-fast` (no `-fl` suffix)

### Test 4: Sora (Non-Veo Model)
1. Select `sora-2`
2. Upload reference images (if UI allows)
3. Generate
4. Check logs:
   - No `-fl` suffix added
   - May not use referenceImages (depends on Sora support)

---

## ROLLBACK PLAN

If reference images still don't work:

1. **Check LaoZhang API docs** for correct endpoint/format
2. **Enable detailed request logging:**
   ```typescript
   console.log('[Video API] Full request body:', JSON.stringify(body, null, 2));
   ```
3. **Test with Postman/curl** directly to LaoZhang API
4. **Contact LaoZhang support** with:
   - Model ID used
   - Request payload
   - Error response

**Fallback Option:**
- Revert to GenAIPro if LaoZhang doesn't support Veo ref2v
- Or use Veo without reference images (t2v/i2v only)

---

## SUMMARY

**Migration:** Veo reference images: Storage URLs → Base64 data URLs
**Status:** ✅ Build successful, ready for testing
**Key Fix:** Auto-add `-fl` suffix + keep Base64 format
**Limit:** 2 reference images (recommended)

**Files Modified:**
- `src/app/api/generate/video/route.ts` - removed storage upload
- `src/lib/api/laozhang-client.ts` - added -fl suffix + messages/content

**See also:**
- `GENAIPRO_REMOVED_LAOZHANG_ONLY.md` - Provider migration
- `PROVIDER_LEVEL_FIXES_COMPLETE.md` - Full audit report
