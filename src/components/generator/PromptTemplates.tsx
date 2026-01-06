'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

// Шаблоны промптов по категориям
const PROMPT_TEMPLATES = {
  image: {
    title: 'Фото',
    categories: [
      {
        name: '👤 Портреты',
        prompts: [
          { title: 'Кинематограф', prompt: 'cinematic portrait, dramatic lighting, shallow depth of field, 8k, professional photography' },
          { title: 'Fashion', prompt: 'high fashion editorial portrait, soft studio lighting, elegant pose, vogue style' },
          { title: 'Естественный', prompt: 'natural portrait, golden hour lighting, bokeh background, candid expression' },
        ],
      },
      {
        name: '🏙️ Города',
        prompts: [
          { title: 'Киберпанк', prompt: 'cyberpunk city at night, neon lights, rain reflections, futuristic architecture' },
          { title: 'Закат', prompt: 'city skyline at sunset, golden hour, dramatic clouds, silhouette' },
          { title: 'Улица', prompt: 'cinematic street photography, moody atmosphere, urban environment' },
        ],
      },
      {
        name: '🌿 Природа',
        prompts: [
          { title: 'Горы', prompt: 'majestic mountain landscape, dramatic clouds, golden hour, epic scale' },
          { title: 'Лес', prompt: 'enchanted forest, sunbeams through trees, misty atmosphere, fairy tale' },
          { title: 'Океан', prompt: 'stormy ocean waves, dramatic sky, powerful nature, cinematic' },
        ],
      },
      {
        name: '✨ Фэнтези',
        prompts: [
          { title: 'Магия', prompt: 'magical fantasy scene, glowing particles, ethereal lighting, mystical atmosphere' },
          { title: 'Дракон', prompt: 'epic dragon flying over mountains, fantasy art, detailed scales, dramatic sky' },
          { title: 'Замок', prompt: 'fantasy castle in the clouds, magical atmosphere, sunset, epic scale' },
        ],
      },
      {
        name: '🎨 Арт',
        prompts: [
          { title: 'Аниме', prompt: 'beautiful anime character, studio ghibli style, soft colors, detailed' },
          { title: 'Масло', prompt: 'oil painting style, classical art, rich colors, textured brushstrokes' },
          { title: '3D', prompt: '3D render, octane render, detailed, studio lighting, high quality' },
        ],
      },
      {
        name: '📦 Продукты',
        prompts: [
          { title: 'Люкс', prompt: 'luxury product photography, marble surface, soft lighting, minimalist' },
          { title: 'Еда', prompt: 'gourmet food photography, appetizing, professional lighting, styled' },
          { title: 'Tech', prompt: 'modern tech product, clean white background, studio lighting, sleek design' },
        ],
      },
    ],
  },
  video: {
    title: 'Видео',
    categories: [
      {
        name: '🎬 Кино',
        prompts: [
          { title: 'Экшн', prompt: 'cinematic action scene, dramatic camera movement, epic scale' },
          { title: 'Романтика', prompt: 'romantic scene, soft lighting, golden hour, emotional' },
          { title: 'Триллер', prompt: 'suspenseful scene, dark atmosphere, dramatic lighting' },
        ],
      },
      {
        name: '🌊 Природа',
        prompts: [
          { title: 'Океан', prompt: 'drone shot over ocean waves, cinematic, slow motion' },
          { title: 'Лес', prompt: 'peaceful forest walk, sunlight through trees, nature sounds' },
          { title: 'Горы', prompt: 'aerial view of mountains, epic landscape, cinematic' },
        ],
      },
      {
        name: '🚀 Sci-Fi',
        prompts: [
          { title: 'Космос', prompt: 'spaceship flying through nebula, cinematic, epic music' },
          { title: 'Город будущего', prompt: 'futuristic city, flying cars, neon lights, cyberpunk' },
          { title: 'Робот', prompt: 'advanced robot walking, detailed mechanical parts, cinematic' },
        ],
      },
    ],
  },
  audio: {
    title: 'Музыка',
    categories: [
      {
        name: '🎸 Жанры',
        prompts: [
          { title: 'Lo-Fi', prompt: 'chill lo-fi beat, jazzy piano, relaxing, study music' },
          { title: 'EDM', prompt: 'energetic EDM track, powerful drop, festival vibes' },
          { title: 'Cinematic', prompt: 'epic cinematic orchestra, emotional, trailer music' },
        ],
      },
      {
        name: '🎹 Настроение',
        prompts: [
          { title: 'Спокойное', prompt: 'calm ambient music, relaxing, meditation, peaceful' },
          { title: 'Энергичное', prompt: 'upbeat energetic music, motivating, workout, powerful' },
          { title: 'Грустное', prompt: 'melancholic piano melody, emotional, sad, reflective' },
        ],
      },
    ],
  },
};

interface PromptTemplatesProps {
  type: 'image' | 'video' | 'audio';
  onSelectPrompt: (prompt: string) => void;
  isCollapsed?: boolean;
}

export function PromptTemplates({ type, onSelectPrompt, isCollapsed = true }: PromptTemplatesProps) {
  const [isOpen, setIsOpen] = useState(!isCollapsed);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const templates = PROMPT_TEMPLATES[type];
  if (!templates) return null;

  return (
    <div className="mb-4">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface2)] border border-[var(--border)] transition-colors text-sm"
      >
        <Lightbulb className="w-4 h-4 text-[var(--accent-primary)]" />
        <span className="text-[var(--muted)]">Шаблоны промптов</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-[var(--muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
        )}
      </button>

      {/* Templates Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              {/* Categories */}
              <div className="flex flex-wrap gap-2 mb-4">
                {templates.categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm transition-colors
                      ${selectedCategory === cat.name
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[var(--surface2)] text-[var(--muted)] hover:text-[var(--text)]'
                      }
                    `}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Prompts for selected category */}
              <AnimatePresence mode="wait">
                {selectedCategory && (
                  <motion.div
                    key={selectedCategory}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-2"
                  >
                    {templates.categories
                      .find(c => c.name === selectedCategory)
                      ?.prompts.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            onSelectPrompt(p.prompt);
                            setIsOpen(false);
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--surface2)] hover:bg-[var(--surface3)] border border-transparent hover:border-[var(--accent-primary)]/30 transition-all text-left group"
                        >
                          <Sparkles className="w-4 h-4 text-[var(--accent-primary)] opacity-50 group-hover:opacity-100 transition-opacity" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[var(--text)]">{p.title}</div>
                            <div className="text-xs text-[var(--muted)] truncate">{p.prompt}</div>
                          </div>
                        </button>
                      ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hint if no category selected */}
              {!selectedCategory && (
                <p className="text-sm text-[var(--muted)] text-center py-4">
                  Выберите категорию для просмотра шаблонов
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PromptTemplates;







