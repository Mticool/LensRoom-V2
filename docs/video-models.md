# Video models — capabilities matrix

This document describes **video generation models** supported by LensRoom, with the exact set of parameters we expose in the generator UI.

Source of truth for runtime behavior:
- `src/config/models.ts` (`VIDEO_MODELS`)
- `src/app/api/generate/video/route.ts` (parameter mapping to providers)

## Standard models (current rollout)

| Model (id) | Provider | Modes in UI | Duration | Quality / Resolution | Aspect ratios | Audio | Notes / docs |
|---|---|---|---|---|---|---|---|
| `veo-3.1` | `laozhang` | T2V, I2V, Start+End | fixed **8s** | `fast` / `quality` | `16:9`, `9:16` | ✅ toggle | Uses LaoZhang Veo 3.1. |
| `kling` | `kie_market` | T2V, I2V | **5s / 10s** | Variant selector: `kling-2.5-turbo`, `kling-2.6`, `kling-2.1` | `1:1`, `16:9`, `9:16` | ✅ (only on 2.6) | KIE docs: `https://docs.kie.ai/market/kling/text-to-video` |
| `wan` | `kie_market` | T2V, I2V | **5s / 10s / 15s** (depends on variant) | **720p / 1080p** (+ `1080p_multi` on 2.6) | `16:9`, `9:16`, `1:1` | ✅ presets | KIE docs: `https://docs.kie.ai/market/wan/2-6-text-to-video` |
| `sora-2` | `laozhang` | T2V | **10s / 15s** | (no explicit quality) | `portrait`, `landscape` | (depends on provider) | LaoZhang Sora model. |
| `sora-2-pro` | `kie_market` | I2V | **10s / 15s** | `standard` / `high` | `portrait`, `landscape` | ❌ | KIE docs (Sora family): `https://docs.kie.ai/market` |
| `bytedance-pro` | `kie_market` | I2V | **5s / 10s** | **720p / 1080p** | `16:9`, `9:16` | ❌ | KIE docs: `https://docs.kie.ai/market/bytedance/v1-pro-image-to-video` |
| `grok-video` | `kie_market` | T2V, I2V | fixed **5s** | (no explicit quality) | `1:1`, `3:2`, `2:3` | ✅ toggle | xAI Grok Video. |
| `kling-o1` | `fal` | I2V, Start+End | **5s / 10s** | (provider-defined) | `auto`, `16:9`, `9:16`, `1:1`, `4:3`, `3:4` | ❌ | fal docs: `https://fal.ai/models/fal-ai/kling-video/o1/standard/image-to-video` |

## Excluded from this rollout

These models exist in config, but are intentionally not wired into the generator UI yet:
- `kling-motion-control` (needs reference video + duration from video)
- `sora-storyboard` (storyboard/shots UI)
- `kling-o1-edit` (video-to-video edit UX)
- `kling-ai-avatar` (avatar-specific UX)

