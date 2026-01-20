-- Add params JSONB to generations table for storing model-specific settings
-- Date: 2026-01-20

begin;

alter table public.generations
  add column if not exists params jsonb not null default '{}'::jsonb;

comment on column public.generations.params is
  'Model-specific generation params (video/photo). Example: {\"mode\":\"i2v\",\"duration\":8,\"quality\":\"fast\",\"resolution\":\"1080p\",\"modelVariant\":\"kling-2.6\",\"audio\":true,\"soundPreset\":\"native-dialogues\"}';

commit;

