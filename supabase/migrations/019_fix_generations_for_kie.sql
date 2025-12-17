-- 019_fix_generations_for_kie.sql
-- Add missing columns for KIE integration and asset management

begin;

-- Add task_id for KIE integration (critical!)
alter table public.generations 
  add column if not exists task_id text;

-- Add asset_url for storing final Supabase Storage URLs
alter table public.generations 
  add column if not exists asset_url text;

-- Add preview/thumbnail for quick loading
alter table public.generations 
  add column if not exists preview_url text;

alter table public.generations 
  add column if not exists thumbnail_url text;

-- Add error column for failed generations
alter table public.generations 
  add column if not exists error text;

-- Add is_favorite for user bookmarks
alter table public.generations 
  add column if not exists is_favorite boolean not null default false;

-- Index for faster queries
create index if not exists idx_generations_task_id on public.generations(task_id);
create index if not exists idx_generations_user_status on public.generations(user_id, status);
create index if not exists idx_generations_user_created on public.generations(user_id, created_at desc);

commit;

