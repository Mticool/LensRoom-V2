// ===== MOCK DATA FOR HOME V2 =====
// Stable public placeholders for testing visual layout

export type AspectRatio = '1:1' | '16:9' | '9:16' | '2:1';
export type ItemType = 'photo' | 'video' | 'tool';
export type Badge = 'NEW' | 'TOP' | 'FAST' | 'PRO';

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  desc: string;
  badge?: Badge;
  priceStars: number;
  aspect: AspectRatio;
  imageUrl: string;
}

// Stable picsum.photos URLs with specific IDs for consistency
const getImageUrl = (id: number, width: number, height: number) => 
  `https://picsum.photos/id/${id}/${width}/${height}`;

// ===== FEATURED ITEM (Hero) =====
export const featuredItem: Item = {
  id: 'featured-1',
  type: 'photo',
  title: 'Cinematic Portrait Pro',
  desc: 'Professional studio lighting with dramatic shadows and premium quality',
  badge: 'TOP',
  priceStars: 8,
  aspect: '2:1',
  imageUrl: getImageUrl(1, 1200, 600),
};

export const heroSideItems: Item[] = [
  {
    id: 'hero-2',
    type: 'video',
    title: 'AI Video Magic',
    desc: 'Transform ideas into stunning videos',
    badge: 'NEW',
    priceStars: 12,
    aspect: '1:1',
    imageUrl: getImageUrl(2, 600, 600),
  },
  {
    id: 'hero-3',
    type: 'photo',
    title: 'Product Shot',
    desc: 'Clean minimalist product photography',
    priceStars: 6,
    aspect: '1:1',
    imageUrl: getImageUrl(3, 600, 600),
  },
];

// ===== NEW & TRENDING =====
export const trendingItems: Item[] = [
  {
    id: 'trend-1',
    type: 'video',
    title: 'Neon Cyberpunk City',
    desc: 'Futuristic urban landscapes with neon glow',
    badge: 'NEW',
    priceStars: 10,
    aspect: '16:9',
    imageUrl: getImageUrl(10, 800, 450),
  },
  {
    id: 'trend-2',
    type: 'photo',
    title: 'Fashion Editorial',
    desc: 'High-end magazine style photography',
    badge: 'TOP',
    priceStars: 8,
    aspect: '9:16',
    imageUrl: getImageUrl(11, 450, 800),
  },
  {
    id: 'trend-3',
    type: 'video',
    title: 'Nature Documentary',
    desc: 'Breathtaking wildlife cinematography',
    badge: 'FAST',
    priceStars: 12,
    aspect: '16:9',
    imageUrl: getImageUrl(12, 800, 450),
  },
  {
    id: 'trend-4',
    type: 'photo',
    title: 'Minimalist Interior',
    desc: 'Clean modern architecture shots',
    priceStars: 6,
    aspect: '1:1',
    imageUrl: getImageUrl(13, 600, 600),
  },
  {
    id: 'trend-5',
    type: 'video',
    title: 'Abstract Motion',
    desc: 'Mesmerizing liquid animations',
    badge: 'NEW',
    priceStars: 10,
    aspect: '16:9',
    imageUrl: getImageUrl(14, 800, 450),
  },
  {
    id: 'trend-6',
    type: 'photo',
    title: 'Food Photography',
    desc: 'Appetizing culinary visuals',
    priceStars: 6,
    aspect: '1:1',
    imageUrl: getImageUrl(15, 600, 600),
  },
];

// ===== PHOTO GRID (Mix of 1:1 and 9:16) =====
export const photoItems: Item[] = [
  {
    id: 'photo-1',
    type: 'photo',
    title: 'Portrait Studio',
    desc: 'Professional headshots',
    badge: 'TOP',
    priceStars: 8,
    aspect: '9:16',
    imageUrl: getImageUrl(20, 450, 800),
  },
  {
    id: 'photo-2',
    type: 'photo',
    title: 'Landscape Vista',
    desc: 'Epic mountain scenery',
    priceStars: 6,
    aspect: '1:1',
    imageUrl: getImageUrl(21, 600, 600),
  },
  {
    id: 'photo-3',
    type: 'photo',
    title: 'Street Photography',
    desc: 'Urban life moments',
    badge: 'NEW',
    priceStars: 6,
    aspect: '1:1',
    imageUrl: getImageUrl(22, 600, 600),
  },
  {
    id: 'photo-4',
    type: 'photo',
    title: 'Fashion Portrait',
    desc: 'Editorial style shots',
    priceStars: 8,
    aspect: '9:16',
    imageUrl: getImageUrl(23, 450, 800),
  },
  {
    id: 'photo-5',
    type: 'photo',
    title: 'Product Flat Lay',
    desc: 'Clean product compositions',
    priceStars: 6,
    aspect: '1:1',
    imageUrl: getImageUrl(24, 600, 600),
  },
  {
    id: 'photo-6',
    type: 'photo',
    title: 'Nature Macro',
    desc: 'Close-up botanical beauty',
    badge: 'NEW',
    priceStars: 6,
    aspect: '1:1',
    imageUrl: getImageUrl(25, 600, 600),
  },
  {
    id: 'photo-7',
    type: 'photo',
    title: 'Architecture',
    desc: 'Modern building designs',
    priceStars: 6,
    aspect: '9:16',
    imageUrl: getImageUrl(26, 450, 800),
  },
  {
    id: 'photo-8',
    type: 'photo',
    title: 'Lifestyle Shot',
    desc: 'Authentic everyday moments',
    priceStars: 6,
    aspect: '1:1',
    imageUrl: getImageUrl(27, 600, 600),
  },
  {
    id: 'photo-9',
    type: 'photo',
    title: 'Abstract Art',
    desc: 'Creative visual patterns',
    badge: 'PRO',
    priceStars: 10,
    aspect: '1:1',
    imageUrl: getImageUrl(28, 600, 600),
  },
  {
    id: 'photo-10',
    type: 'photo',
    title: 'Sports Action',
    desc: 'Dynamic athletic photography',
    priceStars: 8,
    aspect: '9:16',
    imageUrl: getImageUrl(29, 450, 800),
  },
  {
    id: 'photo-11',
    type: 'photo',
    title: 'Pet Portrait',
    desc: 'Adorable animal shots',
    badge: 'NEW',
    priceStars: 6,
    aspect: '1:1',
    imageUrl: getImageUrl(30, 600, 600),
  },
  {
    id: 'photo-12',
    type: 'photo',
    title: 'Event Coverage',
    desc: 'Special moments captured',
    priceStars: 6,
    aspect: '1:1',
    imageUrl: getImageUrl(31, 600, 600),
  },
];

// ===== VIDEO GRID (All 16:9) =====
export const videoItems: Item[] = [
  {
    id: 'video-1',
    type: 'video',
    title: 'Corporate Promo',
    desc: 'Professional business videos',
    badge: 'TOP',
    priceStars: 15,
    aspect: '16:9',
    imageUrl: getImageUrl(40, 800, 450),
  },
  {
    id: 'video-2',
    type: 'video',
    title: 'Social Media Reel',
    desc: 'Engaging short-form content',
    badge: 'FAST',
    priceStars: 10,
    aspect: '16:9',
    imageUrl: getImageUrl(41, 800, 450),
  },
  {
    id: 'video-3',
    type: 'video',
    title: 'Product Demo',
    desc: 'Showcase your products',
    priceStars: 12,
    aspect: '16:9',
    imageUrl: getImageUrl(42, 800, 450),
  },
  {
    id: 'video-4',
    type: 'video',
    title: 'Travel Vlog',
    desc: 'Adventure storytelling',
    badge: 'NEW',
    priceStars: 12,
    aspect: '16:9',
    imageUrl: getImageUrl(43, 800, 450),
  },
  {
    id: 'video-5',
    type: 'video',
    title: 'Music Video',
    desc: 'Artistic visual narratives',
    badge: 'PRO',
    priceStars: 20,
    aspect: '16:9',
    imageUrl: getImageUrl(44, 800, 450),
  },
  {
    id: 'video-6',
    type: 'video',
    title: 'Tutorial Video',
    desc: 'Educational content creation',
    priceStars: 10,
    aspect: '16:9',
    imageUrl: getImageUrl(45, 800, 450),
  },
  {
    id: 'video-7',
    type: 'video',
    title: 'Animation Loop',
    desc: 'Seamless motion graphics',
    badge: 'NEW',
    priceStars: 15,
    aspect: '16:9',
    imageUrl: getImageUrl(46, 800, 450),
  },
  {
    id: 'video-8',
    type: 'video',
    title: 'Event Highlight',
    desc: 'Memorable moments compiled',
    priceStars: 12,
    aspect: '16:9',
    imageUrl: getImageUrl(47, 800, 450),
  },
];

// ===== TOOLS =====
export const toolItems: Item[] = [
  {
    id: 'tool-1',
    type: 'tool',
    title: 'Background Remover',
    desc: 'One-click clean backgrounds',
    badge: 'FAST',
    priceStars: 2,
    aspect: '1:1',
    imageUrl: getImageUrl(60, 300, 300),
  },
  {
    id: 'tool-2',
    type: 'tool',
    title: 'AI Upscaler',
    desc: 'Enhance image quality',
    badge: 'TOP',
    priceStars: 4,
    aspect: '1:1',
    imageUrl: getImageUrl(61, 300, 300),
  },
  {
    id: 'tool-3',
    type: 'tool',
    title: 'Style Transfer',
    desc: 'Apply artistic filters',
    badge: 'NEW',
    priceStars: 3,
    aspect: '1:1',
    imageUrl: getImageUrl(62, 300, 300),
  },
  {
    id: 'tool-4',
    type: 'tool',
    title: 'Color Grading',
    desc: 'Professional color correction',
    priceStars: 3,
    aspect: '1:1',
    imageUrl: getImageUrl(63, 300, 300),
  },
  {
    id: 'tool-5',
    type: 'tool',
    title: 'Smart Crop',
    desc: 'Intelligent composition',
    badge: 'FAST',
    priceStars: 2,
    aspect: '1:1',
    imageUrl: getImageUrl(64, 300, 300),
  },
  {
    id: 'tool-6',
    type: 'tool',
    title: 'Text to Image',
    desc: 'Generate from descriptions',
    badge: 'TOP',
    priceStars: 6,
    aspect: '1:1',
    imageUrl: getImageUrl(65, 300, 300),
  },
];
