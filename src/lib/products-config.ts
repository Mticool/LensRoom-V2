export interface ProductTemplate {
  id: string;
  name: string;
  category: string;
  scene: string;
  prompt: string;
  negativePrompt: string;
  examples: string[];
  tags: string[];
}

export const PRODUCT_CATEGORIES = [
  'Одежда',
  'Обувь',
  'Аксессуары',
  'Электроника',
  'Косметика',
  'Продукты питания',
  'Мебель',
  'Детские товары',
  'Спорт',
  'Украшения',
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

export interface ProductScene {
  id: string;
  name: string;
  description: string;
  prompt: string;
  icon: string;
  popular?: boolean;
}

export const PRODUCT_SCENES: ProductScene[] = [
  {
    id: 'studio-white',
    name: 'Белая студия',
    description: 'Классический чистый фон',
    prompt: 'product photography, white studio background, professional lighting, high quality, clean, minimal',
    icon: '⚪',
    popular: true,
  },
  {
    id: 'studio-gradient',
    name: 'Градиентный фон',
    description: 'Современный градиент',
    prompt: 'product photography, gradient background, soft colors, professional lighting, studio shot',
    icon: '🎨',
    popular: true,
  },
  {
    id: 'lifestyle-home',
    name: 'Домашний интерьер',
    description: 'Уютная домашняя обстановка',
    prompt: 'lifestyle photography, modern home interior, natural lighting, cozy atmosphere, realistic',
    icon: '🏠',
    popular: true,
  },
  {
    id: 'lifestyle-outdoor',
    name: 'На улице',
    description: 'Естественная среда, природа',
    prompt: 'outdoor lifestyle photography, natural environment, daylight, authentic setting',
    icon: '🌳',
  },
  {
    id: 'lifestyle-office',
    name: 'Офис',
    description: 'Рабочая среда',
    prompt: 'office setting, modern workplace, professional environment, clean desk',
    icon: '💼',
  },
  {
    id: 'lifestyle-cafe',
    name: 'Кафе',
    description: 'Атмосфера кофейни',
    prompt: 'cafe setting, coffee shop atmosphere, warm lighting, cozy ambiance',
    icon: '☕',
  },
  {
    id: 'hands-holding',
    name: 'В руках',
    description: 'Человек держит продукт',
    prompt: 'hands holding product, natural pose, soft focus background, lifestyle shot',
    icon: '🤲',
  },
  {
    id: 'flat-lay',
    name: 'Flat Lay',
    description: 'Вид сверху с композицией',
    prompt: 'flat lay photography, top view, styled composition, product arrangement',
    icon: '📐',
  },
  {
    id: 'luxury',
    name: 'Премиум',
    description: 'Роскошная презентация',
    prompt: 'luxury product photography, premium materials, elegant lighting, high-end presentation',
    icon: '💎',
  },
  {
    id: 'nature',
    name: 'Природа',
    description: 'Натуральные материалы, эко',
    prompt: 'natural setting, organic materials, earth tones, eco-friendly aesthetic',
    icon: '🌿',
  },
];

export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  // ОДЕЖДА
  {
    id: 'clothing-white-bg',
    name: 'Одежда - Белый фон',
    category: 'Одежда',
    scene: 'studio-white',
    prompt: '{product} on white background, professional product photography, centered composition, sharp details, even lighting, no shadows, clean and minimal',
    negativePrompt: 'blurry, dark, shadows, wrinkled, dirty, model, person',
    examples: ['/examples/clothing-white-1.jpg', '/examples/clothing-white-2.jpg'],
    tags: ['WB', 'Ozon', 'Классика'],
  },
  {
    id: 'clothing-lifestyle',
    name: 'Одежда - Lifestyle',
    category: 'Одежда',
    scene: 'lifestyle-home',
    prompt: '{product} in modern interior, lifestyle shot, natural lighting, aesthetic composition, soft colors',
    negativePrompt: 'messy, cluttered, dark, unprofessional',
    examples: ['/examples/clothing-lifestyle-1.jpg'],
    tags: ['Instagram', 'Premium'],
  },
  {
    id: 'clothing-flatlay',
    name: 'Одежда - Flat Lay',
    category: 'Одежда',
    scene: 'flat-lay',
    prompt: '{product} flat lay, top view, styled composition with accessories, aesthetic arrangement, soft colors',
    negativePrompt: 'wrinkled, messy, poor composition',
    examples: ['/examples/clothing-flatlay-1.jpg'],
    tags: ['Instagram', 'Стильно'],
  },

  // ОБУВЬ
  {
    id: 'shoes-white-bg',
    name: 'Обувь - Белый фон',
    category: 'Обувь',
    scene: 'studio-white',
    prompt: '{product} shoes on white background, product photography, side angle, sharp details, professional lighting',
    negativePrompt: 'dirty, worn, scuffed, blurry',
    examples: ['/examples/shoes-white-1.jpg'],
    tags: ['WB', 'Ozon', 'Классика'],
  },
  {
    id: 'shoes-lifestyle',
    name: 'Обувь - Lifestyle',
    category: 'Обувь',
    scene: 'lifestyle-outdoor',
    prompt: '{product} shoes lifestyle photography, outdoor setting, natural light, urban environment, stylish',
    negativePrompt: 'dirty background, poor lighting, unfocused',
    examples: ['/examples/shoes-lifestyle-1.jpg'],
    tags: ['Lifestyle', 'Urban'],
  },

  // АКСЕССУАРЫ
  {
    id: 'accessories-studio',
    name: 'Аксессуары - Студия',
    category: 'Аксессуары',
    scene: 'studio-gradient',
    prompt: '{product} accessory photography, gradient background, elegant presentation, sharp details, professional lighting',
    negativePrompt: 'blurry, cheap looking, poor quality',
    examples: ['/examples/accessories-studio-1.jpg'],
    tags: ['Премиум', 'Студия'],
  },
  {
    id: 'accessories-flatlay',
    name: 'Аксессуары - Flat Lay',
    category: 'Аксессуары',
    scene: 'flat-lay',
    prompt: '{product} flat lay composition, top view, styled with complementary items, aesthetic arrangement',
    negativePrompt: 'messy, chaotic, poor styling',
    examples: ['/examples/accessories-flatlay-1.jpg'],
    tags: ['Instagram', 'Стильно'],
  },

  // ЭЛЕКТРОНИКА
  {
    id: 'electronics-gradient',
    name: 'Электроника - Градиент',
    category: 'Электроника',
    scene: 'studio-gradient',
    prompt: '{product} on gradient background, tech photography, professional lighting, sleek design, modern aesthetic, sharp focus',
    negativePrompt: 'scratched, damaged, old, dirty',
    examples: ['/examples/electronics-1.jpg'],
    tags: ['Современно', 'Tech'],
  },
  {
    id: 'electronics-hands',
    name: 'Электроника - В руках',
    category: 'Электроника',
    scene: 'hands-holding',
    prompt: 'hands holding {product}, lifestyle product photography, natural pose, blurred background, focus on device',
    negativePrompt: 'blurry product, awkward hands, poor lighting',
    examples: ['/examples/electronics-hands-1.jpg'],
    tags: ['Lifestyle', 'Instagram'],
  },
  {
    id: 'electronics-office',
    name: 'Электроника - Офис',
    category: 'Электроника',
    scene: 'lifestyle-office',
    prompt: '{product} on modern desk, office setting, professional environment, clean workspace, natural lighting',
    negativePrompt: 'cluttered, messy, unprofessional',
    examples: ['/examples/electronics-office-1.jpg'],
    tags: ['Бизнес', 'Офис'],
  },

  // КОСМЕТИКА
  {
    id: 'cosmetics-flatlay',
    name: 'Косметика - Flat Lay',
    category: 'Косметика',
    scene: 'flat-lay',
    prompt: '{product} flat lay photography, elegant composition, soft pastel colors, beauty products arrangement, top view, aesthetic styling',
    negativePrompt: 'messy, chaotic, poor composition',
    examples: ['/examples/cosmetics-flat-1.jpg'],
    tags: ['Instagram', 'Beauty'],
  },
  {
    id: 'cosmetics-luxury',
    name: 'Косметика - Премиум',
    category: 'Косметика',
    scene: 'luxury',
    prompt: '{product} luxury beauty photography, premium materials, elegant lighting, sophisticated presentation, marble surface',
    negativePrompt: 'cheap looking, poor quality, messy',
    examples: ['/examples/cosmetics-luxury-1.jpg'],
    tags: ['Premium', 'Люкс'],
  },
  {
    id: 'cosmetics-natural',
    name: 'Косметика - Натуральный',
    category: 'Косметика',
    scene: 'nature',
    prompt: '{product} natural beauty photography, organic aesthetic, botanical elements, soft natural lighting, eco-friendly',
    negativePrompt: 'artificial, synthetic, harsh lighting',
    examples: ['/examples/cosmetics-natural-1.jpg'],
    tags: ['Эко', 'Натуральное'],
  },

  // ПРОДУКТЫ ПИТАНИЯ
  {
    id: 'food-natural',
    name: 'Продукты - Натуральный',
    category: 'Продукты питания',
    scene: 'nature',
    prompt: '{product} food photography, natural ingredients, rustic wooden surface, soft natural lighting, fresh and appetizing',
    negativePrompt: 'artificial, processed, unappetizing',
    examples: ['/examples/food-natural-1.jpg'],
    tags: ['Эко', 'Натуральное'],
  },
  {
    id: 'food-studio',
    name: 'Продукты - Студия',
    category: 'Продукты питания',
    scene: 'studio-white',
    prompt: '{product} professional food photography, white background, clean presentation, appetizing, high quality',
    negativePrompt: 'messy, unappetizing, poor lighting',
    examples: ['/examples/food-studio-1.jpg'],
    tags: ['Каталог', 'Классика'],
  },
  {
    id: 'food-cafe',
    name: 'Продукты - Кафе',
    category: 'Продукты питания',
    scene: 'lifestyle-cafe',
    prompt: '{product} in cafe setting, cozy atmosphere, warm lighting, coffee shop aesthetic, lifestyle food photography',
    negativePrompt: 'cold, sterile, unappetizing',
    examples: ['/examples/food-cafe-1.jpg'],
    tags: ['Lifestyle', 'Кафе'],
  },

  // МЕБЕЛЬ
  {
    id: 'furniture-interior',
    name: 'Мебель - Интерьер',
    category: 'Мебель',
    scene: 'lifestyle-home',
    prompt: '{product} in modern interior, interior design photography, natural daylight, styled room, scandinavian aesthetic',
    negativePrompt: 'cluttered, dark, old-fashioned',
    examples: ['/examples/furniture-interior-1.jpg'],
    tags: ['Интерьер', 'Дизайн'],
  },
  {
    id: 'furniture-studio',
    name: 'Мебель - Студия',
    category: 'Мебель',
    scene: 'studio-white',
    prompt: '{product} furniture on white background, product photography, clean presentation, sharp details, professional lighting',
    negativePrompt: 'shadows, cluttered, dirty',
    examples: ['/examples/furniture-studio-1.jpg'],
    tags: ['Каталог', 'Классика'],
  },

  // ДЕТСКИЕ ТОВАРЫ
  {
    id: 'kids-playful',
    name: 'Детские - Игривый',
    category: 'Детские товары',
    scene: 'lifestyle-home',
    prompt: '{product} children product photography, playful setting, bright colors, soft lighting, safe and friendly atmosphere',
    negativePrompt: 'dark, scary, adult themes',
    examples: ['/examples/kids-playful-1.jpg'],
    tags: ['Детское', 'Яркое'],
  },
  {
    id: 'kids-studio',
    name: 'Детские - Студия',
    category: 'Детские товары',
    scene: 'studio-white',
    prompt: '{product} children product on white background, bright and cheerful, soft lighting, clean presentation',
    negativePrompt: 'dark, scary, harsh shadows',
    examples: ['/examples/kids-studio-1.jpg'],
    tags: ['Каталог', 'Классика'],
  },

  // СПОРТ
  {
    id: 'sport-action',
    name: 'Спорт - Активный',
    category: 'Спорт',
    scene: 'lifestyle-outdoor',
    prompt: '{product} sports photography, dynamic setting, outdoor environment, active lifestyle, energetic mood',
    negativePrompt: 'static, boring, indoor',
    examples: ['/examples/sport-action-1.jpg'],
    tags: ['Активный', 'Lifestyle'],
  },
  {
    id: 'sport-studio',
    name: 'Спорт - Студия',
    category: 'Спорт',
    scene: 'studio-gradient',
    prompt: '{product} sports equipment photography, gradient background, professional lighting, sleek presentation, dynamic angle',
    negativePrompt: 'dirty, worn, damaged',
    examples: ['/examples/sport-studio-1.jpg'],
    tags: ['Каталог', 'Tech'],
  },

  // УКРАШЕНИЯ
  {
    id: 'jewelry-luxury',
    name: 'Украшения - Премиум',
    category: 'Украшения',
    scene: 'luxury',
    prompt: '{product} luxury jewelry photography, elegant presentation, soft lighting, black or white background, sharp details, sparkle',
    negativePrompt: 'cheap, blurry, poor quality',
    examples: ['/examples/jewelry-luxury-1.jpg'],
    tags: ['Ювелирка', 'Премиум'],
  },
  {
    id: 'jewelry-lifestyle',
    name: 'Украшения - Lifestyle',
    category: 'Украшения',
    scene: 'hands-holding',
    prompt: '{product} jewelry on hands, elegant pose, soft lighting, lifestyle jewelry photography, subtle background',
    negativePrompt: 'awkward pose, poor lighting, distracting background',
    examples: ['/examples/jewelry-lifestyle-1.jpg'],
    tags: ['Instagram', 'Lifestyle'],
  },
];

// Utility functions
export function getTemplatesByCategory(category: string): ProductTemplate[] {
  return PRODUCT_TEMPLATES.filter(t => t.category === category);
}

export function getTemplateById(id: string): ProductTemplate | undefined {
  return PRODUCT_TEMPLATES.find(t => t.id === id);
}

export function getSceneById(id: string): ProductScene | undefined {
  return PRODUCT_SCENES.find(s => s.id === id);
}

export function getPopularScenes(): ProductScene[] {
  return PRODUCT_SCENES.filter(s => s.popular);
}

export function buildProductPrompt(template: ProductTemplate, productDescription: string): string {
  return template.prompt.replace('{product}', productDescription);
}

export function getTemplatesByTag(tag: string): ProductTemplate[] {
  return PRODUCT_TEMPLATES.filter(t => t.tags.includes(tag));
}

export function getAllTags(): string[] {
  const tags = new Set<string>();
  PRODUCT_TEMPLATES.forEach(t => t.tags.forEach(tag => tags.add(tag)));
  return Array.from(tags).sort();
}

