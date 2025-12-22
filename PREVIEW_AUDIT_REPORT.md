# Preview System Audit Report
**Date:** December 20, 2025  
**Project:** LensRoom V2 (Next.js + Supabase)  
**Objective:** Stabilize preview/poster system for photo/video generations

---

## Executive Summary

**Root Cause:** The preview system is fragmented across multiple approaches with no single source of truth. Videos lack server-side poster generation, and clients fallback to client-side poster extraction which is unreliable on mobile (Telegram WebView).

**Impact:** Missing previews in Library/Inspiration grids, poor mobile UX, inconsistent video thumbnails.

**Required Changes:** Consolidate to ONE server-side preview pipeline with proper storage paths (not expiring URLs).

---

## 1. Current Data Model

### `generations` Table Schema (from migration 019)
```sql
- id: uuid (PK)
- user_id: uuid (FK to auth.users)
- type: text ('photo' | 'video' | 'product')
- status: text ('pending' | 'queued' | 'generating' | 'success' | 'failed')
- model_id: text
- model_name: text
- prompt: text
- negative_prompt: text
- credits_used: int
- task_id: text (KIE task reference)
- asset_url: text (final result URL - PUBLIC via Supabase Storage)
- preview_url: text (for photos: same as asset_url; for videos: UNUSED/NULL)
- thumbnail_url: text (for photos: same as asset_url; for videos: UNUSED/NULL)
- result_urls: jsonb (legacy array of URLs)
- error: text
- is_favorite: boolean
- created_at: timestamptz
- updated_at: timestamptz
```

**Issues Found:**
1. ❌ `preview_url` and `thumbnail_url` store **full URLs** (not storage paths)
2. ❌ For videos: these fields are set to NULL or the video file itself (not an image poster)
3. ❌ No `preview_status` field to track generation state
4. ❌ No dedicated `poster_path` for videos

---

## 2. Storage Architecture

### Current Setup
- **Bucket:** `generations` (public read enabled via STORAGE_POLICIES.sql)
- **Upload Pattern:** `{userId}/{type}/{fileName}` 
  - Example: `uuid-123/video/gen-456_timestamp.mp4`
- **Access:** `supabase.storage.from('generations').getPublicUrl(path)` returns non-expiring public URL

**Good:** 
- ✅ Public bucket with proper RLS policies
- ✅ Storage paths are permanent

**Issues:**
- ❌ No dedicated `previews/` or `posters/` subdirectory structure
- ❌ URLs are stored in DB (should store paths only)

---

## 3. Current Preview Flow Analysis

### 3.1 Photo Generations (`sync-task.ts` line 243-299)
**Flow:**
1. KIE returns success with `resultJson` containing image URLs
2. `downloadAndStoreAsset()` downloads image and uploads to `{userId}/image/{fileName}.{ext}`
3. Sets `asset_url`, `preview_url`, `thumbnail_url` all to the SAME public URL (line 280-281)

**Issues:**
- ❌ Stores full URLs instead of paths
- ❌ No lightweight webp preview (just reuses full-resolution image)
- ❌ No preview optimization for mobile grids

### 3.2 Video Generations (`sync-task.ts` line 142-241)
**Flow:**
1. KIE returns video URL
2. `downloadAndStoreAsset()` downloads video and uploads to `{userId}/video/{fileName}.mp4`
3. Sets `asset_url` to video URL
4. **Sets `preview_url` and `thumbnail_url` to NULL** (line 195-196)

**Issues:**
- ❌ **No server-side poster generation**
- ❌ Relies entirely on client-side fallback (see below)

### 3.3 Client-Side Poster Fallback (`LibraryClient.tsx` line 193-294)
**Flow:**
1. Client detects video with no preview/thumbnail
2. `capturePoster()` creates `<video>` element, seeks to frame, draws to canvas
3. Stores poster as data URL in local state (`posters` object)
4. Poster is NOT persisted - regenerated on every page load

**Issues:**
- ❌ Unreliable on mobile browsers (CORS, codec support, memory limits)
- ❌ **Fails completely in Telegram WebView** (restricted video APIs)
- ❌ Not persisted (wasted CPU on every load)
- ❌ Blocks rendering until poster extracted

---

## 4. Code Paths Touching Previews

### 4.1 API Routes
| Route | Purpose | Preview Handling |
|-------|---------|------------------|
| `/api/generations` (GET) | Fetch user generations | Returns `asset_url`, `preview_url`, `thumbnail_url` as-is |
| `/api/generate/photo` | Create photo generation | Does NOT generate preview (relies on sync-task) |
| `/api/generate/video` | Create video generation | Does NOT generate poster |
| `/api/webhooks/kie` | KIE callback | Calls `syncKieTaskToDb` (see sync-task analysis above) |
| `/api/kie/sync-manual` | Manual sync trigger | Sets `preview_url`/`thumbnail_url` for photos only (line 76-77) |
| `/api/admin/video-preview` | **Admin-only poster gen** | Uses ffmpeg to extract poster (line 112-126) |

**Key Finding:** Admin panel already has ffmpeg-based poster generation (`/api/admin/video-preview/route.ts`), but it's NOT integrated into the main generation pipeline.

### 4.2 UI Components
| Component | Rendering Logic | Issues |
|-----------|----------------|---------|
| `LibraryClient.tsx` | Falls back to client poster extraction for videos | Unreliable on mobile |
| `InspirationGallery.tsx` | Uses `preview_url` or `thumbnail_url` from `inspiration_styles` table | Different schema, not relevant to user generations |
| Studio Preview | N/A (pre-generation preview) | No issue |

---

## 5. Why Previews Are Missing

### Root Causes Identified:

1. **Video Posters Never Generated Server-Side**
   - `sync-task.ts` explicitly sets `preview_url`/`thumbnail_url` to NULL for videos (line 195-196, 280-281 comment: "Keep preview/thumbnail null so client can generate poster")
   - Client-side poster extraction fails on Telegram WebView and mobile browsers

2. **Photo Previews Exist But Not Optimized**
   - Photos store full-resolution URL in `preview_url` (no webp conversion, no size optimization)
   - Causes slow loading on mobile grids

3. **Storage of URLs Instead of Paths**
   - DB stores full public URLs (e.g., `https://xxx.supabase.co/storage/v1/object/public/generations/...`)
   - Makes it impossible to regenerate URLs or switch storage backends

4. **No Status Tracking**
   - No way to know if preview is "processing", "ready", or "failed"
   - UI shows "Нет превью" even when preview is being generated

5. **No Retry/Fallback Mechanism**
   - If poster generation fails (ffmpeg timeout, CORS), generation is marked success but preview stays NULL forever

---

## 6. Duplicate/Redundant Logic

### Code to Remove/Consolidate:

1. **Client-side poster extraction** (`LibraryClient.tsx` line 193-294)
   - Should be removed after server-side poster generation is implemented
   - Can keep as optional fallback for very old generations without posters

2. **Admin video-preview endpoint** (`/api/admin/video-preview/route.ts`)
   - Currently isolated for admin gallery content
   - Should be refactored into shared preview generation utility

3. **Multiple URL getters** (`LibraryClient.tsx` line 50-61)
   - `getFirstUrl()` checks `asset_url`, `preview_url`, `thumbnail_url`, `result_urls`, `results`
   - Fragile and inconsistent - need single source of truth

4. **Gallery admin editor poster generation** (`gallery-editor.tsx` line 463-560)
   - Client-side webp/poster generation
   - Should use same server-side pipeline as user generations

---

## 7. Missing Dependencies

**For Server-Side Image Processing:**
- ❌ **`sharp`** (image optimization/webp conversion) - NOT in package.json
- ❌ **`fluent-ffmpeg`** or ffmpeg binary wrapper - NOT in package.json
- ✅ `ffmpeg` binary (system-level) - Already used in admin route (line 32-57 in video-preview)

**Required:**
- Add `sharp` for image preview generation
- Add `fluent-ffmpeg` or direct ffmpeg spawn wrapper for video poster extraction
- Ensure ffmpeg is available in production environment (Vercel requires custom setup)

---

## 8. Storage Policy Status

**Current Policies (STORAGE_POLICIES.sql):**
- ✅ Public read access for `generations` bucket
- ✅ Service role can upload/update/delete
- ✅ Authenticated users can upload to own folder

**Recommendations:**
- ✅ Keep public read for previews (no signed URLs needed)
- ⚠️ Consider separate `previews` bucket for better organization (optional)

---

## 9. Telegram WebView Compatibility

**Issues Found:**
1. Client-side video element APIs are restricted in Telegram WebView
2. Canvas `drawImage()` may fail due to CORS or security restrictions
3. Memory limits on mobile cause poster extraction to fail silently

**Solution:** Must generate posters server-side BEFORE returning success to client.

---

## 10. Build-Time Env Warnings

**Current Issue:** 
- ❌ `env.ts` reads env vars at import time (line 9 in env.ts: `env.required()` calls at top-level)
- Causes build failures if KIE_API_KEY not set during `next build`

**Solution:**
- Defer env reads until actual API integration is called
- Use `env.optional()` with runtime checks instead of import-time `env.required()`

---

## Recommendations Summary

### Phase 1: Data Model
1. Add migration: `preview_path`, `poster_path` (nullable text), `preview_status` enum
2. Migrate existing URLs to paths (strip Supabase URL prefix)
3. Keep legacy `preview_url`/`thumbnail_url` for backward compatibility (optional)

### Phase 2: Preview Generation
1. Install `sharp` and `fluent-ffmpeg`
2. Create `src/lib/previews/` module:
   - `generateImagePreview(sourceUrl, userId, generationId): Promise<{ path, url }>`
   - `generateVideoPoster(videoUrl, userId, generationId): Promise<{ path, url }>`
3. Integrate into `sync-task.ts` on generation success
4. Add timeout/retry/error handling (mark `preview_status=failed` on failure)

### Phase 3: UI Updates
1. Update `LibraryClient.tsx` to use `poster_path`/`preview_path`
2. Show placeholder + status ("Generating preview...") when `preview_status=processing`
3. Remove client-side poster extraction (or keep as fallback for legacy data)

### Phase 4: Cleanup
1. Remove duplicate preview logic
2. Consolidate admin preview generation with user generation pipeline
3. Add env validation wrapper to defer errors until runtime

---

## File Inventory

### Files to Modify:
- `supabase/migrations/025_preview_system.sql` (NEW - data model changes)
- `src/lib/previews/index.ts` (NEW - preview generation module)
- `src/lib/kie/sync-task.ts` (integrate preview generation)
- `src/app/library/LibraryClient.tsx` (use new preview fields)
- `src/app/api/webhooks/kie/route.ts` (no changes needed)
- `src/lib/env.ts` (defer required() calls)

### Files to Reference (Not Modify):
- `src/app/api/admin/video-preview/route.ts` (extract ffmpeg logic)
- `src/components/admin/gallery-editor.tsx` (extract webp logic)

### Files to Remove Logic From:
- `LibraryClient.tsx` - remove capturePoster client-side extraction (keep as fallback)

---

## Manual Test Checklist (After Implementation)

### Photo Generation:
1. Generate photo via Studio
2. Check Library grid - should show optimized webp preview (not full-res image)
3. Open modal - should show full-res result
4. Check DB: `preview_path` should be `{userId}/previews/{id}_preview.webp`

### Video Generation:
1. Generate video via Studio  
2. Check Library grid - should show poster image IMMEDIATELY (not video thumbnail)
3. Open modal - should play video with controls
4. Check DB: `poster_path` should be `{userId}/posters/{id}_poster.webp`

### Mobile (Telegram WebView):
1. Open Library in Telegram WebApp
2. All videos should show poster images (not black squares or "Нет превью")
3. No console errors related to canvas/video APIs

### Edge Cases:
1. Generate video that takes >60s - poster should still generate after success
2. Simulate ffmpeg timeout - should mark `preview_status=failed` but keep generation success
3. Check old generations (before migration) - should show fallback or "Generating preview..."

---

## Dependencies to Add

```json
{
  "dependencies": {
    "sharp": "^0.33.0",
    "fluent-ffmpeg": "^2.1.3"
  }
}
```

**Note:** Vercel Edge Runtime does NOT support ffmpeg. For video posters, either:
- Use Node.js runtime for preview generation endpoints
- Deploy poster generation as separate microservice
- Use Supabase Edge Functions with Deno + FFmpeg layer

---

## Estimated Effort

- **Migration:** 1 hour (SQL + testing)
- **Preview Generation Module:** 4-6 hours (sharp + ffmpeg integration, error handling)
- **Sync-Task Integration:** 2 hours (hook into success flow, idempotency)
- **UI Updates:** 2-3 hours (LibraryClient, Inspiration, placeholders)
- **Testing & Cleanup:** 2-3 hours
- **Total:** ~12-16 hours for full implementation

---

## Priority

**P0 (Critical):** Video poster generation - blocks mobile UX  
**P1 (High):** Photo preview optimization - slow loading on mobile  
**P2 (Medium):** Storage path migration - technical debt  
**P3 (Low):** Client TTL cache - nice to have

---

*End of Audit Report*


