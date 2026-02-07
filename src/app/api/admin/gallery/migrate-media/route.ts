import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireRole, respondAuthError } from '@/lib/auth/requireRole';
import { isTempfileUrl, persistExternalMediaToContentBucket } from '@/lib/server/media/persistExternalMedia';

type EffectRow = {
  id: string;
  preset_id: string | null;
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
    const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit') || '200')));

    let query = supabase
      .from('effects_gallery')
      .select('id,preset_id,status,published,placement,preview_url,preview_image,asset_url,poster_url')
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
      disabled: 0,
      skipped: 0,
      dryRun,
      details: [] as Array<{
        id: string;
        preset_id: string | null;
        action: 'updated' | 'disabled' | 'skipped';
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

      // If media is still missing/expired, disable this card to avoid breaking the public page.
      const remainingTempfile = [next.preview_url ?? e.preview_url, next.preview_image ?? e.preview_image, next.asset_url ?? e.asset_url, next.poster_url ?? e.poster_url]
        .some((u) => isTempfileUrl(u));

      const anyStable = [next.preview_url ?? e.preview_url, next.preview_image ?? e.preview_image, next.asset_url ?? e.asset_url, next.poster_url ?? e.poster_url]
        .some((u) => {
          const s = String(u || '').trim();
          return s && !isTempfileUrl(s);
        });

      if (!dryRun) {
        if (!anyStable || remainingTempfile) {
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
          summary.details.push({ id: e.id, preset_id: e.preset_id, action: 'disabled', notes: notes.length ? notes : ['disabled (no stable media)'] });
          continue;
        }

        // Apply URL updates when at least one field changed.
        const changed =
          (next.preview_url && next.preview_url !== e.preview_url) ||
          (next.preview_image && next.preview_image !== e.preview_image) ||
          (next.asset_url && next.asset_url !== e.asset_url) ||
          (next.poster_url && next.poster_url !== e.poster_url);

        if (changed) {
          const { error: updErr } = await supabase.from('effects_gallery').update(next as any).eq('id', e.id);
          if (updErr) {
            notes.push(`update failed: ${updErr.message}`);
            summary.skipped++;
            summary.details.push({ id: e.id, preset_id: e.preset_id, action: 'skipped', notes });
            continue;
          }
          summary.updated++;
          summary.details.push({ id: e.id, preset_id: e.preset_id, action: 'updated', notes });
        } else {
          summary.skipped++;
          summary.details.push({ id: e.id, preset_id: e.preset_id, action: 'skipped', notes: notes.length ? notes : ['no changes'] });
        }
      } else {
        // Dry run mode: just report what we would do.
        if (!anyStable || remainingTempfile) summary.details.push({ id: e.id, preset_id: e.preset_id, action: 'disabled', notes: notes.length ? notes : ['would disable'] });
        else summary.details.push({ id: e.id, preset_id: e.preset_id, action: 'updated', notes: notes.length ? notes : ['would update'] });
      }
    }

    return NextResponse.json(summary);
  } catch (e: any) {
    console.error('[Gallery migrate-media] Error:', e);
    return respondAuthError(e);
  }
}

