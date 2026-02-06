# Photo Generator Guide

This is the single source of truth for the photo generator (UI + API).

## What it does
- Provides photo generation and image tools (t2i, i2i, edit, upscale).
- Enforces model capabilities in UI and server validation.
- Stores all outputs and shows them in “Мои работы”.

## Core entry points
- UI (Studio): `src/components/generator-v2/StudioWorkspaces.tsx`
- UI (standalone generators):
  - `src/components/generator-v2/SeedreamGenerator.tsx`
  - `src/components/generator-v2/GPTImageGenerator.tsx`
  - `src/components/generator-v2/ZImageGenerator.tsx`
  - `src/components/generator-v2/GrokImagineGenerator.tsx`
  - `src/components/generator-v2/TopazUpscaleGenerator.tsx`
- Gallery: `src/components/generator-v2/ImageGalleryMasonry.tsx`
- API: `src/app/api/generate/photo/route.ts`

## Model capabilities (single source of truth)
- `src/lib/imageModels/capabilities.ts`
  - Allowed modes
  - Required inputs (prompt, reference image)
  - Allowed enums (aspect_ratio, quality, resolution, output_count)
  - Defaults per model

## Validation
- Zod validation: `src/lib/imageModels/validation.ts` (and/or schema in API route)
- Enforces:
  - valid mode per model
  - quality only for GPT Image 1.5
  - reference image required for i2i / edit / upscale

## Payload builder
- KIE payload builder: `src/lib/providers/kie/image.ts`
- API route calls builder and forwards only supported fields.

## Results & Library
- Store all output URLs in `result_urls`.
- “Мои работы”: `src/app/library/LibraryClient.tsx`
  - Multi-image runs show first + count; viewer can show all.

## UX rules (must keep)
- Gallery zoom anchored top-left (no centering when scale < 1).
- After generation: auto-scroll to newest results.
- “Скачать” must download reliably (fallback to direct URL).
- “Пересоздать” only fills fields, no auto-generation.

## Manual verification
1. Open `/create/studio?section=photo`.
2. Zoom gallery to 70% → image stays top-left.
3. Generate while scrolled at top → auto-scroll down.
4. Download from a card → file downloads.
5. Regenerate/Repeat → fields filled only.
6. Grok Imagine → multi-image output saved.
7. Topaz Upscale → requires input image, output saved.
