import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { deductCredits } from '@/lib/credits/split-credits';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { request_id, status, output, error } = body;

    if (!request_id) {
      return NextResponse.json({ error: 'Missing request_id' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Find generation by fal_request_id
    const { data: generation, error: fetchError } = await supabase
      .from('generations')
      .select('*')
      .eq('fal_request_id', request_id)
      .single();

    if (fetchError || !generation) {
      console.error('[Fal Webhook] Generation not found:', request_id);
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    if (status === 'COMPLETED') {
      const audioUrl = output?.audio?.url;
      const durationSec = Math.ceil(output?.duration_seconds || 0);
      
      if (!audioUrl) {
        await supabase.from('generations').update({
          status: 'failed',
          error: 'No audio URL in response',
        }).eq('id', generation.id);
        
        return NextResponse.json({ success: true });
      }

      // Deduct credits: 1 sec = 1 star
      const starsToDeduct = durationSec;
      
      await deductCredits(supabase, generation.user_id, starsToDeduct);
      
      // Update generation
      await supabase.from('generations').update({
        status: 'success',
        result_url: audioUrl,
        duration_sec: durationSec,
        actual_stars_spent: starsToDeduct,
        completed_at: new Date().toISOString(),
      }).eq('id', generation.id);

      // Record transaction
      await supabase.from('credit_transactions').insert({
        user_id: generation.user_id,
        amount: -starsToDeduct,
        type: 'deduction',
        description: 'Генерация речи: ElevenLabs V3',
        generation_id: generation.id,
      });

      console.log('[Fal Webhook] Success:', { request_id, durationSec, starsToDeduct });

    } else if (status === 'FAILED') {
      await supabase.from('generations').update({
        status: 'failed',
        error: error || 'Generation failed',
        completed_at: new Date().toISOString(),
      }).eq('id', generation.id);

      console.log('[Fal Webhook] Failed:', { request_id, error });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('[Fal Webhook Error]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
