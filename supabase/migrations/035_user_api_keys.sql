-- 035_user_api_keys.sql
-- User API Keys (Midjourney, etc.)
-- Allows users to connect their own API keys for external services

begin;

-- Create user_api_keys table
create table if not exists public.user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service text not null check (service in ('midjourney', 'openai', 'anthropic', 'replicate')),
  api_key_encrypted text not null,
  api_key_last_4 text, -- Last 4 chars for display
  is_active boolean not null default true,
  settings jsonb default '{}', -- Service-specific settings
  usage_stats jsonb default '{}', -- Track usage
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  
  unique(user_id, service)
);

-- Create indexes
create index if not exists user_api_keys_user_id_idx on public.user_api_keys(user_id);
create index if not exists user_api_keys_service_idx on public.user_api_keys(service);
create index if not exists user_api_keys_is_active_idx on public.user_api_keys(is_active);

-- Auto-update updated_at
create or replace function public.update_user_api_keys_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_api_keys_updated_at on public.user_api_keys;
create trigger user_api_keys_updated_at
  before update on public.user_api_keys
  for each row
  execute function public.update_user_api_keys_updated_at();

-- Enable RLS
alter table public.user_api_keys enable row level security;

-- Policies: Users can only access their own API keys
create policy user_api_keys_select_own 
  on public.user_api_keys
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy user_api_keys_insert_own 
  on public.user_api_keys
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy user_api_keys_update_own 
  on public.user_api_keys
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy user_api_keys_delete_own 
  on public.user_api_keys
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Admin can view all keys (but not decrypt them)
create policy user_api_keys_admin_select 
  on public.user_api_keys
  for select
  to authenticated
  using (public.has_role(auth.uid(), array['admin']));

commit;
