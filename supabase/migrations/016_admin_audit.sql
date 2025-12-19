-- 016_admin_audit.sql
-- Admin audit log for privileged actions (e.g. role changes).
-- Defensive/idempotent.

begin;

create extension if not exists pgcrypto;

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  target_user_id uuid not null,
  action text not null,
  old_role text null,
  new_role text null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

-- Optional constraints
DO $$
begin
  if not exists (select 1 from pg_constraint where conname = 'admin_audit_action_chk') then
    alter table public.admin_audit_log
      add constraint admin_audit_action_chk
      check (action in ('role_change'));
  end if;
end $$;

-- Policies: only admins can read/write (based on public.has_role(uid, roles[]))
DO $$
begin
  execute 'drop policy if exists admin_audit_select_admin on public.admin_audit_log;';
  execute 'drop policy if exists admin_audit_insert_admin on public.admin_audit_log;';

  execute 'create policy admin_audit_select_admin on public.admin_audit_log
    for select to authenticated
    using (public.has_role(auth.uid(), array[''admin'']));';

  execute 'create policy admin_audit_insert_admin on public.admin_audit_log
    for insert to authenticated
    with check (public.has_role(auth.uid(), array[''admin'']));';
end $$;

commit;


