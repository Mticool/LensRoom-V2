export type SeedBlogArticle = {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string; // markdown
  cover_image: string | null;
  author: string;
  tags: string[];
  published_at: string;
  updated_at: string;
  views_count: number;
};

const nowIso = new Date().toISOString();

export const SEED_BLOG_ARTICLES: SeedBlogArticle[] = [
  {
    id: "seed-1",
    slug: "sozdanie-video-ii-prompty-veo-kling-sora",
    title: "Создание видео с помощью ИИ: промпты и настройки (Veo, Kling, Sora)",
    description:
      "Практический гайд: как писать промпты для видео, какие параметры важны (длительность, ракурс, стиль), и с чего начать в LensRoom.",
    cover_image: null,
    author: "LensRoom",
    tags: ["видео", "промпты", "Veo", "Kling", "Sora"],
    published_at: nowIso,
    updated_at: nowIso,
    views_count: 0,
    content: `
## Что важно в промпте для видео
В видео промпте нужно описать не только *что* происходит, но и *как это снято*:

- **Сцена**: где и что делает персонаж/объект  
- **Действие**: движение, жесты, динамика  
- **Камера**: общий/средний/крупный план, движение камеры  
- **Свет**: мягкий, контровой, неон, дневной  
- **Стиль**: cinematic, documentary, anime, рекламный ролик  

## Универсальный шаблон промпта
\`\`\`
[scene], [subject], [action], [camera], [lighting], [style], high detail
\`\`\`

Пример:
\`\`\`
cinematic street at night, a young woman in a raincoat walking through neon reflections,
slow motion, handheld camera, soft rim light, film look, high detail
\`\`\`

## Какие настройки влияют сильнее всего
- **Длительность**: чем больше секунд — тем выше цена и шанс артефактов, начинайте с 5–10с  
- **Соотношение сторон**: 16:9 для YouTube, 9:16 для Reels/Shorts  
- **Качество** (если доступно): Fast для итераций, Quality — для финала  

## С чего начать в LensRoom
1) Откройте **/video** или страницу нужной модели в **/models**  
2) Нажмите “Попробовать” — откроется генератор с нужной моделью  
3) Сгенерируйте 2–3 варианта: сначала “простые сцены”, потом усложняйте  
`,
  },
  {
    id: "seed-2",
    slug: "sozdanie-izobrazhenii-ii-nano-gpt-seedream",
    title: "Создание изображений с помощью ИИ: быстрый старт (Nano Banana Pro, GPT Image, Seedream)",
    description:
      "Как быстро получать красивые картинки: структура промпта, советы по стилю и деталям, и когда выбирать Nano/GPT/Seedream.",
    cover_image: null,
    author: "LensRoom",
    tags: ["изображения", "промпты", "Nano Banana Pro", "GPT Image", "Seedream"],
    published_at: nowIso,
    updated_at: nowIso,
    views_count: 0,
    content: `
## Как писать промпты для изображений
Главное — конкретика. Хороший промпт отвечает на вопросы:

- **Кто/что** в кадре  
- **Композиция** (портрет, общий план, предметка)  
- **Свет** (soft light, studio lighting, golden hour)  
- **Стиль** (photo, film, editorial, 3D)  
- **Детали** (фон, одежда, текстуры)  

## Пример промпта “как у продакшена”
\`\`\`
professional product photo of a matte black perfume bottle on a wet stone,
studio lighting, soft reflections, shallow depth of field, high detail, 4k
\`\`\`

## Какую модель выбрать
- **Nano Banana Pro**: быстро, удобно, можно генерировать варианты (несколько картинок)  
- **GPT Image 1.5**: когда нужно “понимание” и редактирование/правки  
- **Seedream 4.5**: стабильное качество, детали, хороший “финиш”  

## Быстрый чек‑лист
- Добавляйте **тип объектива**: 35mm / 50mm / 85mm  
- Пишите **negative prompt**, если есть мусор/искажения  
- Делайте 2–4 варианта и выбирайте лучший, потом улучшайте промпт  
`,
  },
  {
    id: "seed-3",
    slug: "kling-motion-control-kak-rabotaet",
    title: "Kling Motion Control: как перенести движения на персонажа",
    description:
      "Разбор Motion Control: какие файлы нужны, как подобрать референс-видео, и как получить чистый перенос движений.",
    cover_image: null,
    author: "LensRoom",
    tags: ["Kling", "Motion Control", "видео", "гайд"],
    published_at: nowIso,
    updated_at: nowIso,
    views_count: 0,
    content: `
## Что такое Motion Control
Motion Control — это перенос движений (танец, жесты, мимика) из референс‑видео на вашего персонажа.

## Что нужно загрузить
- **Картинка персонажа** (фото/рендер)  
- **Видео с движением** (референс)  

## Как выбрать хороший референс
- Движения должны быть **чётко видны** (не слишком темно)  
- Камера лучше **статичная**, без сильного тряска  
- Избегайте сильных перекрытий: руки закрывают лицо, объекты перед камерой  

## Советы для чистого результата
- Начните с коротких роликов и простых движений  
- Если есть проблема с “пластикой” — попробуйте другой референс  
- Для соцсетей обычно лучше 9:16, для YouTube — 16:9  
`,
  },
];

export function getSeedArticleBySlug(slug: string): SeedBlogArticle | undefined {
  return SEED_BLOG_ARTICLES.find((a) => a.slug === slug);
}


