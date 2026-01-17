# 🤖 Models Directory - Modular Model System

## Overview

This directory contains the new modular architecture for AI models. Instead of one giant 890-line `models.ts` file, each model is now in its own folder with ~50-100 lines of code.

## Benefits ✅

- **Easy to add new models** - Create a folder, add 2 files, done!
- **Safe to modify** - Changing one model doesn't affect others
- **Easy to delete** - Just remove the folder
- **Automatic registration** - No manual array management
- **Type-safe** - Full TypeScript support
- **Reusable** - Share settings between models

## Structure

```
src/models/
├── types.ts              # Common types (PhotoModelConfig, VideoModelConfig)
├── registry.ts           # Central registry with auto-registration
├── index.ts              # Main entry point
│
├── photo/                # Photo models
│   ├── index.ts          # Auto-imports all photo models
│   ├── nano-banana/
│   │   ├── config.ts     # Model configuration
│   │   └── index.ts      # Auto-registration
│   ├── grok-imagine/
│   │   ├── config.ts
│   │   └── index.ts
│   └── ...
│
├── video/                # Video models
│   ├── index.ts          # Auto-imports all video models
│   ├── grok-video/
│   │   ├── config.ts
│   │   └── index.ts
│   ├── veo-3.1/
│   │   ├── config.ts
│   │   └── index.ts
│   └── ...
│
└── tools/                # Tool models (upscale, remove-bg, etc.)
    └── (future)
```

## How to Add a New Model

### Step 1: Create folder

```bash
mkdir -p src/models/photo/midjourney
# or
mkdir -p src/models/video/sora
```

### Step 2: Create `config.ts`

```typescript
// src/models/photo/midjourney/config.ts
import type { PhotoModelConfig } from '@/models/types';

export const midjourneyConfig: PhotoModelConfig = {
  id: 'midjourney-v7',
  name: 'Midjourney V7',
  apiId: 'midjourney',
  type: 'photo',
  provider: 'kie_market',
  description: 'Best for artistic and stylized images',
  shortDescription: 'Artistic images with unique style',
  rank: 1,
  featured: true,
  speed: 'medium',
  quality: 'ultra',
  supportsI2i: true,
  pricing: {
    fast: 14,
    turbo: 27,
  },
  qualityOptions: ['fast', 'turbo'],
  aspectRatios: ['1:1', '16:9', '9:16'],
  shortLabel: 'V7 • Art',
};
```

### Step 3: Create `index.ts`

```typescript
// src/models/photo/midjourney/index.ts
import { registerPhotoModel } from '@/models/registry';
import { midjourneyConfig } from './config';

// Auto-register on import
registerPhotoModel(midjourneyConfig);

// Export for direct access
export { midjourneyConfig };
export default midjourneyConfig;
```

### Step 4: Add to category index

```typescript
// src/models/photo/index.ts
export * from './nano-banana';
export * from './grok-imagine';
export * from './midjourney'; // ← Add this line
```

### Step 5: Done! 🎉

The model is now automatically:
- ✅ Registered in the global registry
- ✅ Available via `getAllPhotoModels()`
- ✅ Available via `getModelById('midjourney-v7')`
- ✅ Shown in the UI

## Usage Examples

### Get all models

```typescript
import { getAllPhotoModels, getAllVideoModels } from '@/models';

const photoModels = getAllPhotoModels(); // Sorted by rank
const videoModels = getAllVideoModels();
```

### Get specific model

```typescript
import { getModelById } from '@/models';

const model = getModelById('nano-banana');
if (model) {
  console.log(model.name, model.pricing);
}
```

### Get featured models

```typescript
import { getFeaturedPhotoModels } from '@/models';

const featured = getFeaturedPhotoModels();
```

### Direct access

```typescript
import { nanoBananaConfig } from '@/models/photo/nano-banana';

console.log(nanoBananaConfig.pricing);
```

### Check registry stats

```typescript
import { getRegistryStats } from '@/models';

const stats = getRegistryStats();
// {
//   totalModels: 4,
//   photoModels: 2,
//   videoModels: 2,
//   featuredPhoto: 2,
//   featuredVideo: 2
// }
```

## Migration Status

### Migrated ✅
- ✅ Nano Banana (photo)
- ✅ Grok Imagine (photo)
- ✅ Grok Video (video)
- ✅ Veo 3.1 (video)

### To Migrate 📋
- ⏳ Nano Banana Pro
- ⏳ Seedream 4.5
- ⏳ FLUX 1.1 Pro
- ⏳ GPT Image 1.5
- ⏳ Topaz 8K
- ⏳ Kling 2.5/2.6
- ⏳ Sora
- ⏳ WAN 2.5/2.6
- ⏳ All other models from `src/config/models.ts`

## Best Practices

1. **Keep configs small** - Each config.ts should be 50-150 lines max
2. **Use descriptive IDs** - `'midjourney-v7'` not just `'mj'`
3. **Add descriptions** - Both short (60 chars) and full descriptions
4. **Set proper rank** - Lower number = higher priority in lists
5. **Mark featured** - Only best/popular models should be featured
6. **Accurate pricing** - Always check with current API pricing
7. **Document special features** - Add comments for complex settings

## Testing

After adding a model, test it:

```typescript
import { getModelById, getAllPhotoModels } from '@/models';

// Check model exists
const model = getModelById('your-model-id');
console.assert(model !== undefined, 'Model not found!');

// Check it appears in lists
const all = getAllPhotoModels();
console.assert(
  all.some((m) => m.id === 'your-model-id'),
  'Model not in list!'
);

// Check pricing is correct
console.log('Pricing:', model?.pricing);
```

## Compatibility with Old Code

The old `PHOTO_MODELS` and `VIDEO_MODELS` arrays from `src/config/models.ts` can be replaced with:

```typescript
// OLD:
import { PHOTO_MODELS, VIDEO_MODELS } from '@/config/models';

// NEW:
import { getAllPhotoModels, getAllVideoModels } from '@/models';

const PHOTO_MODELS = getAllPhotoModels();
const VIDEO_MODELS = getAllVideoModels();
```

This maintains backward compatibility while using the new modular system.

## Future Plans

- 🔄 Migrate all remaining models from `src/config/models.ts`
- 🛠️ Add tools category (upscale, remove-bg, etc.)
- 🎨 Extract KIE API settings to model-specific files
- 📊 Add model performance tracking
- 🧪 Add automated testing for all models

---

**Questions?** See [ARCHITECTURE_REFACTOR_PLAN.md](../../../ARCHITECTURE_REFACTOR_PLAN.md) or [PROJECT_STRUCTURE.md](../../../PROJECT_STRUCTURE.md)
