# Supabase Usage Report

Generated: 2026-02-06T10:41:03.148Z
Since (30d): 2026-01-07T10:40:05.503Z

## Summary

- Total tables (public schema via OpenAPI): 43
- Tables referenced in code: 37
- Tables NOT referenced in code: 6

## Not Referenced In Code

| table | rows | recent30 | ts_col | notes |
|---|---:|---:|---|---|
| users | 38 | 18 | created_at |  |
| audio_history | 4 | 4 | created_at |  |
| embeddings | 4 | 4 | created_at |  |
| academy_waitlist | 2 | 0 | created_at |  |
| support_tickets | 1 | 0 | created_at |  |
| referrals | 0 | 0 | created_at |  |

## Referenced In Code (Top 30 by row count)

| table | ops | rows | recent30 | ts_col |
|---|---|---:|---:|---|
| generations | delete,insert,select,update | 1114 | 523 | created_at |
| credit_transactions | insert,update | 523 | 302 | created_at |
| generation_runs | insert | 438 | 400 | created_at |
| telegram_notifications | insert | 203 |  |  |
| studio_threads | insert,select,update | 101 | 101 | created_at |
| tts_jobs | delete,insert,select,update | 36 | 36 | created_at |
| credits | insert,rpc,select,update,upsert | 33 | 18 | created_at |
| effects_gallery | delete,insert,select,update | 29 | 0 | created_at |
| telegram_profiles | insert,rpc,select,update,upsert | 29 | 16 | created_at |
| referral_codes | insert,select | 22 | 16 | created_at |
| telegram_bot_links | rpc,select,update | 16 | 0 | updated_at |
| voices | delete,insert,select | 16 | 16 | created_at |
| profiles | insert,select,update | 15 | 8 | created_at |
| inspiration_styles | delete,insert,select,update | 12 | 0 | created_at |
| generation_queue | insert,select | 10 | 0 | created_at |
| subscription_emails | select,update,upsert | 6 | 4 | created_at |
| promocodes | delete,insert,select,update | 4 | 0 | created_at |
| payments | insert,rpc,select,update | 3 | 0 | created_at |
| user_roles | delete,insert,select,upsert | 3 | 0 | created_at |
| user_voices | insert,select | 2 | 2 | created_at |
| affiliate_tiers | delete,insert,select,update,upsert | 1 | 1 | updated_at |
| articles | delete,insert,select,update | 1 | 0 | created_at |
| subscriptions | insert,select,update,upsert | 1 | 0 | created_at |
| telegram_user_settings | select,update,upsert | 1 | 1 | created_at |
| affiliate_applications | insert,select,update | 0 | 0 | created_at |
| affiliate_earnings | insert,select,update | 0 | 0 | created_at |
| affiliate_earnings_summary | select | 0 |  |  |
| promocode_usages | select | 0 | 0 | used_at |
| push_subscriptions | delete,select,upsert | 0 | 0 | created_at |
| referral_attributions | insert,select | 0 | 0 | created_at |

## RPC Functions Referenced In Code

- `add_credits` (1 files)
- `add_stars` (1 files)
- `adjust_credits` (2 files)
- `apply_promocode` (1 files)
- `claim_referral` (2 files)
- `credits_balance` (1 files)
- `deduct_credits` (1 files)
- `exec` (2 files)
- `get_quota_usage` (1 files)
- `has_role` (1 files)
- `increment_quota_usage` (1 files)
- `validate_promocode` (2 files)

## Per-Table Code References

This section is the ground truth for "drop requires code change" decisions.

### affiliate_applications

- ops: insert, select, update
- rows: 0
- recent30: 0
- files:
  - `src/app/api/admin/partners/route.ts`
  - `src/app/api/affiliate/apply/route.ts`

### affiliate_earnings

- ops: insert, select, update
- rows: 0
- recent30: 0
- files:
  - `src/app/api/admin/affiliate/earnings/route.ts`
  - `src/app/api/affiliate/earnings/me/route.ts`
  - `src/lib/referrals/process-affiliate-commission.ts`

### affiliate_earnings_summary

- ops: select
- rows: 0
- recent30: 
- files:
  - `src/app/api/admin/affiliate/earnings/route.ts`

### affiliate_tiers

- ops: delete, insert, select, update, upsert
- rows: 1
- recent30: 1
- files:
  - `src/app/api/admin/partners/manual/route.ts`
  - `src/app/api/admin/partners/remove/route.ts`
  - `src/app/api/admin/partners/route.ts`
  - `src/app/api/admin/partners/tiers/route.ts`
  - `src/app/api/admin/partners/update/route.ts`
  - `src/app/api/affiliate/earnings/me/route.ts`
  - `src/lib/referrals/process-affiliate-commission.ts`
  - `src/lib/referrals/referral-helper.ts`

### articles

- ops: delete, insert, select, update
- rows: 1
- recent30: 0
- files:
  - `src/app/api/admin/articles/[id]/route.ts`
  - `src/app/api/admin/articles/route.ts`
  - `src/app/blog/[slug]/page.tsx`
  - `src/app/blog/page.tsx`
  - `src/app/sitemap.ts`

### credit_transactions

- ops: insert, update
- rows: 523
- recent30: 302
- files:
  - `src/app/api/admin/credits/grant/route.ts`
  - `src/app/api/admin/grant-registration-bonus/route.ts`
  - `src/app/api/admin/subscription/grant/route.ts`
  - `src/app/api/audio/voices/clone/route.ts`
  - `src/app/api/cron/reset-subscription-stars/route.ts`
  - `src/app/api/generate/audio/route.ts`
  - `src/app/api/generate/batch/route.ts`
  - `src/app/api/generate/photo/route.ts`
  - `src/app/api/generate/products/route.ts`
  - `src/app/api/generate/video/route.ts`
  - `src/app/api/notifications/bonus/route.ts`
  - `src/app/api/notifications/check/route.ts`
  - `src/app/api/subscription/cancel/route.ts`
  - `src/app/api/webhooks/fal/route.ts`
  - `src/app/api/webhooks/payform/route.ts`
  - `src/app/api/webhooks/prodamus/route.ts`
  - `src/app/api/webhooks/robokassa-subscription/route.ts`
  - `src/app/api/webhooks/robokassa/route.ts`
  - `src/lib/credits/refund.ts`
  - `src/lib/kie/sync-task.ts`
  - `src/lib/quota/nano-banana-pro.ts`

### credits

- ops: insert, rpc, select, update, upsert
- rows: 33
- recent30: 18
- files:
  - `src/app/api/admin/broadcast/route.ts`
  - `src/app/api/admin/credits/grant/route.ts`
  - `src/app/api/admin/grant-registration-bonus/route.ts`
  - `src/app/api/admin/users/route.ts`
  - `src/app/api/admin/users/search/route.ts`
  - `src/app/api/auth/telegram/route.ts`
  - `src/app/api/auth/telegram/status/route.ts`
  - `src/app/api/generate/batch/route.ts`
  - `src/app/api/generate/products/route.ts`
  - `src/app/api/kie/createTask/route.ts`
  - `src/app/api/notifications/bonus/route.ts`
  - `src/app/api/notifications/check/route.ts`
  - `src/app/api/telegram/auth/route.ts`
  - `src/app/api/webhooks/prodamus/route.ts`
  - `src/app/api/webhooks/robokassa-subscription/route.ts`
  - `src/app/auth/callback/route.ts`
  - `src/lib/credits/refund.ts`
  - `src/lib/credits/split-credits.ts`
  - `src/lib/kie/sync-task.ts`
  - `src/lib/quota/nano-banana-pro.ts`
  - `src/lib/telegram/handlers/auth.ts`
  - `src/lib/telegram/menus/main-menu.ts`

### effects_gallery

- ops: delete, insert, select, update
- rows: 29
- recent30: 0
- files:
  - `src/app/api/admin/categories/route.ts`
  - `src/app/api/admin/gallery/route.ts`
  - `src/app/api/content/route.ts`

### generation_queue

- ops: insert, select
- rows: 10
- recent30: 0
- files:
  - `src/lib/queue/add-to-queue.ts`

### generation_runs

- ops: insert
- rows: 438
- recent30: 400
- files:
  - `src/app/api/generate/lipsync/route.ts`
  - `src/app/api/generate/photo/route.ts`
  - `src/app/api/generate/video/route.ts`
  - `src/lib/quota/nano-banana-pro.ts`

### generations

- ops: delete, insert, select, update
- rows: 1114
- recent30: 523
- files:
  - `scripts/backfill-previews.js`
  - `scripts/previews-rebuild.js`
  - `scripts/previews-worker.js`
  - `src/app/api/admin/analytics/funnel/route.ts`
  - `src/app/api/admin/analytics/generations/route.ts`
  - `src/app/api/admin/broadcast/route.ts`
  - `src/app/api/admin/laozhang-stats/route.ts`
  - `src/app/api/cron/cleanup-stuck-generations/route.ts`
  - `src/app/api/generate/audio/route.ts`
  - `src/app/api/generate/batch/route.ts`
  - `src/app/api/generate/lipsync/route.ts`
  - `src/app/api/generate/photo/route.ts`
  - `src/app/api/generate/products/route.ts`
  - `src/app/api/generate/video/route.ts`
  - `src/app/api/generations/[id]/download/route.ts`
  - `src/app/api/generations/[id]/route.ts`
  - `src/app/api/generations/route.ts`
  - `src/app/api/health/route.ts`
  - `src/app/api/jobs/[jobId]/route.ts`
  - `src/app/api/kie/createTask/route.ts`
  - `src/app/api/kie/sync-manual/route.ts`
  - `src/app/api/library/route.ts`
  - `src/app/api/previews/requeue/route.ts`
  - `src/app/api/upload/voice-assets/route.ts`
  - `src/app/api/video/status/route.ts`
  - `src/app/api/webhooks/fal/route.ts`
  - `src/app/api/webhooks/kie/route.ts`
  - `src/app/api/webhooks/veo/route.ts`
  - `src/lib/credits/refund.ts`
  - `src/lib/kie/sync-task.ts`
  - `src/lib/previews/index.ts`
  - `src/lib/referrals/track-first-generation.ts`
  - `src/lib/supabase/upload-reference.ts`

### inspiration_styles

- ops: delete, insert, select, update
- rows: 12
- recent30: 0
- files:
  - `scripts/apply-migration.mjs`
  - `src/app/api/admin/styles/route.ts`
  - `src/app/api/styles/route.ts`

### payments

- ops: insert, rpc, select, update
- rows: 3
- recent30: 0
- files:
  - `src/app/api/admin/analytics/funnel/route.ts`
  - `src/app/api/admin/broadcast/route.ts`
  - `src/app/api/admin/overview/route.ts`
  - `src/app/api/admin/payments/route.ts`
  - `src/app/api/checkout/route.ts`
  - `src/app/api/payments/create/route.ts`
  - `src/app/api/webhooks/payform/route.ts`
  - `src/app/api/webhooks/prodamus/route.ts`
  - `src/app/api/webhooks/robokassa-subscription/route.ts`
  - `src/app/api/webhooks/robokassa/route.ts`
  - `src/lib/referrals/process-affiliate-commission.ts`

### profiles

- ops: insert, select, update
- rows: 15
- recent30: 8
- files:
  - `src/app/api/admin/grant-registration-bonus/route.ts`
  - `src/app/api/admin/managers/route.ts`
  - `src/app/api/admin/overview/route.ts`
  - `src/app/api/admin/payments/route.ts`
  - `src/app/api/checkout/route.ts`
  - `src/app/api/webhooks/payform/route.ts`
  - `src/app/api/webhooks/prodamus/route.ts`
  - `src/app/api/webhooks/robokassa-subscription/route.ts`
  - `src/app/api/webhooks/robokassa/route.ts`
  - `src/lib/supabase/ensure-profile.ts`

### promocode_usages

- ops: select
- rows: 0
- recent30: 0
- files:
  - `src/app/api/admin/promocodes/[id]/route.ts`

### promocodes

- ops: delete, insert, select, update
- rows: 4
- recent30: 0
- files:
  - `src/app/api/admin/promocodes/[id]/route.ts`
  - `src/app/api/admin/promocodes/route.ts`
  - `src/app/api/promocodes/validate/route.ts`

### push_subscriptions

- ops: delete, select, upsert
- rows: 0
- recent30: 0
- files:
  - `src/app/api/push/subscribe/route.ts`
  - `src/app/api/push/unsubscribe/route.ts`
  - `src/lib/push/send-push.ts`

### referral_attributions

- ops: insert, select
- rows: 0
- recent30: 0
- files:
  - `src/app/api/referrals/health/route.ts`
  - `src/app/api/referrals/invites/route.ts`
  - `src/app/api/referrals/me/route.ts`
  - `src/lib/referrals/referral-helper.ts`

### referral_codes

- ops: insert, select
- rows: 22
- recent30: 16
- files:
  - `src/app/api/referrals/health/route.ts`
  - `src/app/api/referrals/me/route.ts`
  - `src/lib/referrals/referral-helper.ts`

### referral_events

- ops: insert, select
- rows: 0
- recent30: 0
- files:
  - `src/app/api/referrals/health/route.ts`
  - `src/lib/referrals/referral-helper.ts`

### referral_rewards

- ops: insert, rpc, select
- rows: 0
- recent30: 0
- files:
  - `src/lib/referrals/referral-helper.ts`

### studio_threads

- ops: insert, select, update
- rows: 101
- recent30: 101
- files:
  - `src/app/api/generate/audio/route.ts`
  - `src/app/api/generate/photo/route.ts`
  - `src/app/api/generate/video/route.ts`
  - `src/app/api/studio/threads/route.ts`

### subscription_emails

- ops: select, update, upsert
- rows: 6
- recent30: 4
- files:
  - `src/app/api/checkout/route.ts`
  - `src/app/api/webhooks/robokassa-subscription/route.ts`

### subscriptions

- ops: insert, select, update, upsert
- rows: 1
- recent30: 0
- files:
  - `src/app/api/admin/payments/route.ts`
  - `src/app/api/admin/subscription/grant/route.ts`
  - `src/app/api/cron/reset-subscription-stars/route.ts`
  - `src/app/api/subscription/cancel/route.ts`
  - `src/app/api/subscription/current/route.ts`
  - `src/app/api/subscription/status/route.ts`
  - `src/app/api/webhooks/payform/route.ts`
  - `src/app/api/webhooks/prodamus/route.ts`
  - `src/app/api/webhooks/robokassa-subscription/route.ts`
  - `src/lib/quota/nano-banana-pro.ts`

### telegram_bot_links

- ops: rpc, select, update
- rows: 16
- recent30: 0
- files:
  - `src/app/api/admin/broadcast/route.ts`
  - `src/app/api/admin/stats/route.ts`
  - `src/app/api/auth/session/route.ts`
  - `src/app/api/auth/telegram/route.ts`
  - `src/app/api/auth/telegram/status/route.ts`
  - `src/app/api/notifications/bonus/route.ts`
  - `src/app/api/notifications/check/route.ts`
  - `src/app/api/telegram/broadcast/route.ts`
  - `src/app/api/waitlist/subscribe/route.ts`

### telegram_favorites

- ops: delete, insert, select
- rows: 0
- recent30: 0
- files:
  - `src/lib/telegram/state/user-state.ts`

### telegram_login_codes

- ops: delete, insert, select, update, upsert
- rows: 0
- recent30: 0
- files:
  - `src/app/api/auth/telegram/init/route.ts`
  - `src/app/api/auth/telegram/status/route.ts`
  - `src/lib/telegram/handlers/auth.ts`

### telegram_notifications

- ops: insert
- rows: 203
- recent30: 
- files:
  - `src/lib/telegram/notify.ts`

### telegram_profiles

- ops: insert, rpc, select, update, upsert
- rows: 29
- recent30: 16
- files:
  - `src/app/api/admin/affiliate/earnings/route.ts`
  - `src/app/api/admin/analytics/funnel/route.ts`
  - `src/app/api/admin/analytics/generations/route.ts`
  - `src/app/api/admin/articles/[id]/route.ts`
  - `src/app/api/admin/articles/route.ts`
  - `src/app/api/admin/broadcast/route.ts`
  - `src/app/api/admin/credits/grant/route.ts`
  - `src/app/api/admin/partners/manual/route.ts`
  - `src/app/api/admin/partners/remove/route.ts`
  - `src/app/api/admin/partners/route.ts`
  - `src/app/api/admin/partners/tiers/route.ts`
  - `src/app/api/admin/partners/update/route.ts`
  - `src/app/api/admin/promocodes/[id]/route.ts`
  - `src/app/api/admin/promocodes/route.ts`
  - `src/app/api/admin/referrals/overview/route.ts`
  - `src/app/api/admin/stats/route.ts`
  - `src/app/api/admin/subscription/grant/route.ts`
  - `src/app/api/admin/users/search/route.ts`
  - `src/app/api/affiliate/earnings/me/route.ts`
  - `src/app/api/auth/session/route.ts`
  - `src/app/api/auth/telegram/route.ts`
  - `src/app/api/auth/telegram/status/route.ts`
  - `src/app/api/dev/impersonate/route.ts`
  - `src/app/api/generations/[id]/route.ts`
  - `src/app/api/promocodes/apply/route.ts`
  - `src/app/api/promocodes/validate/route.ts`
  - `src/app/api/referrals/invites/route.ts`
  - `src/app/api/subscription/current/route.ts`
  - `src/app/api/telegram/auth/route.ts`
  - `src/app/api/webhooks/robokassa-subscription/route.ts`
  - `src/app/api/webhooks/robokassa/route.ts`
  - `src/lib/auth/requireRole.ts`
  - `src/lib/kie/sync-task.ts`
  - `src/lib/telegram/auth.ts`
  - `src/lib/telegram/flows/photo-generation.ts`
  - `src/lib/telegram/flows/video-generation.ts`
  - `src/lib/telegram/handlers/auth.ts`
  - `src/lib/telegram/menus/balance-menu.ts`
  - `src/lib/telegram/menus/main-menu.ts`
  - `src/lib/telegram/notify.ts`

### telegram_user_settings

- ops: select, update, upsert
- rows: 1
- recent30: 1
- files:
  - `src/lib/telegram/flows/photo-generation.ts`
  - `src/lib/telegram/flows/video-generation.ts`
  - `src/lib/telegram/notify.ts`
  - `src/lib/telegram/state/user-state.ts`

### tts_jobs

- ops: delete, insert, select, update
- rows: 36
- recent30: 36
- files:
  - `src/app/api/tts/audio/[jobId]/route.ts`
  - `src/app/api/tts/generate-audio/route.ts`
  - `src/app/api/tts/history/route.ts`
  - `src/app/api/tts/regenerate-audio/route.ts`

### user_api_keys

- ops: delete, select, update, upsert
- rows: 0
- recent30: 0
- files:
  - `src/app/profile/api-keys/page.tsx`

### user_quota_usage

- ops: select, upsert
- rows: 0
- recent30: 0
- files:
  - `src/lib/quota/nano-banana-pro.ts`

### user_roles

- ops: delete, insert, select, upsert
- rows: 3
- recent30: 0
- files:
  - `src/app/api/admin/managers/route.ts`
  - `src/app/api/admin/users/role/route.ts`
  - `src/app/api/admin/users/route.ts`
  - `src/lib/auth/requireRole.ts`

### user_voices

- ops: insert, select
- rows: 2
- recent30: 2
- files:
  - `src/app/api/audio/voices/clone/route.ts`
  - `src/app/api/audio/voices/route.ts`

### voices

- ops: delete, insert, select
- rows: 16
- recent30: 16
- files:
  - `src/app/api/tts/clone-voice/route.ts`
  - `src/app/api/tts/generate-audio/route.ts`
  - `src/app/api/tts/system-voices/route.ts`
  - `src/app/api/tts/voices/[voiceId]/route.ts`
  - `src/app/api/tts/voices/route.ts`

### waitlist_subscriptions

- ops: select, update, upsert
- rows: 0
- recent30: 0
- files:
  - `src/app/api/admin/stats/route.ts`
  - `src/app/api/admin/waitlist/route.ts`
  - `src/app/api/telegram/broadcast/route.ts`
  - `src/app/api/waitlist/subscribe/route.ts`
