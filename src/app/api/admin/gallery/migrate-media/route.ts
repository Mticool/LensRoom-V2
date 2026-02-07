import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireRole, respondAuthError } from '@/lib/auth/requireRole';
import { isTempfileUrl, persistExternalMediaToContentBucket } from '@/lib/server/media/persistExternalMedia';

type EffectRow = {
  id: string;
  preset_id: string | null;
  content_type?: string | null;
  status?: string | null;
  published?: boolean | null;
  placement?: string | null;
  preview_url?: string | null;
  preview_image?: string | null;
  asset_url?: string | null;
  poster_url?: string | null;
};

function hasAnyTempfile(e: EffectRow): boolean {
  return [e.preview_url, e.preview_image, e.asset_url, e.poster_url].some((u) => isTempfileUrl(u));
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('manager');
    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(req.url);
    const placement = searchParams.get('placement'); // optional
    const dryRun = searchParams.get('dryRun') === '1';
    const republish = searchParams.get('republish') === '1';
    const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit') || '200')));

    let query = supabase
      .from('effects_gallery')
      .select('id,preset_id,content_type,status,published,placement,preview_url,preview_image,asset_url,poster_url')
      .limit(limit);

    if (placement) query = query.eq('placement', placement);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const effects: EffectRow[] = Array.isArray(data) ? (data as any) : [];
    const targets = effects.filter(hasAnyTempfile);

    const summary = {
      scanned: effects.length,
      targets: targets.length,
      updated: 0,
      republished: 0,
      disabled: 0,
      skipped: 0,
      dryRun,
      republish,
      details: [] as Array<{
        id: string;
        preset_id: string | null;
        action: 'updated' | 'disabled' | 'skipped' | 'republished';
        notes: string[];
      }>,
    };

    for (const e of targets) {
      const notes: string[] = [];
      const presetId = String(e.preset_id || e.id);

      const persist = async (url: string | null | undefined, kind: string): Promise<string | null> => {
        const u = String(url || '').trim();
        if (!u) return null;
        if (!isTempfileUrl(u)) return u;
        const res = await persistExternalMediaToContentBucket({
          url: u,
          keyPrefix: `effects/${encodeURIComponent(presetId)}/migrate/${kind}`,
          maxBytes: kind === 'asset' ? 80 * 1024 * 1024 : 25 * 1024 * 1024,
          timeoutMs: 25_000,
        });
        if (res.ok) return res.publicUrl;
        notes.push(`${kind}: persist failed (${res.reason}${res.status ? `/${res.status}` : ''})`);
        return null;
      };

      // Attempt to replace each tempfile URL with stable content-bucket URL.
      const next: Partial<EffectRow> = {};
      const nextPreviewUrl = await persist(e.preview_url, 'preview_url');
      const nextPreviewImage = await persist(e.preview_image, 'preview_image');
      const nextAssetUrl = await persist(e.asset_url, 'asset');
      const nextPosterUrl = await persist(e.poster_url, 'poster');

      if (nextPreviewUrl) next.preview_url = nextPreviewUrl;
      if (nextPreviewImage) next.preview_image = nextPreviewImage;
      if (nextAssetUrl) next.asset_url = nextAssetUrl;
      if (nextPosterUrl) next.poster_url = nextPosterUrl;

      const isStable = (u: unknown): boolean => {
        const s = String(u || '').trim();
        return !!s && !isTempfileUrl(s);
      };

      const contentType = String((e as any).content_type || '').toLowerCase();
      const isVideo = contentType === 'video';

      const previewUrlFinal = next.preview_url ?? e.preview_url;
      const previewImageFinal = next.preview_image ?? e.preview_image;
      const posterUrlFinal = next.poster_url ?? e.poster_url;
      const assetUrlFinal = next.asset_url ?? e.asset_url;

      // Public pages only need a stable preview (and preferably poster for video).
      // Do NOT disable a card just because some secondary URL is expiring.
      const hasStablePreview = isStable(previewUrlFinal) || isStable(previewImageFinal);
      const hasStableVideoPosterOrPreview = isStable(posterUrlFinal) || hasStablePreview;
      const hasEnoughForPublic = isVideo ? hasStableVideoPosterOrPreview : hasStablePreview;

      if (!dryRun) {
        if (!hasEnoughForPublic) {
          // Downgrade to draft so it won't show publicly.
          const patch: any = { status: 'draft', published: false };
          // Keep any successfully persisted URLs.
          for (const k of ['preview_url', 'preview_image', 'asset_url', 'poster_url'] as const) {
            if ((next as any)[k]) patch[k] = (next as any)[k];
          }
          const { error: updErr } = await supabase.from('effects_gallery').update(patch).eq('id', e.id);
          if (updErr) {
            notes.push(`update failed: ${updErr.message}`);
            summary.skipped++;
            summary.details.push({ id: e.id, preset_id: e.preset_id, action: 'skipped', notes });
            continue;
          }
          summary.disabled++;
          summary.details.push({ id: e.id, preset_id: e.preset_id, action: 'disabled', notes: notes.length ? notes : ['disabled (no stable preview)'] });
          continue;
        }

        // If some remaining fields are still tempfile, null them out to avoid broken loads.
        const patch: any = { ...next };
        const remaining = {
          preview_url: previewUrlFinal,
          preview_image: previewImageFinal,
          asset_url: assetUrlFinal,
          poster_url: posterUrlFinal,
        } as const;

        for (const k of Object.keys(remaining) as Array<keyof typeof remaining>) {
          const v = remaining[k];
          if (isTempfileUrl(v)) patch[k] = null;
        }

        const wantsRepublish = republish && String(e.status || '').toLowerCase() !== 'published';
        if (wantsRepublish) {
          patch.status = 'published';
          patch.published = true;
        }

        // Apply patch only when something changed.
        const changedKeys = Object.keys(patch).filter((k) => (patch as any)[k] !== (e as any)[k]);
        if (!changedKeys.length) {
          summary.skipped++;
          summary.details.push({ id: e.id, preset_id: e.preset_id, action: 'skipped', notes: notes.length ? notes : ['no changes'] });
          continue;
        }

        const { error: updErr } = await supabase.from('effects_gallery').update(patch).eq('id', e.id);
        if (updErr) {
          notes.push(`update failed: ${updErr.message}`);
          summary.skipped++;
          summary.details.push({ id: e.id, preset_id: e.preset_id, action: 'skipped', notes });
          continue;
        }

        if (wantsRepublish) {
          summary.republished++;
          summary.details.push({ id: e.id, preset_id: e.preset_id, action: 'republished', notes });
        } else {
          summary.updated++;
          summary.details.push({ id: e.id, preset_id: e.preset_id, action: 'updated', notes });
        }
      } else {
        // Dry run mode: just report what we would do.
        if (!hasEnoughForPublic) {
          summary.details.push({ id: e.id, preset_id: e.preset_id, action: 'disabled', notes: notes.length ? notes : ['would disable'] });
        } else if (republish && String(e.status || '').toLowerCase() !== 'published') {
          summary.details.push({ id: e.id, preset_id: e.preset_id, action: 'republished', notes: notes.length ? notes : ['would republish'] });
        } else {
          summary.details.push({ id: e.id, preset_id: e.preset_id, action: 'updated', notes: notes.length ? notes : ['would update'] });
        }
      }
    }

    return NextResponse.json(summary);
  } catch (e: any) {
    console.error('[Gallery migrate-media] Error:', e);
    return respondAuthError(e);
  }
}
