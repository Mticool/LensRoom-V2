-- =====================================================
-- Security fixes (RLS + credits mapping)
-- Date: 2026-01-30
-- =====================================================

begin;

-- 1) Fix effects_gallery RLS: restrict write access to manager/admin only
alter table public.effects_gallery enable row level security;

drop policy if exists effects_gallery_all on public.effects_gallery;
drop policy if exists effects_gallery_select on public.effects_gallery;
drop policy if exists effects_gallery_read_public on public.effects_gallery;
drop policy if exists effects_gallery_write_manager_admin on public.effects_gallery;

create policy effects_gallery_read_public
  on public.effects_gallery
  for select
  using (status = 'published' or public.has_role(auth.uid(), array['admin','manager']));

create policy effects_gallery_write_manager_admin
  on public.effects_gallery
  for all
  to authenticated
  using (public.has_role(auth.uid(), array['admin','manager']))
  with check (public.has_role(auth.uid(), array['admin','manager']));

-- 2) Ensure generations RLS (users can view/update own generations)
alter table public.generations enable row level security;

drop policy if exists generations_select_own on public.generations;
create policy generations_select_own
  on public.generations
  for select
  using (auth.uid() = user_id);

drop policy if exists generations_insert_own on public.generations;
create policy generations_insert_own
  on public.generations
  for insert
  with check (auth.uid() = user_id);

drop policy if exists generations_update_own on public.generations;
create policy generations_update_own
  on public.generations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3) Fix credits mapping: move credits from telegram_profiles.id to auth_user_id
-- Only for rows where credits.user_id references a telegram_profiles.id
update public.credits c
set user_id = tp.auth_user_id
from public.telegram_profiles tp
where c.user_id = tp.id
  and tp.auth_user_id is not null;

-- Cleanup: drop any credits rows that still reference telegram_profiles (invalid FK)
delete from public.credits c
using public.telegram_profiles tp
where c.user_id = tp.id
  and tp.auth_user_id is null;

commit;

select '✅ Security fixes applied' as status;