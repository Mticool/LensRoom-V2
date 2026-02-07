import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireRole, respondAuthError } from "@/lib/auth/requireRole";
import { isTempfileUrl, persistExternalMediaToContentBucket } from '@/lib/server/media/persistExternalMedia';

// GET - Fetch all gallery effects
export async function GET(request: Request) {
  try {
    await requireRole("manager");

    const { searchParams } = new URL(request.url);
    const placement = searchParams.get('placement'); // 'home' | 'inspiration'
    const status = searchParams.get('status'); // 'draft' | 'published'
    const category = searchParams.get('category');

    // Fetch effects
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('effects_gallery')
      .select('*');
    
    if (placement) {
      query = query.eq('placement', placement);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }
    
    query = query.order('priority', { ascending: false })
                 .order('display_order', { ascending: true });

    const { data: effects, error } = await query;

    if (error) {
      console.error('Error fetching effects:', error);
      
      // Если таблица не существует
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Таблица effects_gallery не найдена. Выполните миграцию базы данных.',
          effects: []
        }, { status: 500 });
      }
      
      return NextResponse.json({ error: error.message, effects: [] }, { status: 500 });
    }

    return NextResponse.json({ effects: effects || [] });
  } catch (error: any) {
    console.error('Gallery API error:', error);
    
    // Если таблица не существует
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return NextResponse.json({ 
        error: 'Таблица effects_gallery не найдена. Выполните миграцию базы данных.',
        effects: []
      }, { status: 500 });
    }
    
    return respondAuthError(error);
  }
}

// POST - Create or update gallery effect
export async function POST(request: Request) {
  try {
    await requireRole("manager");
    const supabase = getSupabaseAdmin();

    const body = await request.json();
    const {
      id,
      presetId,
      title,
      contentType,
      modelKey,
      tileRatio,
      costStars,
      mode,
      variantId,
      previewImage,
      previewUrl,
      templatePrompt,
      featured,
      published,
      order,
      // New Content Constructor fields
      placement,
      status,
      category,
      priority,
      type,
      assetUrl,
      posterUrl,
      aspect,
      shortDescription,
    } = body;

    // Validate required fields
    if (!presetId || !title) {
      return NextResponse.json({ error: 'Missing required fields: presetId, title' }, { status: 400 });
    }

    // Persist expiring/temp external media to Supabase Storage for stability.
    // This prevents public galleries from breaking when tempfile.aiquickdraw.com links expire.
    const maybePersist = async (raw: any, kind: string): Promise<string | null> => {
      const url = String(raw || '').trim();
      if (!url) return null;
      if (!isTempfileUrl(url)) return url;
      const res = await persistExternalMediaToContentBucket({
        url,
        keyPrefix: `effects/${encodeURIComponent(String(presetId))}/${kind}`,
        maxBytes: kind === 'asset' ? 80 * 1024 * 1024 : 25 * 1024 * 1024,
        timeoutMs: 25_000,
      });
      if (res.ok) return res.publicUrl;
      // If we can't persist it (404), keep the original to avoid blocking save;
      // migration endpoint can later downgrade status to draft.
      console.warn('[Admin Gallery] Failed to persist media', { presetId, kind, url: url.slice(0, 120), ...res });
      return url;
    };

    const stablePreviewUrl = await maybePersist(previewUrl || previewImage, 'preview');
    const stablePreviewImage = await maybePersist(previewImage || previewUrl, 'preview_image');
    const stableAssetUrl = await maybePersist(assetUrl, 'asset');
    const stablePosterUrl = await maybePersist(posterUrl, 'poster');

    const effectData: any = {
      preset_id: presetId,
      title,
      content_type: contentType || 'photo',
      model_key: modelKey || 'nano-banana-pro',
      tile_ratio: tileRatio || '1:1',
      cost_stars: costStars || 0,
      mode: mode || 't2i',
      variant_id: variantId || 'default',
      preview_image: stablePreviewImage || '',
      preview_url: stablePreviewUrl || null,
      template_prompt: templatePrompt || '',
      featured: featured || false,
      // Keep legacy `published` in sync with new `status`
      published: (status || (published ? 'published' : 'draft')) === 'published',
      display_order: order || 0,
      updated_at: new Date().toISOString(),
      // New fields
      placement: placement || 'home',
      status: status || 'draft',
      category: category || null,
      priority: priority !== undefined ? priority : 0,
      type: type || (contentType === 'video' ? 'video' : 'image'),
      asset_url: stableAssetUrl || null,
      poster_url: stablePosterUrl || null,
      aspect: aspect || tileRatio || '1:1',
      short_description: shortDescription || null,
    };

    const isMissingColumnError = (err: any) => {
      const msg = typeof err?.message === 'string' ? err.message : '';
      return err?.code === '42703' || msg.includes('column') && msg.includes('does not exist');
    };

    const retryWithoutUnknownColumns = async (op: () => Promise<any>) => {
      try {
        return await op();
      } catch (err: any) {
        // If a column is missing (e.g. preview_url before migration), retry without optional fields.
        if (isMissingColumnError(err)) {
          const safeData = { ...effectData };
          delete safeData.preview_url;
          delete safeData.poster_url;
          delete safeData.asset_url;
          delete safeData.short_description;
          // Keep core fields + legacy preview_image for backward compatibility.
          if (id) {
            const { data, error } = await (supabase as any)
              .from('effects_gallery')
              .update(safeData)
              .eq('id', id)
              .select()
              .single();
            if (error) throw error;
            return data;
          }
          const { data, error } = await (supabase as any)
            .from('effects_gallery')
            .insert({ ...safeData, created_at: new Date().toISOString() })
            .select()
            .single();
          if (error) throw error;
          return data;
        }
        throw err;
      }
    };

    let result;
    
    if (id) {
      // Update existing
      result = await retryWithoutUnknownColumns(async () => {
        const { data, error } = await (supabase as any)
          .from('effects_gallery')
          .update(effectData)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      });
    } else {
      // Create new
      result = await retryWithoutUnknownColumns(async () => {
        const { data, error } = await (supabase as any)
          .from('effects_gallery')
          .insert({
            ...effectData,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      });
    }

    return NextResponse.json({ effect: result });
  } catch (error: any) {
    console.error('Gallery save error:', error);
    
    // Если ошибка связана с отсутствием таблицы или колонок
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return NextResponse.json({ 
        error: 'Таблица effects_gallery не найдена. Выполните миграцию базы данных.' 
      }, { status: 500 });
    }
    
    // Если ошибка связана с отсутствием колонки
    if (error?.code === '42703' || error?.message?.includes('column') && error?.message?.includes('does not exist')) {
      return NextResponse.json({ 
        error: 'Не хватает колонок в таблице. Выполните миграцию базы данных.' 
      }, { status: 500 });
    }
    
    return respondAuthError(error);
  }
}

// DELETE - Delete gallery effect
export async function DELETE(request: Request) {
  try {
    await requireRole("manager");
    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    const presetId = searchParams.get('presetId');

    if (!presetId) {
      return NextResponse.json({ error: 'Missing presetId' }, { status: 400 });
    }

    const { error } = await supabase
      .from('effects_gallery')
      .delete()
      .eq('preset_id', presetId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Gallery delete error:', error);
    return respondAuthError(error);
  }
}


