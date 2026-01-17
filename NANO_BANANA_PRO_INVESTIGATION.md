# 🔍 Nano Banana Pro - Investigation Report

**Date**: 2026-01-17
**Status**: ⚠️ Requires Testing

---

## 🎯 Issue

nano-banana-pro uses `1k_2k` quality option with **1.5x multiplier**, producing potentially non-standard image sizes.

---

## 📐 Current Size Calculation

### Code Location
[src/lib/api/laozhang-client.ts:124-175](src/lib/api/laozhang-client.ts#L124-L175)

### Multipliers

```typescript
const multipliers: Record<string, number> = {
  "1k": 1,
  "1k_2k": 1.5, // ← POTENTIAL ISSUE
  "2k": 2,
  "4k": 4,
};
```

### Generated Sizes for 1k_2k

| Aspect Ratio | Size | Standard? |
|--------------|------|-----------|
| 1:1 | 1536x1536 | ✅ Yes |
| 16:9 | 1536x896 | ⚠️ No |
| 9:16 | 896x1536 | ⚠️ No |
| 4:3 | 1536x1152 | ⚠️ No |
| 3:4 | 1152x1536 | ⚠️ No |

---

## 📚 Google Gemini 3 Pro Documentation

According to official documentation ([Google AI Developers](https://ai.google.dev/gemini-api/docs/image-generation)):

### Supported Resolutions
- **1K**: 1024×1024
- **2K**: 2048×2048
- **4K**: 4096×4096

### Supported Aspect Ratios
"1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"

### Parameter Format
- Parameter name: `image_size`
- Values: **"1K", "2K", "4K"** (uppercase K required)
- **Lowercase parameters (e.g., 1k) will be rejected**

---

## 🤔 Discrepancy

### Current Implementation
- Sends `size: "1536x896"` (pixel dimensions as string)
- Uses lowercase values: "1k", "1k_2k", "2k", "4k"

### Expected by Gemini API
- Should send `image_size: "2K"` (resolution tier, uppercase K)
- Only accepts: "1K", "2K", "4K"

---

## ❓ Questions

1. **Does LaoZhang API (proxy) convert pixel sizes to resolution tiers?**
   - If yes: Current implementation may work
   - If no: Current implementation will fail

2. **Does LaoZhang API accept pixel dimensions (e.g., "1536x896")?**
   - Need to test with real API calls

3. **What is the purpose of 1k_2k tier?**
   - Pricing: 30⭐ (between 1K and 2K)
   - Quality: Between 1K (1024) and 2K (2048)
   - But Gemini only has 1K, 2K, 4K - no intermediate tiers

---

## 🧪 Testing Required

### Test 1: Verify LaoZhang API accepts pixel dimensions
```bash
curl -X POST https://api.laozhang.ai/v1/images/generations \
  -H "Authorization: Bearer $LAOZHANG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-3-pro-image-preview-2k",
    "prompt": "A beautiful sunset",
    "size": "1536x896"
  }'
```

### Test 2: Verify uppercase K requirement
```bash
# Test with uppercase (should work)
curl ... -d '{ ..., "image_size": "2K" }'

# Test with lowercase (should fail)
curl ... -d '{ ..., "image_size": "2k" }'
```

### Test 3: Test 1k_2k in production
- Generate image with nano-banana-pro + 1k_2k
- Check if generation succeeds
- Verify returned image size matches requested

---

## 💡 Possible Solutions

### Option 1: LaoZhang API handles conversion (no changes needed)
If LaoZhang API accepts pixel dimensions and converts internally, current code is fine.

### Option 2: Change 1k_2k multiplier to 2.0
```typescript
const multipliers: Record<string, number> = {
  "1k": 1,
  "1k_2k": 2.0, // ← Changed from 1.5 to 2.0 (same as 2K)
  "2k": 2,
  "4k": 4,
};
```

**Impact**: 1k_2k will produce same sizes as 2K (2048×2048 for 1:1)

### Option 3: Use Gemini API format directly
```typescript
// Instead of sending size: "1536x896"
// Send image_size: "2K"
function resolutionToGeminiTier(resolution: string): string {
  const mapping = {
    "1k": "1K",
    "1k_2k": "2K", // Map to 2K tier
    "2k": "2K",
    "4k": "4K",
  };
  return mapping[resolution.toLowerCase()] || "1K";
}
```

### Option 4: Remove 1k_2k tier entirely
- Only offer: 1K (30⭐) and 4K (40⭐)
- Simplifies pricing and avoids ambiguity

---

## 🔧 Recommended Action

1. **Test with real API** (Option 1)
   - Generate 1 image with 1k_2k + 16:9 aspect ratio
   - Check if API accepts "1536x896"
   - Verify returned image dimensions

2. **If test fails**:
   - Implement Option 3 (use Gemini tier format "1K"/"2K"/"4K")
   - Update `1k_2k` to map to "2K" tier

3. **Update pricing** if behavior changes
   - Currently: 1k_2k = 30⭐
   - If mapped to 2K: may need price adjustment

---

## 📊 Current Usage

Models using 1k_2k:
- [src/config/models.ts:217-237](src/config/models.ts#L217-L237) - nano-banana-pro config
- [src/config/pricing.ts:328-347](src/config/pricing.ts#L328-L347) - plan entitlements
- [src/config/productImageModes.ts:33](src/config/productImageModes.ts#L33) - premium mode

Impact: Medium - affects paid tier users using Nano Banana Pro

---

## ✅ Next Steps

- [ ] Test real API call with 1k_2k + non-square aspect ratio
- [ ] Verify LaoZhang API parameter format
- [ ] Check generated image actual dimensions
- [ ] Update implementation if needed
- [ ] Update documentation with findings

---

**Priority**: Medium (works for 1:1, needs verification for other ratios)
**Risk**: Low (pricing is correct, only size calculation might be off)

---

Sources:
- [Nano Banana image generation | Gemini API](https://ai.google.dev/gemini-api/docs/image-generation)
- [Gemini 3 Pro Image | Vertex AI](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-pro-image)
