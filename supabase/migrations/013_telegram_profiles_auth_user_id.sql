-- Add fast mapping from telegram_profiles -> auth.users.id
-- This removes the need to call auth.admin.listUsers() on every request.

alter table public.telegram_profiles
  add column if not exists auth_user_id uuid;

-- Optional: enforce one-to-one mapping
create unique index if not exists telegram_profiles_auth_user_id_uq
  on public.telegram_profiles(auth_user_id)
  where auth_user_id is not null;

-- Backfill existing users by matching auth.users.user_metadata.telegram_id
-- NOTE: telegram_profiles.telegram_id is bigint/int; auth metadata is string/number.
update public.telegram_profiles tp
set auth_user_id = au.id
from auth.users au
where tp.auth_user_id is null
  and (au.raw_user_meta_data->>'telegram_id') is not null
  and (au.raw_user_meta_data->>'telegram_id')::bigint = tp.telegram_id;

-- Best-effort: if you also store telegram_id under user_metadata (not raw_user_meta_data), try that too.
update public.telegram_profiles tp
set auth_user_id = au.id
from auth.users au
where tp.auth_user_id is null
  and (au.user_metadata->>'telegram_id') is not null
  and (au.user_metadata->>'telegram_id')::bigint = tp.telegram_id;



