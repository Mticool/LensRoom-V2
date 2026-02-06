-- 2026-02-06 Drop legacy/unused tables (cleanup)
--
-- This repo does NOT reference these tables anywhere in src/ (no .from('...') hits).
-- Backups were taken locally under docs/_supabase_backups/ before preparing this migration.
--
-- Apply via Supabase Dashboard -> SQL Editor (or psql).
--
-- NOTE: `public.users` is intentionally NOT dropped here, because it appears to be kept
-- in sync with `auth.users` (same ids/count). Dropping it without removing the sync trigger
-- can break signups. See docs/SUPABASE_CLEANUP_REPORT.md for details.

begin;

-- Not referenced in code, empty
drop table if exists public.referrals cascade;

-- Not referenced in code, stale/legacy
drop table if exists public.academy_waitlist cascade;
drop table if exists public.support_tickets cascade;

-- Not referenced in code, legacy Qwen/Fal experiments
drop table if exists public.audio_history cascade;
drop table if exists public.embeddings cascade;

commit;

