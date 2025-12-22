import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// Debug endpoint - check content without RLS
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    // Check if table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('effects_gallery')
      .select('count')
      .limit(1);
    
    // Get all rows (bypassing RLS with admin client)
    const { data: allRows, error: allError } = await supabase
      .from('effects_gallery')
      .select('*');
    
    // Get published rows
    const { data: publishedRows, error: publishedError } = await supabase
      .from('effects_gallery')
      .select('*')
      .eq('status', 'published');
    
    // Get home rows
    const { data: homeRows, error: homeError } = await supabase
      .from('effects_gallery')
      .select('*')
      .eq('status', 'published')
      .eq('placement', 'home');
    
    return NextResponse.json({
      debug: true,
      timestamp: new Date().toISOString(),
      tableExists: !tableError,
      tableError: tableError?.message,
      allRows: {
        count: allRows?.length || 0,
        error: allError?.message,
        sample: allRows?.[0] || null,
      },
      publishedRows: {
        count: publishedRows?.length || 0,
        error: publishedError?.message,
        rows: publishedRows,
      },
      homeRows: {
        count: homeRows?.length || 0,
        error: homeError?.message,
        rows: homeRows,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Debug endpoint error',
      message: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

