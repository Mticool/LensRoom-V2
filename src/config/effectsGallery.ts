// ===== EFFECTS GALLERY PRESETS =====
// Config for homepage gallery - each preset routes to /create with params

export type TileRatio = '9:16' | '1:1' | '16:9';
export type ContentType = 'photo' | 'video';
export type EffectMode = 't2v' | 'i2v' | 'start_end' | 'storyboard' | 't2i' | 'i2i';

export interface EffectPreset {
  presetId: string;
  title: string;
  contentType: ContentType;
  modelKey: string;
  tileRatio: TileRatio;
  costStars: number;
  mode: EffectMode;
  variantId: string;
  previewImage: string;
  templatePrompt: string;
  featured?: boolean;
}

// Filter chip definitions
export type FilterChipId = 
  | 'all' 
  | 'photo' 
  | 'video' 
  | 'nano-banana-pro' 
  | 'veo-3.1' 
  | 'kling-2.6' 
  | 'sora-2-pro' 
  | 'seedance-pro';

export interface FilterChip {
  id: FilterChipId;
  label: string;
  type: 'content' | 'model' | 'all';
  modelKey?: string;
}

export const FILTER_CHIPS: FilterChip[] = [
  { id: 'all', label: 'Все', type: 'all' },
  { id: 'photo', label: 'Фото', type: 'content' },
  { id: 'video', label: 'Видео', type: 'content' },
  { id: 'nano-banana-pro', label: 'Nano Banana Pro', type: 'model', modelKey: 'nano-banana-pro' },
  { id: 'veo-3.1', label: 'Veo 3.1', type: 'model', modelKey: 'veo-3.1' },
  { id: 'kling-2.6', label: 'Kling 2.6', type: 'model', modelKey: 'kling-2.6' },
  { id: 'sora-2-pro', label: 'Sora Pro', type: 'model', modelKey: 'sora-2-pro' },
  { id: 'seedance-pro', label: 'Seedance', type: 'model', modelKey: 'seedance-pro' },
];

// 20 Effect Presets with controlled tile ratios for masonry
// Pattern: 9:16, 1:1, 16:9, 1:1 repeating for balanced grid
export const EFFECT_PRESETS: EffectPreset[] = [
  // === Row 1: 9:16, 1:1, 16:9 ===
  {
    presetId: 'smoke-transition',
    title: 'SMOKE TRANSITION',
    contentType: 'video',
    modelKey: 'veo-3.1',
    mode: 'start_end',
    costStars: 80,
    tileRatio: '9:16',
    variantId: 'veo-3.1-default',
    previewImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&h=1067&fit=crop',
    templatePrompt: 'Cinematic smoke transition, particles dissolving and reforming, ethereal atmosphere, 4K quality',
    featured: true,
  },
  {
    presetId: 'cotton-cloud',
    title: 'COTTON CLOUD',
    contentType: 'video',
    modelKey: 'kling-2.6',
    mode: 'i2v',
    costStars: 55,
    tileRatio: '1:1',
    variantId: 'kling-2.6-default',
    previewImage: 'https://images.unsplash.com/photo-1517483000871-1dbf64a6e1c6?w=600&h=600&fit=crop',
    templatePrompt: 'Person surrounded by soft cotton-like clouds, dreamy atmosphere, gentle movement, ethereal beauty',
    featured: true,
  },
  {
    presetId: 'earth-zoom',
    title: 'EARTH ZOOM OUT',
    contentType: 'video',
    modelKey: 'sora-2-pro',
    mode: 't2v',
    costStars: 150,
    tileRatio: '16:9',
    variantId: 'sora-2-pro-default',
    previewImage: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1067&h=600&fit=crop',
    templatePrompt: 'Seamless zoom out from street level to Earth orbit, continuous camera movement, photorealistic, cinematic',
    featured: true,
  },

  // === Row 2: 1:1, 9:16, 1:1 ===
  {
    presetId: 'luxury-reveal',
    title: 'LUXURY REVEAL',
    contentType: 'video',
    modelKey: 'veo-3.1',
    mode: 'i2v',
    costStars: 80,
    tileRatio: '1:1',
    variantId: 'veo-3.1-default',
    previewImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop',
    templatePrompt: 'Luxury product reveal with dramatic lighting, slow rotation, premium feel, commercial quality',
    featured: true,
  },
  {
    presetId: 'animalization',
    title: 'ANIMALIZATION',
    contentType: 'video',
    modelKey: 'seedance-pro',
    mode: 'i2v',
    costStars: 30,
    tileRatio: '9:16',
    variantId: 'seedance-pro-default',
    previewImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=600&h=1067&fit=crop',
    templatePrompt: 'Human face morphing with animal features, seamless blend, artistic transformation, high detail',
  },
  {
    presetId: 'freezing',
    title: 'FREEZING',
    contentType: 'video',
    modelKey: 'kling-2.6',
    mode: 'i2v',
    costStars: 55,
    tileRatio: '1:1',
    variantId: 'kling-2.6-default',
    previewImage: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=600&h=600&fit=crop',
    templatePrompt: 'Ice crystals forming and spreading, frost effect, cold breath visible, dramatic lighting',
  },

  // === Row 3: 16:9, 1:1, 9:16 ===
  {
    presetId: 'shadow-smoke',
    title: 'SHADOW SMOKE',
    contentType: 'video',
    modelKey: 'sora-2-pro',
    mode: 't2v',
    costStars: 150,
    tileRatio: '16:9',
    variantId: 'sora-2-pro-default',
    previewImage: 'https://images.unsplash.com/photo-1504192010706-dd7f569ee2be?w=1067&h=600&fit=crop',
    templatePrompt: 'Mysterious figure emerging from shadows and smoke, film noir aesthetic, dramatic contrast, moody atmosphere',
    featured: true,
  },
  {
    presetId: 'splash-shot',
    title: 'SPLASH SHOT',
    contentType: 'video',
    modelKey: 'kling-2.6',
    mode: 't2v',
    costStars: 55,
    tileRatio: '1:1',
    variantId: 'kling-2.6-default',
    previewImage: 'https://images.unsplash.com/photo-1550411294-875e8b0bc820?w=600&h=600&fit=crop',
    templatePrompt: 'Product with dynamic water splash, frozen motion, high-speed photography style, crisp details',
  },
  {
    presetId: 'hug-video',
    title: 'HUG VIDEO',
    contentType: 'video',
    modelKey: 'kling-2.6',
    mode: 'i2v',
    costStars: 55,
    tileRatio: '9:16',
    variantId: 'kling-2.6-default',
    previewImage: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&h=1067&fit=crop',
    templatePrompt: 'Two people embracing, emotional moment, soft lighting, gentle camera movement, intimate atmosphere',
    featured: true,
  },

  // === Row 4: 1:1, 16:9, 1:1 ===
  {
    presetId: 'neon-glow',
    title: 'NEON GLOW',
    contentType: 'photo',
    modelKey: 'nano-banana-pro',
    mode: 't2i',
    costStars: 3,
    tileRatio: '1:1',
    variantId: 'nano-banana-pro-default',
    previewImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&h=600&fit=crop',
    templatePrompt: 'Portrait with vibrant neon lighting, cyberpunk aesthetic, sharp details, cinematic color grading',
  },
  {
    presetId: 'golden-hour',
    title: 'GOLDEN HOUR',
    contentType: 'video',
    modelKey: 'sora-2-pro',
    mode: 't2v',
    costStars: 150,
    tileRatio: '16:9',
    variantId: 'sora-2-pro-default',
    previewImage: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1067&h=600&fit=crop',
    templatePrompt: 'Cinematic golden hour landscape, sun rays through clouds, warm color palette, sweeping camera movement',
  },
  {
    presetId: 'giant-grab',
    title: 'GIANT GRAB',
    contentType: 'video',
    modelKey: 'veo-3.1',
    mode: 't2v',
    costStars: 80,
    tileRatio: '1:1',
    variantId: 'veo-3.1-default',
    previewImage: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=600&h=600&fit=crop',
    templatePrompt: 'Giant hand reaching down from clouds, dramatic scale, epic cinematic shot, VFX quality',
  },

  // === Row 5: 9:16, 1:1, 16:9 ===
  {
    presetId: 'portrait-pro',
    title: 'PORTRAIT PRO',
    contentType: 'photo',
    modelKey: 'nano-banana-pro',
    mode: 't2i',
    costStars: 3,
    tileRatio: '9:16',
    variantId: 'nano-banana-pro-default',
    previewImage: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=1067&fit=crop',
    templatePrompt: 'Professional portrait photography, studio lighting, elegant pose, magazine quality, sharp focus',
    featured: true,
  },
  {
    presetId: 'crystal-burst',
    title: 'CRYSTAL BURST',
    contentType: 'video',
    modelKey: 'seedance-pro',
    mode: 'i2v',
    costStars: 30,
    tileRatio: '1:1',
    variantId: 'seedance-pro-default',
    previewImage: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&h=600&fit=crop',
    templatePrompt: 'Crystals exploding and reforming, light refraction, magical transformation, slow motion',
  },
  {
    presetId: 'drone-flight',
    title: 'DRONE FLIGHT',
    contentType: 'video',
    modelKey: 'sora-2-pro',
    mode: 't2v',
    costStars: 150,
    tileRatio: '16:9',
    variantId: 'sora-2-pro-default',
    previewImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1067&h=600&fit=crop',
    templatePrompt: 'Epic drone shot flying over mountains, sunrise, cinematic camera movement, 4K aerial footage',
  },

  // === Row 6: 1:1, 9:16, 1:1 ===
  {
    presetId: 'product-glow',
    title: 'PRODUCT GLOW',
    contentType: 'photo',
    modelKey: 'nano-banana-pro',
    mode: 'i2i',
    costStars: 3,
    tileRatio: '1:1',
    variantId: 'nano-banana-pro-default',
    previewImage: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&h=600&fit=crop',
    templatePrompt: 'Luxury product photography with dramatic rim lighting, premium feel, clean background, commercial quality',
  },
  {
    presetId: 'fashion-walk',
    title: 'FASHION WALK',
    contentType: 'video',
    modelKey: 'kling-2.6',
    mode: 'i2v',
    costStars: 55,
    tileRatio: '9:16',
    variantId: 'kling-2.6-default',
    previewImage: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&h=1067&fit=crop',
    templatePrompt: 'Fashion model walking confidently, editorial style, dramatic lighting, slow motion movement',
  },
  {
    presetId: 'fire-dance',
    title: 'FIRE DANCE',
    contentType: 'video',
    modelKey: 'veo-3.1',
    mode: 'i2v',
    costStars: 80,
    tileRatio: '1:1',
    variantId: 'veo-3.1-default',
    previewImage: 'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=600&h=600&fit=crop',
    templatePrompt: 'Fire and flames dancing and swirling, mesmerizing patterns, dramatic orange glow, cinematic quality',
  },

  // === Row 7: 16:9, 1:1 ===
  {
    presetId: 'ocean-waves',
    title: 'OCEAN WAVES',
    contentType: 'video',
    modelKey: 'seedance-pro',
    mode: 't2v',
    costStars: 30,
    tileRatio: '16:9',
    variantId: 'seedance-pro-default',
    previewImage: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1067&h=600&fit=crop',
    templatePrompt: 'Powerful ocean waves crashing on rocks, dramatic slow motion, cinematic lighting, nature beauty',
  },
  {
    presetId: 'cyber-portrait',
    title: 'CYBER PORTRAIT',
    contentType: 'photo',
    modelKey: 'nano-banana-pro',
    mode: 't2i',
    costStars: 3,
    tileRatio: '1:1',
    variantId: 'nano-banana-pro-default',
    previewImage: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=600&h=600&fit=crop',
    templatePrompt: 'Cyberpunk portrait with holographic elements, futuristic style, neon accents, high detail',
  },
];

// Helper functions
export function getEffectsByFilter(filterId: FilterChipId): EffectPreset[] {
  if (filterId === 'all') {
    return EFFECT_PRESETS;
  }
  
  const chip = FILTER_CHIPS.find(c => c.id === filterId);
  if (!chip) return EFFECT_PRESETS;
  
  if (chip.type === 'content') {
    return EFFECT_PRESETS.filter(e => e.contentType === filterId);
  }
  
  if (chip.type === 'model' && chip.modelKey) {
    return EFFECT_PRESETS.filter(e => e.modelKey === chip.modelKey);
  }
  
  return EFFECT_PRESETS;
}

export function getFeaturedEffects(): EffectPreset[] {
  return EFFECT_PRESETS.filter(e => e.featured);
}

export function getEffectById(id: string): EffectPreset | undefined {
  return EFFECT_PRESETS.find(e => e.presetId === id);
}

// Build URL for preset navigation
export function buildPresetUrl(preset: EffectPreset): string {
  const isVideo = preset.contentType === 'video';
  const basePath = isVideo ? '/create/video' : '/create';
  
  const params = new URLSearchParams({
    preset: preset.presetId,
    model: preset.modelKey,
    mode: preset.mode,
  });
  
  return `${basePath}?${params.toString()}`;
}

// Get aspect ratio CSS class for tiles
export function getTileAspectClass(ratio: TileRatio): string {
  switch (ratio) {
    case '9:16': return 'aspect-[9/16]';
    case '1:1': return 'aspect-square';
    case '16:9': return 'aspect-video';
    default: return 'aspect-square';
  }
}

// Order presets for balanced masonry layout
// Interleaves ratios: 9:16, 1:1, 16:9, 1:1 pattern
export function getOrderedPresetsForMasonry(presets: EffectPreset[]): EffectPreset[] {
  const portrait = presets.filter(p => p.tileRatio === '9:16');
  const square = presets.filter(p => p.tileRatio === '1:1');
  const landscape = presets.filter(p => p.tileRatio === '16:9');
  
  const result: EffectPreset[] = [];
  const pattern: TileRatio[] = ['9:16', '1:1', '16:9', '1:1'];
  let patternIndex = 0;
  
  const pools: Record<TileRatio, EffectPreset[]> = {
    '9:16': [...portrait],
    '1:1': [...square],
    '16:9': [...landscape],
  };
  
  // Keep adding while we have items
  while (pools['9:16'].length > 0 || pools['1:1'].length > 0 || pools['16:9'].length > 0) {
    const targetRatio = pattern[patternIndex % pattern.length];
    
    if (pools[targetRatio].length > 0) {
      result.push(pools[targetRatio].shift()!);
    } else {
      // Find any available
      for (const ratio of ['1:1', '9:16', '16:9'] as TileRatio[]) {
        if (pools[ratio].length > 0) {
          result.push(pools[ratio].shift()!);
          break;
        }
      }
    }
    
    patternIndex++;
  }
  
  return result;
}

// Legacy exports for backward compatibility
export const EFFECTS_GALLERY = EFFECT_PRESETS;
export const EFFECT_CATEGORIES = ['Visual Effects', 'Portrait', 'Product', 'Cinematic', 'Trending'] as const;
export type EffectCategory = typeof EFFECT_CATEGORIES[number];


