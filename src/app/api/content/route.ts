import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// Public endpoint - fetch published content for frontend
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const placement = searchParams.get('placement'); // 'home' | 'inspiration'
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = getSupabaseAdmin();
    
    let query = supabase
      .from('effects_gallery')
      .select('*');
    
    // Filter by status (default: published for public access)
    const status = searchParams.get('status');
    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.eq('status', 'published');
    }
    
    if (placement) {
      query = query.eq('placement', placement);
    }
    if (category) {
      query = query.eq('category', category);
    }
    
    query = query
      .order('priority', { ascending: false })
      .order('display_order', { ascending: true })
      .limit(limit);

    const { data, error } = await query;

    // Debug logging
    console.log('[Content API] Query params:', { placement, category, limit });
    console.log('[Content API] Result:', { 
      dataCount: data?.length || 0, 
      hasError: !!error,
      errorDetails: error 
    });

    if (error) {
      console.error('[Content API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { 
        effects: data || [],
        content: data || [],
        count: data?.length || 0,
      },
      {
        headers: {
          // Cache published content for 5 minutes
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('[Content API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

