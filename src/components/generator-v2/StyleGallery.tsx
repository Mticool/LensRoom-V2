'use client';

import { useState } from 'react';
import { X, Sparkles, Search } from 'lucide-react';

interface Style {
  id: string;
  name: string;
  nameEn: string;
  prompt: string;
  image: string;
  video?: string;
  category: string;
  popular?: boolean;
}

// Стили с AI-сгенерированными превью (Freepik Pikaso style)
// Используем качественные изображения которые отражают каждый стиль
const STYLES: Style[] = [
  // === ПОПУЛЯРНЫЕ ===
  {
    id: 'photorealistic',
    name: 'Фотореализм',
    nameEn: 'Photorealistic',
    prompt: 'photorealistic, highly detailed, professional photography, 8k uhd, sharp focus, natural lighting, DSLR quality',
    image: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=400&h=400&fit=crop&q=80',
    category: 'photo',
    popular: true,
  },
  {
    id: 'cinematic',
    name: 'Кинематограф',
    nameEn: 'Cinematic',
    prompt: 'cinematic shot, movie still, dramatic lighting, film grain, anamorphic lens, shallow depth of field, color grading',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=400&fit=crop&q=80',
    category: 'photo',
    popular: true,
  },
  {
    id: 'anime',
    name: 'Аниме',
    nameEn: 'Anime',
    prompt: 'anime style, manga art, cel shaded, vibrant colors, detailed anime illustration, Japanese animation, studio ghibli',
    image: 'https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=400&h=400&fit=crop&q=80',
    category: 'illustration',
    popular: true,
  },
  {
    id: 'digital-art',
    name: 'Цифровой арт',
    nameEn: 'Digital Art',
    prompt: 'digital art, concept art, artstation trending, detailed illustration, fantasy art, vibrant colors, professional',
    image: 'https://images.unsplash.com/photo-1634017839464-5c339ez51a1?w=400&h=400&fit=crop&q=80',
    category: 'illustration',
    popular: true,
  },
  {
    id: '3d-render',
    name: '3D Рендер',
    nameEn: '3D Render',
    prompt: '3d render, octane render, unreal engine 5, ray tracing, hyperrealistic, global illumination, 8k, blender',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=400&fit=crop&q=80',
    category: '3d',
    popular: true,
  },
  {
    id: 'cyberpunk',
    name: 'Киберпанк',
    nameEn: 'Cyberpunk',
    prompt: 'cyberpunk style, neon lights, futuristic city, rain reflections, night scene, dystopian, blade runner aesthetic',
    image: 'https://images.unsplash.com/photo-1515630278258-407f66498911?w=400&h=400&fit=crop&q=80',
    category: 'style',
    popular: true,
  },

  // === ФОТО СТИЛИ ===
  {
    id: 'portrait',
    name: 'Портрет',
    nameEn: 'Portrait',
    prompt: 'professional portrait photography, studio lighting, soft focus, fashion editorial, beauty shot, high end',
    image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&q=80',
    category: 'photo',
  },
  {
    id: 'product',
    name: 'Продуктовое',
    nameEn: 'Product Shot',
    prompt: 'product photography, commercial shoot, clean background, professional studio lighting, advertising quality, packshot',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop&q=80',
    category: 'photo',
  },
  {
    id: 'fashion',
    name: 'Фэшн',
    nameEn: 'Fashion',
    prompt: 'high fashion photography, vogue style, editorial, dramatic pose, designer clothing, luxury aesthetic, runway',
    image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400&h=400&fit=crop&q=80',
    category: 'photo',
  },
  {
    id: 'food',
    name: 'Фуд-фото',
    nameEn: 'Food',
    prompt: 'food photography, gourmet presentation, appetizing, professional food styling, natural light, delicious, michelin',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop&q=80',
    category: 'photo',
  },
  {
    id: 'architecture',
    name: 'Архитектура',
    nameEn: 'Architecture',
    prompt: 'architectural photography, modern architecture, dramatic angles, golden hour, professional, wide angle, symmetry',
    image: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=400&h=400&fit=crop&q=80',
    category: 'photo',
  },
  {
    id: 'landscape',
    name: 'Пейзаж',
    nameEn: 'Landscape',
    prompt: 'landscape photography, epic scenery, golden hour, dramatic sky, national geographic, nature, majestic',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop&q=80',
    category: 'photo',
  },
  {
    id: 'macro',
    name: 'Макро',
    nameEn: 'Macro',
    prompt: 'macro photography, extreme close-up, detailed texture, shallow depth of field, professional macro lens, intricate',
    image: 'https://images.unsplash.com/photo-1550159930-40066082a4fc?w=400&h=400&fit=crop&q=80',
    category: 'photo',
  },
  {
    id: 'street',
    name: 'Стрит',
    nameEn: 'Street',
    prompt: 'street photography, urban life, candid moment, documentary style, authentic, gritty, storytelling',
    image: 'https://images.unsplash.com/photo-1517732306149-e8f829eb588a?w=400&h=400&fit=crop&q=80',
    category: 'photo',
  },
  {
    id: 'noir-photo',
    name: 'Ч/Б Фото',
    nameEn: 'B&W Photo',
    prompt: 'black and white photography, high contrast, dramatic shadows, film grain, classic, timeless, monochrome',
    image: 'https://images.unsplash.com/photo-1509042239860-f0ca31c0a5b0?w=400&h=400&fit=crop&q=80',
    category: 'photo',
  },

  // === ИЛЛЮСТРАЦИИ ===
  {
    id: 'watercolor',
    name: 'Акварель',
    nameEn: 'Watercolor',
    prompt: 'watercolor painting, soft colors, artistic brushstrokes, flowing paint, dreamy atmosphere, traditional art, wet on wet',
    image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=400&fit=crop&q=80',
    category: 'illustration',
  },
  {
    id: 'oil-painting',
    name: 'Масло',
    nameEn: 'Oil Painting',
    prompt: 'oil painting, classic art, renaissance style, detailed brushwork, rich colors, canvas texture, masterpiece, impasto',
    image: 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=400&h=400&fit=crop&q=80',
    category: 'illustration',
  },
  {
    id: 'comic',
    name: 'Комикс',
    nameEn: 'Comic Book',
    prompt: 'comic book style, bold outlines, halftone dots, dynamic action, superhero, vibrant panels, graphic novel',
    image: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=400&fit=crop&q=80',
    category: 'illustration',
  },
  {
    id: 'pixel-art',
    name: 'Пиксель',
    nameEn: 'Pixel Art',
    prompt: '16-bit pixel art, retro gaming style, limited color palette, pixelated, nostalgic, 8-bit, game sprite',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=400&fit=crop&q=80',
    category: 'illustration',
  },
  {
    id: 'sketch',
    name: 'Скетч',
    nameEn: 'Sketch',
    prompt: 'pencil sketch, hand drawn, artistic sketch, charcoal drawing, traditional art, detailed linework, crosshatching',
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=400&fit=crop&q=80',
    category: 'illustration',
  },
  {
    id: 'vector',
    name: 'Вектор',
    nameEn: 'Vector',
    prompt: 'vector art, flat design, clean lines, geometric shapes, modern illustration, minimalist graphic, scalable',
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=400&fit=crop&q=80',
    category: 'illustration',
  },
  {
    id: 'sticker',
    name: 'Стикер',
    nameEn: 'Sticker',
    prompt: 'sticker design, cute illustration, kawaii style, die-cut sticker, white border, colorful, adorable, chibi',
    image: 'https://images.unsplash.com/photo-1558478551-1a378f63328e?w=400&h=400&fit=crop&q=80',
    category: 'illustration',
  },
  {
    id: 'childrens-book',
    name: 'Детская книга',
    nameEn: 'Children Book',
    prompt: 'children book illustration, whimsical, colorful, friendly characters, storybook art, warm, inviting',
    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=400&fit=crop&q=80',
    category: 'illustration',
  },

  // === 3D СТИЛИ ===
  {
    id: 'low-poly',
    name: 'Low Poly',
    nameEn: 'Low Poly',
    prompt: 'low poly art, geometric shapes, flat colors, minimalist 3d, polygonal design, crystal facets, angular',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop&q=80',
    category: '3d',
  },
  {
    id: 'isometric',
    name: 'Изометрия',
    nameEn: 'Isometric',
    prompt: 'isometric view, isometric design, 3d isometric illustration, geometric perspective, clean render, diorama',
    image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&h=400&fit=crop&q=80',
    category: '3d',
  },
  {
    id: 'clay-render',
    name: 'Clay',
    nameEn: 'Clay Render',
    prompt: 'clay render, soft plastic material, matte finish, smooth surface, 3d character, cute design, claymation',
    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=400&fit=crop&q=80',
    category: '3d',
  },
  {
    id: 'glass',
    name: 'Стекло',
    nameEn: 'Glass',
    prompt: 'glass material, transparent, reflections, refractions, caustics, 3d glass render, crystal clear, iridescent',
    image: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400&h=400&fit=crop&q=80',
    category: '3d',
  },
  {
    id: 'neon',
    name: 'Неон',
    nameEn: 'Neon Glow',
    prompt: 'neon sign, glowing neon lights, vibrant colors, dark background, retro neon, synthwave, electric glow',
    image: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&h=400&fit=crop&q=80',
    category: '3d',
  },
  {
    id: 'holographic',
    name: 'Голограмма',
    nameEn: 'Holographic',
    prompt: 'holographic, iridescent, rainbow colors, futuristic, chrome, metallic sheen, sci-fi technology',
    image: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=400&h=400&fit=crop&q=80',
    category: '3d',
  },

  // === ХУДОЖЕСТВЕННЫЕ СТИЛИ ===
  {
    id: 'fantasy',
    name: 'Фэнтези',
    nameEn: 'Fantasy',
    prompt: 'fantasy art, magical atmosphere, enchanted, ethereal lighting, mystical, epic fantasy, detailed, magical realism',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=400&fit=crop&q=80',
    category: 'style',
  },
  {
    id: 'scifi',
    name: 'Sci-Fi',
    nameEn: 'Sci-Fi',
    prompt: 'science fiction, futuristic technology, space opera, advanced civilization, sci-fi concept art, space',
    image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=400&fit=crop&q=80',
    category: 'style',
  },
  {
    id: 'steampunk',
    name: 'Стимпанк',
    nameEn: 'Steampunk',
    prompt: 'steampunk style, victorian era, brass machinery, clockwork, gears and cogs, retro-futuristic, copper',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop&q=80',
    category: 'style',
  },
  {
    id: 'vintage',
    name: 'Винтаж',
    nameEn: 'Vintage',
    prompt: 'vintage style, retro aesthetic, faded colors, film grain, nostalgic atmosphere, 70s vibe, analog',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&q=80',
    category: 'style',
  },
  {
    id: 'noir',
    name: 'Нуар',
    nameEn: 'Film Noir',
    prompt: 'film noir style, black and white, high contrast, dramatic shadows, moody atmosphere, detective, mystery',
    image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=400&fit=crop&q=80',
    category: 'style',
  },
  {
    id: 'minimalist',
    name: 'Минимализм',
    nameEn: 'Minimalist',
    prompt: 'minimalist style, clean composition, simple shapes, white space, modern design, elegant simplicity, zen',
    image: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=400&h=400&fit=crop&q=80',
    category: 'style',
  },
  {
    id: 'surreal',
    name: 'Сюрреализм',
    nameEn: 'Surreal',
    prompt: 'surrealist art, dreamlike scene, impossible geometry, salvador dali inspired, abstract reality, mind-bending',
    image: 'https://images.unsplash.com/photo-1536152470836-b943b246224c?w=400&h=400&fit=crop&q=80',
    category: 'style',
  },
  {
    id: 'vaporwave',
    name: 'Вейпорвейв',
    nameEn: 'Vaporwave',
    prompt: 'vaporwave aesthetic, 80s retro, neon pink and blue, grid patterns, synthwave, retro futurism, aesthetic',
    image: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=400&h=400&fit=crop&q=80',
    category: 'style',
  },
  {
    id: 'gothic',
    name: 'Готика',
    nameEn: 'Gothic',
    prompt: 'gothic style, dark atmosphere, medieval architecture, dramatic lighting, mysterious, ornate, cathedral',
    image: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=400&h=400&fit=crop&q=80',
    category: 'style',
  },
  {
    id: 'impressionist',
    name: 'Импрессионизм',
    nameEn: 'Impressionist',
    prompt: 'impressionist painting, monet style, loose brushstrokes, soft colors, natural light, plein air, atmospheric',
    image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=400&fit=crop&q=80',
    category: 'style',
  },
  {
    id: 'pop-art',
    name: 'Поп-арт',
    nameEn: 'Pop Art',
    prompt: 'pop art style, andy warhol inspired, bold colors, halftone dots, celebrity culture, graphic, roy lichtenstein',
    image: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=400&h=400&fit=crop&q=80',
    category: 'style',
  },
  {
    id: 'art-deco',
    name: 'Арт-деко',
    nameEn: 'Art Deco',
    prompt: 'art deco style, 1920s aesthetic, geometric patterns, gold accents, luxury, gatsby era, opulent',
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&h=400&fit=crop&q=80',
    category: 'style',
  },
  {
    id: 'japanese',
    name: 'Японский',
    nameEn: 'Japanese',
    prompt: 'japanese art style, ukiyo-e inspired, traditional japanese aesthetics, zen, wabi-sabi, woodblock print',
    image: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=400&h=400&fit=crop&q=80',
    category: 'style',
  },
  {
    id: 'psychedelic',
    name: 'Психоделика',
    nameEn: 'Psychedelic',
    prompt: 'psychedelic art, trippy visuals, vibrant colors, fractal patterns, mind-expanding, 60s aesthetic, kaleidoscope',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&q=80',
    category: 'style',
  },
];

interface StyleGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStyle: (prompt: string) => void;
}

const CATEGORIES = [
  { id: 'all', name: 'Все', icon: '✨' },
  { id: 'popular', name: 'Популярные', icon: '🔥' },
  { id: 'photo', name: 'Фото', icon: '📸' },
  { id: 'illustration', name: 'Иллюстрация', icon: '🎨' },
  { id: '3d', name: '3D', icon: '🎲' },
  { id: 'style', name: 'Стили', icon: '🎭' },
];

export function StyleGallery({ isOpen, onClose, onSelectStyle }: StyleGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredStyle, setHoveredStyle] = useState<string | null>(null);
  
  if (!isOpen) return null;

  const handleSelect = (style: Style) => {
    onSelectStyle(style.prompt);
    onClose();
  };

  const filteredStyles = STYLES.filter(s => {
    const matchesCategory = 
      selectedCategory === 'all' || 
      (selectedCategory === 'popular' && s.popular) ||
      s.category === selectedCategory;
    
    const matchesSearch = 
      !searchQuery || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nameEn.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-4xl max-h-[85vh] bg-[#18181B] rounded-2xl border border-[#27272A] shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Freepik compact */}
        <div className="px-5 py-4 border-b border-[#27272A] flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00D9FF]" />
              <h2 className="text-sm font-semibold text-white">Стили</h2>
              <span className="text-[11px] text-[#52525B]">{filteredStyles.length}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#27272A] text-[#52525B] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск стилей..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#27272A] border border-[#27272A] text-white text-xs placeholder:text-[#52525B] focus:outline-none focus:border-[#3F3F46]"
            />
          </div>

          {/* Category Filter - Freepik pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-[#00D9FF] text-[#0F0F10]'
                    : 'bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46]'
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid - Freepik compact */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {filteredStyles.map((style) => (
              <button
                key={style.id}
                onClick={() => handleSelect(style)}
                onMouseEnter={() => setHoveredStyle(style.id)}
                onMouseLeave={() => setHoveredStyle(null)}
                className="group relative aspect-square rounded-lg overflow-hidden border border-[#27272A] hover:border-[#00D9FF]/50 transition-all hover:scale-[1.03]"
              >
                {/* Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={style.image}
                  alt={style.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                
                {/* Popular badge */}
                {style.popular && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-[#00D9FF] text-[8px] font-bold text-[#0F0F10]">
                    🔥
                  </div>
                )}
                
                {/* Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity ${
                  hoveredStyle === style.id ? 'opacity-100' : 'opacity-70'
                }`} />
                
                {/* Title */}
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-white font-medium text-[11px] truncate">{style.name}</p>
                  <p className="text-white/50 text-[9px] truncate">{style.nameEn}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[#27272A] bg-[#0F0F10]">
          <p className="text-[10px] text-[#52525B] text-center">
            Нажмите на стиль чтобы добавить к промпту
          </p>
        </div>
      </div>
    </div>
  );
}
