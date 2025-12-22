-- 023_effects_gallery_preview_url.sql
-- Add preview_url column and backfill from preview_image

begin;

alter table public.effects_gallery
  add column if not exists preview_url text;

-- Backfill preview_url from existing preview_image
update public.effects_gallery
set preview_url = preview_image
where (preview_url is null or preview_url = '')
  and preview_image is not null
  and preview_image <> '';

commit;

