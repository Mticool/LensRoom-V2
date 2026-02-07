import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireRole, respondAuthError } from '@/lib/auth/requireRole';
import { isTempfileUrl } from '@/lib/server/media/persistExternalMedia';

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

function isStable(u: unknown): boolean {
  const s = String(u || '').trim();
  return !!s && !isTempfileUrl(s);
}

/**
 * POST /api/admin/gallery/republish-stable?placement=inspiration&dryRun=1&limit=200
 * Republish drafts that already have a stable preview URL (not tempfile).
 */
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
      .select('id,preset_id,content_type,status,published,placement,preview_url,preview_image,asset_url,poster_url')
      .limit(limit);

    if (placement) query = query.eq('placement', placement);

    // Only draft/unpublished rows.
    query = query.or('status.eq.draft,published.eq.false,status.is.null');

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows: EffectRow[] = Array.isArray(data) ? (data as any) : [];

    const summary = {
      scanned: rows.length,
      eligible: 0,
      republished: 0,
      skipped: 0,
      dryRun,
      details: [] as Array<{ id: string; preset_id: string | null; action: 'republished' | 'skipped'; notes: string[] }>,
    };

    for (const e of rows) {
      const notes: string[] = [];
      const contentType = String(e.content_type || '').toLowerCase();
      const isVideo = contentType === 'video';

      const hasStablePreview = isStable(e.preview_url) || isStable(e.preview_image);
      const hasStableVideoPosterOrPreview = isStable(e.poster_url) || hasStablePreview;
      const hasEnoughForPublic = isVideo ? hasStableVideoPosterOrPreview : hasStablePreview;

      if (!hasEnoughForPublic) {
        summary.skipped++;
        summary.details.push({ id: e.id, preset_id: e.preset_id, action: 'skipped', notes: ['no stable preview'] });
        continue;
      }

      summary.eligible++;

      if (dryRun) {
        summary.details.push({ id: e.id, preset_id: e.preset_id, action: 'republished', notes: ['would republish'] });
        continue;
      }

      const patch: any = { status: 'published', published: true };

      // If some leftover fields are tempfile, null them.
      for (const k of ['preview_url', 'preview_image', 'asset_url', 'poster_url'] as const) {
        const v = (e as any)[k];
        if (isTempfileUrl(v)) patch[k] = null;
      }

      const { error: updErr } = await supabase.from('effects_gallery').update(patch).eq('id', e.id);
      if (updErr) {
        notes.push(`update failed: ${updErr.message}`);
        summary.skipped++;
        summary.details.push({ id: e.id, preset_id: e.preset_id, action: 'skipped', notes });
        continue;
      }

      summary.republished++;
      summary.details.push({ id: e.id, preset_id: e.preset_id, action: 'republished', notes });
    }

    return NextResponse.json(summary);
  } catch (e: any) {
    console.error('[Gallery republish-stable] Error:', e);
    return respondAuthError(e);
  }
}

