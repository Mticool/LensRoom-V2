import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/telegram/auth';

/**
 * GET /api/admin/partners/tiers
 * 
 * List all active affiliate partners
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.profileId;
    
    const supabase = getSupabaseAdmin();
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get all affiliate tiers with profile info
    const { data, error } = await supabase
      .from('affiliate_tiers')
      .select(`
        *,
        profiles!affiliate_tiers_user_id_fkey (
          display_name,
          username
        )
      `)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    return NextResponse.json({ tiers: data || [] });
    
  } catch (error) {
    console.error('[/api/admin/partners/tiers] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partners' },
      { status: 500 }
    );
  }
}
