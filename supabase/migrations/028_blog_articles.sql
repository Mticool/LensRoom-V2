-- Blog Articles Table for SEO Content
-- Позволяет создавать статьи через админку для индексации поисковиками

-- Create articles table
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  author TEXT DEFAULT 'LensRoom',
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_articles_published 
  ON public.articles(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_slug 
  ON public.articles(slug) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_articles_tags 
  ON public.articles USING GIN(tags);

-- Comments
COMMENT ON TABLE public.articles IS 'Blog articles for SEO and content marketing';
COMMENT ON COLUMN public.articles.slug IS 'URL-friendly identifier for the article';
COMMENT ON COLUMN public.articles.content IS 'Markdown or HTML content of the article';
COMMENT ON COLUMN public.articles.cover_image IS 'URL to cover image for article';
COMMENT ON COLUMN public.articles.tags IS 'Array of tags for categorization';

-- RLS Policies
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Anyone can read published articles
CREATE POLICY "Public can read published articles"
  ON public.articles
  FOR SELECT
  USING (is_published = true);

-- Admins can do everything
CREATE POLICY "Admins can manage articles"
  ON public.articles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.telegram_profiles tp
      WHERE tp.auth_user_id = auth.uid()
      AND tp.role IN ('admin', 'manager')
    )
  );

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS articles_updated_at ON public.articles;
CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION update_articles_updated_at();

-- Insert sample article for testing
INSERT INTO public.articles (slug, title, description, content, tags, is_published, published_at)
VALUES (
  'kak-ispolzovat-ai-dlya-generacii-foto',
  'Как использовать AI для генерации фото: полное руководство',
  'Узнайте, как создавать профессиональные фотографии с помощью искусственного интеллекта. Пошаговое руководство для начинающих.',
  '# Как использовать AI для генерации фото

AI-генерация изображений — это технология, которая позволяет создавать уникальные фотографии на основе текстового описания.

## Что такое AI генератор изображений?

AI генератор изображений использует нейронные сети для создания изображений на основе текстового промпта. Популярные модели включают:

- **Flux** — высокое качество и реализм
- **Midjourney** — художественный стиль
- **DALL-E** — универсальность

## Как написать хороший промпт?

1. **Будьте конкретны** — опишите детали сцены
2. **Укажите стиль** — фотореализм, арт, минимализм
3. **Добавьте технические параметры** — освещение, ракурс

## Примеры промптов

```
Профессиональная фотография продукта на белом фоне, 
мягкое студийное освещение, высокая детализация
```

## Заключение

AI генерация — мощный инструмент для создания контента. Начните экспериментировать уже сегодня!',
  ARRAY['ai', 'генерация', 'фото', 'руководство'],
  true,
  now()
) ON CONFLICT (slug) DO NOTHING;

