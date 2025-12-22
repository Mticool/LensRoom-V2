# Данные для обновления страницы /pricing

Этот файл собирает все данные поэтапно для полного обновления страницы тарифов.

---

## ✅ Промпт #1: Пакеты звёзд (starPacks)

```typescript
const starPacks = [
  {
    id: 'starter',
    name: 'Starter',
    price: 590,
    stars: 800,
    description: 'Попробовать премиум-модели',
    examples: { veoFast: 7, nanoPro: 22 }
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 1490,
    stars: 2200,
    discount: 8,
    description: 'Для небольшого проекта',
    examples: { veoFast: 20, nanoPro: 62 }
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 2990,
    stars: 4800,
    discount: 15,
    badge: 'popular',
    description: 'Оптимальный выбор',
    examples: { veoFast: 43, nanoPro: 137 }
  },
  {
    id: 'business',
    name: 'Business',
    price: 5990,
    stars: 10000,
    discount: 20,
    description: 'Для серьёзных задач',
    examples: { veoFast: 90, nanoPro: 285 }
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 9990,
    stars: 18000,
    discount: 25,
    description: 'Максимальная выгода',
    examples: { veoFast: 163, nanoPro: 514 }
  }
];
```

**Ключевые особенности:**
- 5 пакетов (было 4)
- Цены: 590₽ → 9990₽
- Звёзды: 800⭐ → 18000⭐
- Скидки: 8% → 25%
- Примеры использования (veoFast, nanoPro)
- Badge: 'popular' на Pro

---

## ✅ Промпт #2: Подписки (subscriptionTiers)

```typescript
const subscriptions = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    stars: 0,
    limits: { nanoBanana: 5, nanoPro: 0, tools: 5 }, // per day
    features: { watermark: true, commercial: false, priority: false, earlyAccess: false },
    description: 'Попробуйте бесплатно'
  },
  {
    id: 'lite',
    name: 'Lite',
    price: 590,
    stars: 0,
    limits: { nanoBanana: 'unlimited', nanoPro: 0, tools: 50 },
    features: { watermark: false, commercial: true, priority: false, earlyAccess: false },
    description: 'Для старта'
  },
  {
    id: 'creator',
    name: 'Creator',
    price: 1490,
    stars: 500,
    limits: { nanoBanana: 'unlimited', nanoPro: 30, tools: 100 },
    features: { watermark: false, commercial: true, priority: false, earlyAccess: false },
    badge: 'popular',
    description: 'Для блогеров и SMM'
  },
  {
    id: 'creator-pro',
    name: 'Creator Pro',
    price: 3490,
    stars: 1500,
    limits: { nanoBanana: 'unlimited', nanoPro: 150, tools: 300 },
    features: { watermark: false, commercial: true, priority: false, earlyAccess: false },
    description: 'Для профессиональных креаторов'
  },
  {
    id: 'studio',
    name: 'Studio',
    price: 5990,
    stars: 4000,
    limits: { nanoBanana: 'unlimited', nanoPro: 300, tools: 500 },
    features: { watermark: false, commercial: true, priority: true, earlyAccess: false },
    description: 'Для команд'
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 9990,
    stars: 8000,
    limits: { nanoBanana: 'unlimited', nanoPro: 500, tools: 1000 },
    features: { watermark: false, commercial: true, priority: true, earlyAccess: true },
    description: 'Для агентств'
  }
];
```

**Ключевые особенности:**
- 6 тарифов (было 3)
- Free: лимиты в ДЕНЬ (5 nanoBanana/день, 5 tools/день)
- Остальные: лимиты в МЕСЯЦ
- nanoBanana = базовая модель (быстрая, дешевая)
- nanoPro = премиум модель (качество, детализация)
- tools = инструменты (апскейл, редактирование и т.д.)
- Badge 'popular' на Creator
- Features: watermark, commercial, priority, earlyAccess

---

## ✅ Промпт #3: Цены на модели (modelPrices)

```typescript
const modelPrices = {
  photo: [
    { id: 'nano-banana', name: 'Nano Banana', stars: 6 },
    { id: 'nano-banana-pro', name: 'Nano Banana Pro', stars: 35 },
    { id: 'flux-pro-1k', name: 'Flux Pro', variant: '1K', stars: 10 },
    { id: 'flux-pro-2k', name: 'Flux Pro', variant: '2K', stars: 12 },
    { id: 'flux-flex-1k', name: 'Flux 2 Flex', variant: '1K', stars: 20 },
    { id: 'flux-flex-2k', name: 'Flux 2 Flex', variant: '2K', stars: 35 },
    { id: 'flux-kontext-max', name: 'Flux Kontext', variant: 'Max', stars: 15 },
    { id: 'flux-kontext-pro', name: 'Flux Kontext', variant: 'Pro', stars: 8 },
    { id: 'ideogram-turbo', name: 'Ideogram V3', variant: 'Turbo', stars: 7 },
    { id: 'ideogram-balanced', name: 'Ideogram V3', variant: 'Balanced', stars: 14 },
    { id: 'ideogram-quality', name: 'Ideogram V3', variant: 'Quality', stars: 19 },
    { id: 'ideogram-char-12', name: 'Ideogram Character', variant: '12 cred', stars: 15 },
    { id: 'ideogram-char-18', name: 'Ideogram Character', variant: '18 cred', stars: 25 },
    { id: 'ideogram-char-24', name: 'Ideogram Character', variant: '24 cred', stars: 35 },
    { id: 'seedream-45', name: 'Seedream 4.5', stars: 10 },
    { id: 'seedream-v4', name: 'Seedream V4', stars: 8 },
    { id: 'qwen-t2i', name: 'Qwen Text-to-Image', stars: 4 },
    { id: 'qwen-edit', name: 'Qwen Image Edit', stars: 6 },
    { id: 'imagen-fast', name: 'Imagen 4 Fast', stars: 6 },
    { id: 'z-image', name: 'Z-image', stars: 3 },
  ],
  video: [
    { id: 'veo-fast', name: 'Veo 3.1 Fast', variant: '8s', stars: 110 },
    { id: 'veo-quality', name: 'Veo 3.1 Quality', variant: '8s', stars: 450 },
    { id: 'hailuo-6s-768', name: 'Hailuo 2.3 I2V', variant: '6s 768p', stars: 45 },
    { id: 'hailuo-6s-1080', name: 'Hailuo 2.3 I2V', variant: '6s 1080p', stars: 75 },
    { id: 'hailuo-10s-768', name: 'Hailuo 2.3 I2V', variant: '10s 768p', stars: 75 },
    { id: 'kling-turbo-5s', name: 'Kling 2.5 Turbo', variant: '5s', stars: 65 },
    { id: 'kling-turbo-10s', name: 'Kling 2.5 Turbo', variant: '10s', stars: 130 },
    { id: 'kling-26-5s', name: 'Kling 2.6', variant: '5s', stars: 80 },
    { id: 'kling-26-10s', name: 'Kling 2.6', variant: '10s', stars: 160 },
    { id: 'kling-21-5s', name: 'Kling 2.1', variant: '5s', stars: 275 },
    { id: 'kling-21-10s', name: 'Kling 2.1', variant: '10s', stars: 550 },
    { id: 'wan-720-5s', name: 'Wan 2.6', variant: '720p 5s', stars: 100 },
    { id: 'wan-720-10s', name: 'Wan 2.6', variant: '720p 10s', stars: 210 },
    { id: 'wan-720-15s', name: 'Wan 2.6', variant: '720p 15s', stars: 310 },
    { id: 'wan-1080-5s', name: 'Wan 2.6', variant: '1080p 5s', stars: 160 },
    { id: 'wan-1080-10s', name: 'Wan 2.6', variant: '1080p 10s', stars: 310 },
    { id: 'wan-1080-15s', name: 'Wan 2.6', variant: '1080p 15s', stars: 470 },
    { id: 'sora-720-10s', name: 'Sora 2 Pro I2V', variant: '720p 10s', stars: 220 },
    { id: 'sora-720-15s', name: 'Sora 2 Pro I2V', variant: '720p 15s', stars: 400 },
    { id: 'sora-high-10s', name: 'Sora 2 Pro I2V', variant: 'High 10s', stars: 500 },
    { id: 'sora-high-15s', name: 'Sora 2 Pro I2V', variant: 'High 15s', stars: 940 },
  ],
  tools: [
    { id: 'remove-bg', name: 'Удаление фона', stars: 3 },
    { id: 'upscale-crisp', name: 'Апскейл (Recraft)', stars: 3 },
    { id: 'upscale-2k', name: 'Апскейл (Topaz)', variant: '≤2K', stars: 20 },
    { id: 'upscale-4k', name: 'Апскейл (Topaz)', variant: '4K', stars: 35 },
    { id: 'upscale-8k', name: 'Апскейл (Topaz)', variant: '8K', stars: 75 },
    { id: 'image-edit', name: 'Редактирование', stars: 6 },
  ]
};
```

**Ключевые особенности:**
- **47 моделей/инструментов** с детальными ценами
- **Photo:** 20 моделей (от 3⭐ до 35⭐)
- **Video:** 21 модель (от 45⭐ до 940⭐)
- **Tools:** 6 инструментов (от 3⭐ до 75⭐)
- Варианты (1K/2K, качество, длительность)
- Диапазон цен: 3⭐ (Z-image) → 940⭐ (Sora High 15s)

---

## ✅ Промпт #4: Use Cases + FAQ

### Use Cases

```typescript
const useCases = [
  {
    icon: '📱',
    title: 'Блогеры и Инфлюенсеры',
    description: 'Контент для Reels, Shorts и TikTok за минуты. Уникальные визуалы без студии и фотографа.',
    models: ['Veo 3.1 Fast', 'Nano Banana Pro', 'Ideogram']
  },
  {
    icon: '🛒',
    title: 'Продавцы на маркетплейсах',
    description: 'Фото и видео для карточек на Wildberries, Ozon, Яндекс Маркет. Тестируйте, что конвертирует лучше.',
    models: ['Flux Pro', 'Nano Banana', 'Topaz Upscale']
  },
  {
    icon: '📈',
    title: 'Маркетологи и SMM',
    description: 'A/B тесты креативов без затрат на продакшн. Контент под любой формат.',
    models: ['Veo 3.1', 'Ideogram V3', 'Flux Kontext']
  },
  {
    icon: '🎬',
    title: 'Видеографы и студии',
    description: 'Превращайте концепты в ролики. Прототипируйте идеи. VFX без дорогого CGI.',
    models: ['Kling 2.6', 'Sora 2 Pro', 'Hailuo']
  },
  {
    icon: '🏢',
    title: 'Бизнес и стартапы',
    description: 'Презентации, промо, соцсети — без штата дизайнеров. Экономия до 90%.',
    models: ['Все модели платформы']
  }
];
```

### FAQ

```typescript
const faq = [
  {
    question: 'Чем подписка отличается от пакета?',
    answer: 'Подписка — ежемесячный платёж с бесплатными лимитами, которые обновляются каждый месяц. Пакет — разовая покупка звёзд, которые не сгорают.'
  },
  {
    question: 'Что такое Nano Banana?',
    answer: 'Быстрая модель для черновиков (~0.5 сек/картинка). Nano Pro — студийное качество для финального контента.'
  },
  {
    question: 'Можно совместить подписку и пакет?',
    answer: 'Да! Подписка даёт бесплатные генерации, пакет — дополнительные звёзды для премиум-моделей.'
  },
  {
    question: 'Как работает безлимит Nano?',
    answer: 'Генерируйте сколько нужно. Ограничение только по скорости очереди.'
  },
  {
    question: 'Что если потрачу все звёзды?',
    answer: 'Бесплатные лимиты подписки останутся. Можно докупить пакет или подождать нового месяца.'
  },
  {
    question: 'Есть ли возврат?',
    answer: 'Да, в течение 3 дней после покупки, если вы не использовали более 10% звёзд.'
  }
];
```

---

## 📋 Структура итоговой страницы

1. Заголовок + подзаголовок
2. **Секция "Для кого LensRoom"** (карточки с иконками)
3. **Подписки** (таблица или карточки)
4. **Пакеты звёзд** (таблица или карточки)
5. **Цены на модели** (аккордеон или вкладка)
6. **FAQ** (аккордеон)
7. CTA "Начать бесплатно"

---

## 🎯 Правила

- ✅ Все цены в рублях (₽)
- ✅ Звёзды обозначаются ⭐
- ✅ Free tier — лимиты в ДЕНЬ
- ✅ Остальные подписки — лимиты в МЕСЯЦ
- ✅ Безлимит = "∞" или "Безлимит"
- ✅ Пакеты звёзд НЕ сгорают
- ✅ Тарифы с пометкой "Хит" выделены визуально

