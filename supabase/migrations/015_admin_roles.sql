-- 015_admin_roles.sql
-- Minimal admin/manager/user roles + content-table RLS.
--
-- Goals:
-- - Do NOT rewrite existing policies on payments/generations/etc.
-- - Add a dedicated roles table (auth.users.id -> role).
-- - Provide a single helper function for RLS checks:
--     public.has_role(uid uuid, roles text[]) -> boolean
-- - Allow manager/admin to insert/update/delete content tables:
--     - public.effects_gallery (if exists)
--     - any table in public named inspiration* (if exists)
--
-- Safe/idempotent: only creates/updates objects owned by this migration.

begin;

-- 1) Roles table (source of truth)
create table if not exists public.user_roles (
  user_id uuid primary key,
  role text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_roles_role_chk') then
    alter table public.user_roles
      add constraint user_roles_role_chk
      check (role in ('user','manager','admin'));
  end if;
end $$;

-- 2) Role helper
create or replace function public.has_role(uid uuid, roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = uid
      and ur.role = any(roles)
  );
$$;

-- 3) Content table policies: manager/admin can write.
do $$
declare
  t record;
  table_name text;
begin
  -- effects_gallery
  if to_regclass('public.effects_gallery') is not null then
    execute 'alter table public.effects_gallery enable row level security;';
    execute 'drop policy if exists effects_gallery_write_manager_admin on public.effects_gallery;';
    execute 'create policy effects_gallery_write_manager_admin on public.effects_gallery
      for all to authenticated
      using (public.has_role(auth.uid(), array[''admin'',''manager'']))
      with check (public.has_role(auth.uid(), array[''admin'',''manager'']));';
  end if;

  -- Any inspiration* tables (if exist)
  for t in
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and table_name like 'inspiration%'
  loop
    table_name := t.table_name;
    execute format('alter table public.%I enable row level security;', table_name);

    -- One policy name per table to keep idempotency and avoid touching unrelated policies.
    execute format('drop policy if exists %I on public.%I;', table_name || '_write_manager_admin', table_name);

    execute format(
      'create policy %I on public.%I for all to authenticated using (public.has_role(auth.uid(), array[''admin'',''manager''])) with check (public.has_role(auth.uid(), array[''admin'',''manager'']));',
      table_name || '_write_manager_admin',
      table_name
    );
  end loop;
end $$;

commit;



