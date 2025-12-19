import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireRole, respondAuthError } from "@/lib/auth/requireRole";

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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ effects: effects || [] });
  } catch (error) {
    console.error('Gallery API error:', error);
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

    const effectData: any = {
      preset_id: presetId,
      title,
      content_type: contentType || 'photo',
      model_key: modelKey || 'nano-banana-pro',
      tile_ratio: tileRatio || '1:1',
      cost_stars: costStars || 0,
      mode: mode || 't2i',
      variant_id: variantId || 'default',
      preview_image: previewImage || '',
      preview_url: (previewUrl || previewImage || '') || null,
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
      asset_url: assetUrl || null,
      poster_url: posterUrl || null,
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


