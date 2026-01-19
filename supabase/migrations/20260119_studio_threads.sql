-- Studio workspaces (threads) for /create/studio
-- Date: 2026-01-19

-- 1) Threads table (per user + model)
create table if not exists public.studio_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  model_id text not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_studio_threads_user_model_created_at
  on public.studio_threads(user_id, model_id, created_at desc);

comment on table public.studio_threads is 'Studio chat/workspace threads per user and model.';
comment on column public.studio_threads.model_id is 'Photo model id from config (e.g. nano-banana-pro, seedream-4.5).';

-- 2) Add thread_id to generations
alter table public.generations
  add column if not exists thread_id uuid;

create index if not exists idx_generations_user_thread_created_at
  on public.generations(user_id, thread_id, created_at desc);

-- 3) FK from generations to studio_threads (optional)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'generations_thread_id_fkey'
  ) then
    alter table public.generations
      add constraint generations_thread_id_fkey
      foreign key (thread_id) references public.studio_threads(id)
      on delete set null;
  end if;
end $$;

comment on column public.generations.thread_id is 'Optional studio workspace/thread id for grouping generations.';
