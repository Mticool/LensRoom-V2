# Supabase Cleanup Report (LensRoom)

Date: 2026-02-06

This repo can read/write rows via `SUPABASE_SERVICE_ROLE_KEY`, but it cannot execute DDL (e.g. `DROP TABLE`) without direct Postgres access (Dashboard SQL Editor, DB connection string, or Supabase CLI login).

## Inventory

The full table inventory is saved here:

`/Users/maratsagimov/Desktop/LensRoom.V2/lensroom-v2/docs/supabase-table-inventory.json`

Summary:
- Total tables: 43 (before cleanup)
- Tables referenced in this repo code: 37
- Tables not referenced in this repo code: 6
- Used+has data: 24
- Used+empty: 13
- Not used+has data: 5
- Not used+empty: 1

Post-cleanup:
- Total tables: 38 (after dropping 5 legacy tables)

## Tables Not Referenced In Repo Code

Not used in code, but contain rows:
- `academy_waitlist` (2 rows, last activity older than 30 days)
- `support_tickets` (1 row, last activity older than 30 days)
- `embeddings` (4 rows, active in last 30 days)
- `audio_history` (4 rows, active in last 30 days)
- `users` (38 rows, active in last 30 days)

Not used in code, empty:
- `referrals` (0 rows)

Important:
- `users`, `embeddings`, `audio_history` have recent writes, so something outside this repo (trigger, edge function, older deployed code) is writing them. Dropping them without locating the writer can break production.

## Backups Created (Before Any Drops)

Backups were written locally to:

`/Users/maratsagimov/Desktop/LensRoom.V2/lensroom-v2/docs/_supabase_backups/2026-02-06T10-23-37Z`

Includes:
- `academy_waitlist.json`
- `support_tickets.json`
- `referrals.json`
- `users.json`
- `embeddings.json`
- `audio_history.json`
- `_meta.json`

## Recommendation

Safe to drop first (low risk, no recent writes, not referenced in repo):
- `referrals` (empty)
- `academy_waitlist` (old data only)
- `support_tickets` (old data only)
- `embeddings` (legacy, not referenced in repo)
- `audio_history` (legacy, not referenced in repo)

Do NOT drop yet (recent writes, unknown writer):
- `users`
- `embeddings`
- `audio_history`

Update (2026-02-06):
- `embeddings` and `audio_history` are not referenced anywhere in `src/` or `scripts/` in this repo.
- Their recent rows look like legacy Fal/Qwen experiments and are safe to drop after backup.
- `users` is the only risky one: it matches `auth.users` 1:1 by `id` and count, so it's likely maintained by a DB trigger.
  Dropping `public.users` without removing that trigger can break new user creation.

## What I Need To Finish Cleanup

To actually remove tables (DDL) I need one of:
- Supabase Dashboard SQL Editor access to run a prepared SQL script, or
- Direct Postgres connection string/password, or
- Supabase CLI login via `SUPABASE_ACCESS_TOKEN`.

Also needed:
- Confirmation which product areas you want to keep (some tables are empty but are referenced in code for “future/optional” features: affiliates, promocodes, push, waitlist, etc.). If you want to remove those features, we should delete both the tables and the code paths.

## Prepared SQL (Ready To Run)

Prepared migration file:

`/Users/maratsagimov/Desktop/LensRoom.V2/lensroom-v2/supabase/migrations/20260206_drop_legacy_unused_tables.sql`

## Cleanup Applied (2026-02-06)

Dropped from production:
- `academy_waitlist`
- `support_tickets`
- `referrals`
- `embeddings`
- `audio_history`

Intentionally kept:
- `public.users` (appears to mirror `auth.users`; likely maintained by a trigger)
