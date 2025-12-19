-- 018_telegram_bot_features.sql
-- Telegram bot settings + idempotent notifications + academy waitlist + support tickets.
-- Server-only writes (service role). No client direct access.

begin;

create extension if not exists pgcrypto;

-- 1) User notification settings
create table if not exists public.telegram_user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  telegram_id bigint,
  notify_enabled boolean not null default true,
  notify_success boolean not null default true,
  notify_error boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.telegram_user_settings enable row level security;

-- 2) Idempotency for bot notifications
create table if not exists public.telegram_notifications (
  id bigserial primary key,
  generation_id uuid not null,
  user_id uuid not null,
  telegram_id bigint not null,
  event text not null, -- 'success'|'failed'
  sent_at timestamptz not null default now(),
  unique (generation_id, event)
);

alter table public.telegram_notifications enable row level security;

-- 3) Academy waitlist
create table if not exists public.academy_waitlist (
  id bigserial primary key,
  user_id uuid,
  telegram_id bigint,
  interest text,
  note text,
  created_at timestamptz not null default now()
);

alter table public.academy_waitlist enable row level security;

-- 4) Support tickets
create table if not exists public.support_tickets (
  id bigserial primary key,
  user_id uuid,
  telegram_id bigint,
  topic text,
  generation_id uuid,
  message text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

commit;


