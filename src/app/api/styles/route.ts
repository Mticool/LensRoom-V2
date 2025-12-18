import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// Public styles endpoint (published only)
// placement query:
// - home -> placement in ('homepage','both')
// - inspiration -> placement in ('inspiration','both')
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const placement = (searchParams.get('placement') || '').toLowerCase();
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 50)));

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('inspiration_styles')
      .select('*')
      .eq('published', true)
      .order('featured', { ascending: false })
      .order('display_order', { ascending: true })
      .limit(limit);

    if (placement === 'home') {
      query = query.in('placement', ['homepage', 'both']);
    } else if (placement === 'inspiration') {
      query = query.in('placement', ['inspiration', 'both']);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Styles API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { styles: data || [], count: (data || []).length },
      {
        headers: {
          // small cache; admin will want changes to appear fast
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (e: any) {
    console.error('[Styles API] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
