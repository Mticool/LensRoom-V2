-- 036_ensure_effects_gallery.sql
-- Ensure effects_gallery table exists with all required fields

begin;

-- Create table if not exists
create table if not exists public.effects_gallery (
  id uuid primary key default gen_random_uuid(),
  preset_id text not null unique,
  title text not null,
  content_type text not null check (content_type in ('photo', 'video')),
  model_key text not null,
  tile_ratio text not null check (tile_ratio in ('9:16', '1:1', '16:9')),
  cost_stars int not null default 0,
  mode text not null default 't2i',
  variant_id text not null default 'default',
  preview_image text,
  preview_url text,
  template_prompt text,
  featured boolean not null default false,
  published boolean not null default false,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Content Constructor fields
  placement text check (placement in ('home', 'inspiration')) default 'home',
  status text check (status in ('draft', 'published')) default 'draft',
  category text,
  priority int default 0,
  type text check (type in ('image', 'video')),
  asset_url text,
  poster_url text,
  aspect text check (aspect in ('1:1', '9:16', '16:9')),
  short_description text
);

-- Ensure all columns exist (add if missing)
do $$
begin
  -- Check and add columns that might be missing
  if not exists (select 1 from information_schema.columns where table_name='effects_gallery' and column_name='placement') then
    alter table public.effects_gallery add column placement text check (placement in ('home', 'inspiration')) default 'home';
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name='effects_gallery' and column_name='status') then
    alter table public.effects_gallery add column status text check (status in ('draft', 'published')) default 'draft';
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name='effects_gallery' and column_name='category') then
    alter table public.effects_gallery add column category text;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name='effects_gallery' and column_name='priority') then
    alter table public.effects_gallery add column priority int default 0;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name='effects_gallery' and column_name='type') then
    alter table public.effects_gallery add column type text check (type in ('image', 'video'));
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name='effects_gallery' and column_name='asset_url') then
    alter table public.effects_gallery add column asset_url text;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name='effects_gallery' and column_name='poster_url') then
    alter table public.effects_gallery add column poster_url text;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name='effects_gallery' and column_name='aspect') then
    alter table public.effects_gallery add column aspect text check (aspect in ('1:1', '9:16', '16:9'));
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name='effects_gallery' and column_name='short_description') then
    alter table public.effects_gallery add column short_description text;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name='effects_gallery' and column_name='preview_url') then
    alter table public.effects_gallery add column preview_url text;
  end if;
end $$;

-- Migrate data: published -> status
update public.effects_gallery set status = 'published' where published = true and status is null;
update public.effects_gallery set status = 'draft' where published = false and status is null;

-- Set type from content_type if null
update public.effects_gallery set type = 
  case 
    when content_type = 'photo' then 'image'
    when content_type = 'video' then 'video'
    else 'image'
  end
where type is null;

-- Set aspect from tile_ratio if null
update public.effects_gallery set aspect = tile_ratio where aspect is null;

-- Create indexes for performance
create index if not exists effects_gallery_placement_idx on public.effects_gallery(placement);
create index if not exists effects_gallery_status_idx on public.effects_gallery(status);
create index if not exists effects_gallery_category_idx on public.effects_gallery(category);
create index if not exists effects_gallery_priority_idx on public.effects_gallery(priority);
create index if not exists effects_gallery_preset_id_idx on public.effects_gallery(preset_id);

-- Auto-update updated_at
create or replace function public.update_effects_gallery_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists effects_gallery_updated_at on public.effects_gallery;
create trigger effects_gallery_updated_at
  before update on public.effects_gallery
  for each row
  execute function public.update_effects_gallery_updated_at();

-- Enable RLS
alter table public.effects_gallery enable row level security;

-- Drop existing policies if they exist
drop policy if exists effects_gallery_read_public on public.effects_gallery;
drop policy if exists effects_gallery_write_manager_admin on public.effects_gallery;

-- Public can SELECT only published content
create policy effects_gallery_read_public 
  on public.effects_gallery
  for select
  using (status = 'published' or public.has_role(auth.uid(), array['admin', 'manager']));

-- Managers and admins can INSERT/UPDATE/DELETE
create policy effects_gallery_write_manager_admin 
  on public.effects_gallery
  for all
  to authenticated
  using (public.has_role(auth.uid(), array['admin', 'manager']))
  with check (public.has_role(auth.uid(), array['admin', 'manager']));

commit;
