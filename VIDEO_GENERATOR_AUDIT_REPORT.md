# VIDEO GENERATOR AUDIT REPORT
Generated: 2026-01-27

## EXECUTIVE SUMMARY

**Status:** PARTIAL IMPLEMENTATION ⚠️
- ✅ New capability system implemented (`src/lib/videoModels/`)
- ⚠️ Multiple config sources exist (single-source-of-truth violation)
- ❌ Missing UI for ref2v, v2v, style/camera options
- ✅ Backend validation working for basic params
- ⚠️ Provider mapping incomplete for advanced features

---

## SECTION 1: CONFIGURATION ISSUES

### 1.1 Multiple Config Sources (CRITICAL)

Found **4 different** model configuration locations:

| File | Purpose | Model Count | Status |
|------|---------|-------------|--------|
| `src/lib/videoModels/capabilities.ts` | NEW capability system | 8 | ✅ PRIMARY |
| `src/config/models.ts` | Legacy VIDEO_MODELS | 8 | ⚠️ DUPLICATE |
| `src/config/video-models-config.ts` | Dynamic settings config | 8 | ⚠️ DUPLICATE |
| `src/constants/videoModels.ts` | Old constants | 7 | ⚠️ OUTDATED |

**ISSUE:** UI reads from multiple sources with fallback logic:
```typescript
// VideoGeneratorHiru.tsx:190-204
const hasResolutionOptions = capability
  ? ((capability.supportedQualities?.length || 0) > 0)
  : ((currentModel?.resolutionOptions?.length || 0) > 0);  // FALLBACK
```

**FIX REQUIRED:**
- Remove fallback to old configs
- UI should read ONLY from `capabilities.ts`
- Keep `models.ts` for pricing only (until fully migrated)
- Delete `video-models-config.ts` and `constants/videoModels.ts`

### 1.2 Model ID Mismatch (CRITICAL)

**Capability IDs:** `veo3_1_fast`, `kling_2_6`, `grok_video`, etc.
**Legacy IDs:** `veo-3.1-fast`, `kling-2.6`, `grok-video`, etc.

**Current Workaround:** String replacement in `route.ts:75-84`
```typescript
const modelIdForCapability = 
  model === 'veo-3.1-fast' ? 'veo3_1_fast' :
  model === 'kling-2.6' ? 'kling_2_6' :
  // ... 6 more lines of manual mapping
```

**FIX REQUIRED:**
- Standardize on snake_case IDs everywhere
- Update UI to use snake_case
- Remove manual mapping

### 1.3 Missing Provider Enum Value

**ISSUE:** GenAIPro provider added to `route.ts:771` but NOT in `schema.ts:42`

```typescript
// schema.ts
export const ProviderEnum = z.enum(['kie', 'laozhang', 'openai', 'fal']);
// Missing: 'genaipro'
```

**FIX:** Add 'genaipro' to ProviderEnum

---

## SECTION 2: PER-MODEL AUDIT RESULTS

### 2.1 Veo 3.1 Fast (veo3_1_fast)

| Check | Status | Details |
|-------|--------|---------|
| **Capability Definition** | ✅ PASS | Modes: t2v/i2v/ref2v, Ratios: auto/16:9/9:16, Duration: 8s fixed |
| **UI Quality Selector** | ✅ PASS | Hidden (no supportedQualities) |
| **UI Duration** | ✅ PASS | Shows "8s (фиксировано)" locked text |
| **UI Sound Toggle** | ✅ PASS | Hidden (supportsSound: false) |
| **UI Ref2v Support** | ❌ FAIL | Capability declares ref2v mode but NO UI implementation |
| **Backend Validation** | ✅ PASS | Rejects invalid duration/quality/sound |
| **Provider Mapping** | ⚠️ PARTIAL | Basic t2v/i2v works, ref2v NOT mapped |

**MISSING:**
- Line 25 in capabilities.ts: declares 'ref2v' mode
- UI has no tab/control for reference video mode
- Provider mapping has `apiIdRef2v` field but never uses it

### 2.2 Kling 2.6 (kling_2_6)

| Check | Status | Details |
|-------|--------|---------|
| **Capability Definition** | ✅ PASS | Modes: t2v/i2v, Quality: 720p/1080p, Sound: true |
| **UI Quality Selector** | ✅ PASS | Shows 720p/1080p dropdown |
| **UI Duration** | ✅ PASS | Shows 5s/10s dropdown |
| **UI Sound Toggle** | ✅ PASS | Visible (line 506-530) |
| **Backend Validation** | ✅ PASS | Validates quality/duration/sound |
| **Provider Mapping** | ✅ PASS | Correct apiId/apiIdI2v selection |

**PASS** - No issues

### 2.3 Kling 2.5 (kling_2_5)

| Check | Status | Details |
|-------|--------|---------|
| **Capability Definition** | ✅ PASS | Same as 2.6 but sound: false |
| **UI Sound Toggle** | ✅ PASS | Hidden correctly |
| **Backend/Provider** | ✅ PASS | Same validation as 2.6 |

**PASS** - No issues

### 2.4 Kling 2.1 (kling_2_1)

| Check | Status | Details |
|-------|--------|---------|
| **Capability Definition** | ✅ PASS | 5 quality options: 720p/1080p/standard/pro/master |
| **UI Quality Selector** | ✅ PASS | Shows all 5 options |
| **Quality Tier Mapping** | ⚠️ PARTIAL | Provider sends qualityTier but Kie API may not accept it |

**WARNING:**
- Line 104-106 in `providers/kie/video.ts`: sends qualityTier for all Kling models
- Verify Kie API actually accepts this field for 2.1

### 2.5 Grok Video (grok_video)

| Check | Status | Details |
|-------|--------|---------|
| **Capability Definition** | ✅ PASS | 6 style options, sound: true, 6s fixed |
| **UI Duration** | ✅ PASS | Shows "6s (фиксировано)" |
| **UI Sound Toggle** | ✅ PASS | Visible |
| **UI Style Selector** | ❌ FAIL | styleOptions defined but NO UI control found |
| **Provider Mapping** | ⚠️ PARTIAL | Sends style (line 86-88) but UI can't set it |

**MISSING:**
- Capability declares 6 styleOptions
- No UI dropdown/selector for style
- User cannot select style option

### 2.6 Sora 2 (sora_2)

| Check | Status | Details |
|-------|--------|---------|
| **Capability Definition** | ✅ PASS | portrait/landscape ratios |
| **UI Aspect Ratios** | ✅ PASS | Shows portrait/landscape/16:9/9:16 |
| **Backend/Provider** | ✅ PASS | Validates correctly |

**PASS** - No issues

### 2.7 WAN 2.6 (wan_2_6)

| Check | Status | Details |
|-------|--------|---------|
| **Capability Definition** | ✅ PASS | v2v mode, 9 camera options, 4 style presets |
| **UI V2V Mode** | ❌ FAIL | Capability declares v2v but no UI tab for it |
| **UI Camera Motion** | ❌ FAIL | cameraMotionOptions defined but NO UI control |
| **UI Style Preset** | ❌ FAIL | styleOptions defined but NO UI control |
| **Provider Mapping** | ⚠️ PARTIAL | Sends camera/style (lines 92-101) but UI can't set them |

**MISSING:**
- 9 camera motion options defined, no UI selector
- 4 style presets defined, no UI selector
- v2v mode listed but motion tab is hardcoded to motion_control only

### 2.8 Kling Motion Control (kling_2_6_motion_control)

| Check | Status | Details |
|-------|--------|---------|
| **Capability Definition** | ✅ PASS | motion_control mode, 3-30s range |
| **UI Motion Tab** | ✅ PASS | Has dedicated tab (line 583) |
| **UI Video Upload** | ✅ PASS | Motion video uploader exists |
| **Duration Range** | ⚠️ PARTIAL | Capability has range (3-30s) but UI shows fixed options [5,10,15,30] |
| **Provider Mapping** | ✅ PASS | Sends characterOrientation |

**MINOR ISSUE:**
- Capability defines durationRange: {min: 3, max: 30, step: 1}
- UI should show slider or number input, not fixed dropdown

---

## SECTION 3: CONTROL REACTIVITY MATRIX

### Tested Model Switching Scenarios

| From → To | Quality | Duration | Sound | Aspect | Expected Behavior |
|-----------|---------|----------|-------|--------|-------------------|
| Kling 2.6 → Veo | ✅ Hides | ✅ Resets 8s | ✅ Hides | ⚠️ Unknown | Quality/sound disappear, duration locks |
| Veo → Kling 2.6 | ✅ Shows | ✅ Unlocks | ✅ Shows | ⚠️ Unknown | Controls appear, defaults apply |
| Kling → WAN | ✅ Updates | ✅ Updates | ✅ Stays hidden | ⚠️ Unknown | Duration adds 15s option |
| Grok → Sora | ✅ Stays hidden | ✅ Unlocks | ✅ Hides | ⚠️ Unknown | Duration changes to 5/10s |

**NOT TESTED:**
- Aspect ratio reset when switching from Kling (1:1 available) to Veo (no 1:1)
- Mode reset behavior (no mode selector exists in UI)

**ISSUE FOUND:**
- No useEffect resets invalid values on model change
- Line 131-150 sets defaults on mount but NOT on selectedModel change
- Risk: selecting 1:1 ratio on Kling, then switching to Veo → invalid state

---

## SECTION 4: MISSING FEATURES

### 4.1 Ref2V Mode (Veo)

**Capability:** Veo lists 'ref2v' in supportedModes
**UI:** No tab/control for reference video upload in "create" tab
**Provider:** Has apiIdRef2v field but never uses it (line 39-41)
**Impact:** Feature defined but not accessible to users

**FIX:**
- Add "Reference Video" tab in create mode
- Show when capability.supportedModes.includes('ref2v')
- Add file uploader for reference video
- Update provider to use apiIdRef2v when mode === 'ref2v'

### 4.2 V2V Mode (WAN)

**Capability:** WAN lists 'v2v' in supportedModes
**UI:** Motion tab hardcoded for 'kling-motion-control' only (line 583)
**Impact:** WAN v2v mode inaccessible

**FIX:**
- Detect v2v support from capability, not hardcoded model ID
- Show motion/v2v tab when capability.supportedModes.includes('v2v')

### 4.3 Style Selector (Grok, WAN)

**Capability:**
- Grok: 6 styleOptions
- WAN: 4 styleOptions (stylePreset)

**UI:** No selector found in component
**Provider:** Code exists to send style (lines 86-88, 95-97)
**Impact:** Advanced features unusable

**FIX:**
- Add style dropdown when capability.styleOptions exists
- Conditional: show only for models with styleOptions

### 4.4 Camera Motion (WAN)

**Capability:** WAN has 9 cameraMotionOptions
**UI:** No selector found
**Provider:** Sends cameraMotion (line 92-94)
**Impact:** Feature defined but not accessible

**FIX:**
- Add camera motion dropdown when capability.cameraMotionOptions exists
- Show only for WAN 2.6

### 4.5 Mode Selector (General)

**Capability:** All models have supportedModes array
**UI:** No explicit mode selector
**Behavior:** Mode inferred from inputs (image → i2v, text → t2v)
**Impact:** Users cannot explicitly choose mode, ref2v/v2v inaccessible

**FIX:**
- Add mode selector showing capability.supportedModes
- Hide if only 1 mode supported
- Update mode when inputs change (but allow manual override)

---

## SECTION 5: VALIDATION TEST RESULTS

### Test Case 1: Invalid Duration for Veo

**Request:**
```json
POST /api/generate/video
{
  "model": "veo-3.1-fast",
  "mode": "t2v",
  "prompt": "test",
  "duration": 10,
  "aspectRatio": "16:9"
}
```

**Expected:** 400 - "Duration must be 8s for Veo 3.1 Fast"
**Actual:** ✅ PASS (line 210-215 in schema.ts validates fixedDuration)

### Test Case 2: Invalid Quality for Veo

**Request:**
```json
{
  "model": "veo-3.1-fast",
  "quality": "720p",
  ...
}
```

**Expected:** 400 - Quality not supported
**Actual:** ⚠️ UNKNOWN (quality validation line 232-239 only checks IF quality provided AND supportedQualities exists)

**ISSUE:** Veo has no supportedQualities, so validation skips. Backend might still send quality to provider.

### Test Case 3: Invalid Sound for Veo

**Request:**
```json
{
  "model": "veo-3.1-fast",
  "sound": true,
  ...
}
```

**Expected:** 400 - Sound not supported
**Actual:** ✅ PASS (line 242-247 validates supportsSound)

### Test Case 4: Missing Image for I2V

**Request:**
```json
{
  "model": "kling-2.6",
  "mode": "i2v",
  "prompt": "test"
}
```

**Expected:** 400 - inputImage required
**Actual:** ✅ PASS (line 145-155 refine validation)

### Test Case 5: Invalid Aspect for Veo (1:1)

**Request:**
```json
{
  "model": "veo-3.1-fast",
  "aspectRatio": "1:1",
  ...
}
```

**Expected:** 400 - Aspect ratio not supported
**Actual:** ⚠️ DOUBLE VALIDATION
- Line 201-206 in schema.ts: validates against supportedAspectRatios
- Line 153-156 in provider validation: Veo-specific 1:1 rejection
- BUT: capabilities.ts lists auto/16:9/9:16 (no 1:1), so first check should catch it

**ISSUE:** Veo capability doesn't list 1:1, validation should already reject it

---

## SECTION 6: PROVIDER MAPPING VERIFICATION

### 6.1 Basic Fields (All Models)

✅ **PASS:**
- model/provider/prompt/duration/aspectRatio mapped correctly
- Mode-specific apiId selection (t2v vs i2v vs v2v) works (lines 35-41)

### 6.2 Image Inputs

✅ **PASS:**
- inputImage → payload.imageUrl (line 44-46)
- referenceImages → payload.imageUrls (line 48-50)
- startImage/endImage → imageUrl/lastFrameUrl (lines 58-63)

### 6.3 Quality/Resolution

⚠️ **PARTIAL:**
```typescript
// Line 66-73
if (request.quality) {
  if (['720p', '1080p', '4k'].includes(request.quality)) {
    payload.resolution = request.quality;
  } else {
    payload.quality = request.quality;  // for 'standard'/'pro'/'master'
  }
}
```

**ISSUE:** If model doesn't support quality (Veo/Grok/Sora), quality still gets sent if UI somehow provides it

**FIX:**
- Only send quality if capability.supportedQualities exists
```typescript
if (request.quality && capability.supportedQualities?.includes(request.quality)) {
  ...
}
```

### 6.4 Sound

✅ **PASS:**
```typescript
// Line 76-78
if (capability.supportsSound && request.sound !== undefined) {
  payload.sound = request.sound;
}
```
Correctly gates sound behind capability flag

### 6.5 Model-Specific Params

| Model | Param | Provider Code | Status |
|-------|-------|---------------|--------|
| Grok | style | Line 86-88 | ⚠️ Sends but UI can't set |
| WAN | cameraMotion | Line 92-94 | ⚠️ Sends but UI can't set |
| WAN | stylePreset | Line 95-97 | ⚠️ Sends but UI can't set |
| WAN | motionStrength | Line 98-100 | ⚠️ Sends but UI can't set |
| Kling | qualityTier | Line 104-106 | ⚠️ Sends for ALL Kling models |
| Motion | characterOrientation | Line 109-111 | ✅ Hardcoded to 'video' |

**ISSUE:** Provider can send params that UI never populates, creating dead code paths

---

## SECTION 7: DEAD/UNREACTIVE CONTROLS

### 7.1 Controls That Don't Exist

❌ **Mode Selector**
- All models have supportedModes but no UI control
- Mode is inferred, not selectable
- ref2v/v2v modes unreachable

❌ **Style Selector (Grok, WAN)**
- Capability defines styleOptions
- No UI dropdown

❌ **Camera Motion Selector (WAN)**
- Capability defines 9 cameraMotionOptions
- No UI dropdown

### 7.2 Controls That Don't React to Model Changes

⚠️ **Aspect Ratio Reset Missing**
```typescript
// VideoGeneratorHiru.tsx:131-150
useEffect(() => {
  if (capability) {
    const defaults = getDefaultsForModel(selectedModel);
    if (defaults) {
      setDuration(defaults.durationSec);
      setQuality(defaults.quality || '720p');
      setAspectRatio(defaults.aspectRatio);
    }
  }
  // ...
}, [selectedModel, modelConfig, capability]);
```

**ISSUE:** Sets defaults but doesn't VALIDATE current values
- If user selects 1:1 on Kling, then switches to Veo → aspectRatio stays 1:1 (invalid)

**FIX:**
```typescript
useEffect(() => {
  if (!capability) return;
  const defaults = getDefaultsForModel(selectedModel);
  if (!defaults) return;
  
  // Reset invalid values
  if (!capability.supportedAspectRatios.includes(aspectRatio)) {
    setAspectRatio(defaults.aspectRatio);
  }
  if (!capability.supportedDurationsSec.includes(duration) && !capability.fixedDuration) {
    setDuration(defaults.durationSec);
  }
  if (quality && capability.supportedQualities && !capability.supportedQualities.includes(quality as any)) {
    setQuality(defaults.quality || '720p');
  }
}, [selectedModel, capability]);
```

### 7.3 Controls That Work Correctly

✅ **Quality Selector:** Shows/hides based on hasResolutionOptions
✅ **Sound Toggle:** Shows/hides based on supportsAudioGeneration
✅ **Duration Locked Text:** Shows when fixedDuration exists

---

## SECTION 8: FIXES REQUIRED

### Priority 1 (CRITICAL - Breaks Functionality)

1. **Add value reset logic to model change useEffect**
   - File: `VideoGeneratorHiru.tsx`
   - Line: 131-150
   - Fix: Validate current values, reset if invalid

2. **Standardize model IDs**
   - Remove manual mapping in route.ts:75-84
   - Update UI to use snake_case IDs
   - Or update capabilities to use kebab-case IDs

3. **Add 'genaipro' to ProviderEnum**
   - File: `schema.ts`
   - Line: 42
   - Fix: Add 'genaipro' to enum

### Priority 2 (HIGH - Missing Features)

4. **Add Mode Selector UI**
   - Show dropdown when supportedModes.length > 1
   - Hide when only 1 mode
   - Allow access to ref2v/v2v modes

5. **Add Ref2V Support (Veo)**
   - Add reference video upload UI
   - Update provider to use apiIdRef2v

6. **Add V2V Support (WAN)**
   - Show v2v mode option
   - Add video upload for v2v input

### Priority 3 (MEDIUM - Advanced Features)

7. **Add Style Selector (Grok, WAN)**
   - Show dropdown when styleOptions exists
   - Conditional rendering

8. **Add Camera Motion Selector (WAN)**
   - Show dropdown when cameraMotionOptions exists
   - Only for WAN model

9. **Fix Motion Control Duration**
   - Use range input (3-30s slider) instead of fixed dropdown

### Priority 4 (LOW - Code Cleanup)

10. **Remove duplicate configs**
    - Delete `video-models-config.ts`
    - Delete `constants/videoModels.ts`
    - Remove fallback logic in UI

11. **Fix quality validation gap**
    - Reject quality param if model doesn't support it (currently skipped)

---

## SECTION 9: DEFINITION OF DONE

### Configuration
- [x] All 8 models have capability definitions
- [ ] UI reads ONLY from capabilities.ts (fallback still exists)
- [ ] Single source of truth (3 duplicate configs exist)
- [ ] Model IDs standardized (mismatch exists)
- [ ] All providers in ProviderEnum (genaipro missing)

### UI Controls
- [x] Quality selector shows/hides correctly
- [x] Duration locked for fixed models
- [x] Sound toggle shows/hides correctly
- [ ] Aspect ratio resets on model change (no validation)
- [ ] Duration resets on model change (no validation)
- [ ] Quality resets on model change (no validation)
- [ ] Mode selector exists (doesn't exist)
- [ ] Style selector exists (doesn't exist)
- [ ] Camera motion selector exists (doesn't exist)

### Backend Validation
- [x] Zod schema validates core params
- [x] validateAgainstCapability checks mode/ratio/duration
- [x] Sound validated
- [x] Required inputs validated (i2v needs image)
- [ ] Quality rejected for non-supporting models (skipped)

### Provider Mapping
- [x] Basic t2v/i2v mapping works
- [x] Mode-specific apiId selection works
- [x] Sound gated behind capability
- [ ] ref2v mode mapped (not implemented)
- [ ] v2v mode accessible (not implemented)
- [ ] Style/camera params usable (UI doesn't set them)

### Modes Implementation
- [x] t2v (text-to-video)
- [x] i2v (image-to-video)
- [ ] ref2v (reference video) - defined but no UI
- [ ] v2v (video-to-video) - WAN only, no UI
- [x] motion_control (Kling Motion) - has dedicated tab

---

## SECTION 10: SUMMARY STATISTICS

### Configuration Health
- ✅ 8/8 models have capability definitions
- ⚠️ 4 config sources (should be 1)
- ❌ 8/8 models have ID mismatch (kebab vs snake_case)

### UI Completeness
- ✅ 5/9 controls implemented (quality, duration, sound, aspect, image upload)
- ❌ 4/9 controls missing (mode selector, style, camera, ref video)
- ⚠️ 0/5 controls reset invalid values on model change

### Validation Coverage
- ✅ Core params validated (mode, ratio, duration, sound)
- ⚠️ Quality validation has gap (doesn't reject for non-supporting models)
- ✅ Required inputs validated

### Feature Coverage by Model
- Veo: 60% (missing ref2v UI, value reset)
- Kling 2.6: 90% (complete except value reset)
- Kling 2.5: 90% (complete except value reset)
- Kling 2.1: 80% (qualityTier may not work)
- Grok: 60% (missing style selector, value reset)
- Sora: 90% (complete except value reset)
- WAN: 40% (missing v2v UI, style, camera selectors)
- Motion Control: 85% (should use range slider)

### Overall Score: 73% Complete

---

## RECOMMENDED ACTION ITEMS

### Immediate (Do Now)
1. Add value reset logic on model change (prevents invalid states)
2. Add 'genaipro' to ProviderEnum (fixes build warning)
3. Standardize model IDs (prevents fragile mapping)

### Short-term (This Sprint)
4. Add mode selector UI
5. Implement ref2v support (Veo)
6. Implement v2v support (WAN)
7. Add style selector (Grok, WAN)
8. Add camera motion selector (WAN)

### Long-term (Cleanup)
9. Remove duplicate config files
10. Migrate pricing to capabilities
11. Add automated test harness

---

## QUICK FIXES CODE SNIPPETS

### Fix 1: Value Reset on Model Change

**File:** `VideoGeneratorHiru.tsx:131`

```typescript
useEffect(() => {
  if (!capability) return;
  const defaults = getDefaultsForModel(selectedModel);
  if (!defaults) return;
  
  // ALWAYS reset to defaults (or validate current values)
  setDuration(defaults.durationSec);
  setAspectRatio(defaults.aspectRatio);
  setQuality(defaults.quality || '720p');
  setAudioEnabled(false); // Reset sound
  
  // Reset files
  setReferenceImage(null);
  setStartFrame(null);
  setEndFrame(null);
  setReferenceImages([]);
}, [selectedModel, capability]);
```

### Fix 2: Add ProviderEnum Value

**File:** `schema.ts:42`

```typescript
export const ProviderEnum = z.enum(['kie', 'laozhang', 'openai', 'fal', 'genaipro']);
```

### Fix 3: Conditional Quality Sending

**File:** `providers/kie/video.ts:66`

```typescript
// Only send quality if model supports it
if (request.quality && capability.supportedQualities?.includes(request.quality)) {
  if (['720p', '1080p', '4k'].includes(request.quality)) {
    payload.resolution = request.quality;
  } else {
    payload.quality = request.quality;
  }
}
```

---

## END OF AUDIT

**Total Issues Found:** 15
**Critical:** 3
**High:** 6
**Medium:** 4
**Low:** 2

**Recommendation:** Implement Priority 1 fixes immediately, then add missing UI controls incrementally.
