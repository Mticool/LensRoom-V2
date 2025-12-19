-- 022_extend_effects_gallery_content.sql
-- Extend effects_gallery to support Content Constructor (Home + Inspiration placement)

begin;

-- Create table if not exists (in case it was never created)
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
  template_prompt text,
  featured boolean not null default false,
  published boolean not null default false,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add new columns for Content Constructor
alter table public.effects_gallery add column if not exists placement text check (placement in ('home', 'inspiration')) default 'home';
alter table public.effects_gallery add column if not exists status text check (status in ('draft', 'published')) default 'draft';
alter table public.effects_gallery add column if not exists category text;
alter table public.effects_gallery add column if not exists priority int default 0;
alter table public.effects_gallery add column if not exists type text check (type in ('image', 'video'));
alter table public.effects_gallery add column if not exists asset_url text;
alter table public.effects_gallery add column if not exists poster_url text;
alter table public.effects_gallery add column if not exists aspect text check (aspect in ('1:1', '9:16', '16:9'));
alter table public.effects_gallery add column if not exists short_description text;

-- Migrate existing data: published=true -> status='published', published=false -> status='draft'
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

-- Create indexes for new columns
create index if not exists effects_gallery_placement_idx on public.effects_gallery(placement);
create index if not exists effects_gallery_status_idx on public.effects_gallery(status);
create index if not exists effects_gallery_category_idx on public.effects_gallery(category);
create index if not exists effects_gallery_priority_idx on public.effects_gallery(priority);

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
