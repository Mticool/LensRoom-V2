import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireRole, respondAuthError } from "@/lib/auth/requireRole";

// GET - Fetch all gallery effects
export async function GET() {
  try {
    await requireRole("manager");

    // Fetch effects
    const supabaseQuery = getSupabaseAdmin();
    const { data: effects, error } = await supabaseQuery
      .from('effects_gallery')
      .select('*')
      .order('display_order', { ascending: true });

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
      templatePrompt,
      featured,
      published,
      order,
    } = body;

    // Validate required fields
    if (!presetId || !title || !contentType || !modelKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const effectData = {
      preset_id: presetId,
      title,
      content_type: contentType,
      model_key: modelKey,
      tile_ratio: tileRatio || '1:1',
      cost_stars: costStars || 0,
      mode: mode || 't2i',
      variant_id: variantId || 'default',
      preview_image: previewImage || '',
      template_prompt: templatePrompt || '',
      featured: featured || false,
      published: published || false,
      display_order: order || 0,
      updated_at: new Date().toISOString(),
    };

    let result;
    
    if (id) {
      // Update existing
      const { data, error } = await (supabase as any)
        .from('effects_gallery')
        .update(effectData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new
      const { data, error } = await (supabase as any)
        .from('effects_gallery')
        .insert({
          ...effectData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
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


