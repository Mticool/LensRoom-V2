-- 020_inspiration_styles.sql
-- Таблица для стилей: раздел вдохновение + главная страница

begin;

-- Таблица стилей
create table if not exists public.inspiration_styles (
  id uuid primary key default gen_random_uuid(),
  
  -- Основная информация
  title text not null,
  description text,
  
  -- Тип размещения
  placement text not null check (placement in ('homepage', 'inspiration', 'both')),
  
  -- Визуал
  preview_image text, -- URL превью
  thumbnail_url text, -- URL миниатюры
  
  -- KIE настройки для генерации
  model_key text not null, -- kie-model key
  preset_id text, -- ID пресета если есть
  template_prompt text, -- Шаблон промпта
  
  -- Стоимость
  cost_stars int not null default 4,
  
  -- Отображение
  featured boolean not null default false, -- Избранное
  published boolean not null default true, -- Опубликовано
  display_order int not null default 0, -- Порядок отображения
  
  -- Категория/теги
  category text, -- Категория (portrait, landscape, art, etc)
  tags text[], -- Массив тегов
  
  -- Метаданные
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  
  -- Статистика
  views_count int not null default 0,
  uses_count int not null default 0
);

-- Индексы для быстрого поиска
create index if not exists inspiration_styles_placement_idx on public.inspiration_styles(placement);
create index if not exists inspiration_styles_published_idx on public.inspiration_styles(published);
create index if not exists inspiration_styles_featured_idx on public.inspiration_styles(featured);
create index if not exists inspiration_styles_category_idx on public.inspiration_styles(category);
create index if not exists inspiration_styles_display_order_idx on public.inspiration_styles(display_order);
create index if not exists inspiration_styles_tags_idx on public.inspiration_styles using gin(tags);

-- Автообновление updated_at
create or replace function public.update_inspiration_styles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger inspiration_styles_updated_at
  before update on public.inspiration_styles
  for each row
  execute function public.update_inspiration_styles_updated_at();

-- RLS: менеджеры и админы могут управлять
alter table public.inspiration_styles enable row level security;

-- Все могут читать опубликованные
create policy inspiration_styles_read_public 
  on public.inspiration_styles
  for select
  using (published = true or public.has_role(auth.uid(), array['admin', 'manager']));

-- Менеджеры и админы могут создавать/изменять/удалять
create policy inspiration_styles_write_manager_admin 
  on public.inspiration_styles
  for all
  to authenticated
  using (public.has_role(auth.uid(), array['admin', 'manager']))
  with check (public.has_role(auth.uid(), array['admin', 'manager']));

commit;
