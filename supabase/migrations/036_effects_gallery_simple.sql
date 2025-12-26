-- 036_effects_gallery_simple.sql
-- Простая миграция для effects_gallery (без сложных RLS)

-- Отключаем RLS временно для выполнения миграции
set session_replication_role = 'replica';

-- Создаём таблицу если не существует
create table if not exists public.effects_gallery (
  id uuid primary key default gen_random_uuid(),
  preset_id text unique,
  title text,
  content_type text,
  model_key text,
  tile_ratio text,
  cost_stars int default 0,
  mode text default 't2i',
  variant_id text default 'default',
  preview_image text,
  preview_url text,
  template_prompt text,
  featured boolean default false,
  published boolean default false,
  display_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  placement text default 'home',
  status text default 'draft',
  category text,
  priority int default 0,
  type text,
  asset_url text,
  poster_url text,
  aspect text,
  short_description text
);

-- Добавляем колонки если их нет
do $$
begin
  begin alter table public.effects_gallery add column if not exists placement text default 'home'; exception when duplicate_column then null; end;
  begin alter table public.effects_gallery add column if not exists status text default 'draft'; exception when duplicate_column then null; end;
  begin alter table public.effects_gallery add column if not exists category text; exception when duplicate_column then null; end;
  begin alter table public.effects_gallery add column if not exists priority int default 0; exception when duplicate_column then null; end;
  begin alter table public.effects_gallery add column if not exists type text; exception when duplicate_column then null; end;
  begin alter table public.effects_gallery add column if not exists asset_url text; exception when duplicate_column then null; end;
  begin alter table public.effects_gallery add column if not exists poster_url text; exception when duplicate_column then null; end;
  begin alter table public.effects_gallery add column if not exists aspect text; exception when duplicate_column then null; end;
  begin alter table public.effects_gallery add column if not exists short_description text; exception when duplicate_column then null; end;
  begin alter table public.effects_gallery add column if not exists preview_url text; exception when duplicate_column then null; end;
end $$;

-- Включаем RLS обратно
set session_replication_role = 'origin';

-- Включаем RLS на таблице
alter table public.effects_gallery enable row level security;

-- Удаляем старые политики
drop policy if exists effects_gallery_read_public on public.effects_gallery;
drop policy if exists effects_gallery_write_manager_admin on public.effects_gallery;
drop policy if exists effects_gallery_select on public.effects_gallery;
drop policy if exists effects_gallery_all on public.effects_gallery;

-- Простые политики: все могут читать, аутентифицированные могут писать
create policy effects_gallery_select on public.effects_gallery
  for select using (true);

create policy effects_gallery_all on public.effects_gallery
  for all to authenticated using (true) with check (true);

-- Создаём индексы
create index if not exists effects_gallery_placement_idx on public.effects_gallery(placement);
create index if not exists effects_gallery_status_idx on public.effects_gallery(status);
create index if not exists effects_gallery_preset_id_idx on public.effects_gallery(preset_id);

