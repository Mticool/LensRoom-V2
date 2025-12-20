import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/telegram/auth';

/**
 * GET /api/admin/affiliate/earnings
 * 
 * Get all affiliate earnings (pending/paid)
 * Query params: ?status=pending|paid|cancelled&affiliateUserId=xxx
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
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const affiliateUserId = searchParams.get('affiliateUserId');
    
    let query = supabase
      .from('affiliate_earnings')
      .select(`
        *,
        affiliate:profiles!affiliate_earnings_affiliate_user_id_fkey(display_name, username),
        referral:profiles!affiliate_earnings_referral_user_id_fkey(display_name, username)
      `)
      .order('created_at', { ascending: false });
    
    if (status && ['pending', 'paid', 'cancelled'].includes(status)) {
      query = query.eq('status', status);
    }
    
    if (affiliateUserId) {
      query = query.eq('affiliate_user_id', affiliateUserId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Get summary
    const { data: summary } = await supabase
      .from('affiliate_earnings_summary')
      .select('*')
      .order('total_commission_rub', { ascending: false });
    
    return NextResponse.json({
      earnings: data || [],
      summary: summary || [],
    });
    
  } catch (error) {
    console.error('[/api/admin/affiliate/earnings] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/affiliate/earnings
 * 
 * Mark commission as paid
 * Body: { earningId: string, notes?: string }
 */
export async function POST(request: NextRequest) {
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
    
    const body = await request.json();
    const { earningId, notes } = body;
    
    if (!earningId) {
      return NextResponse.json(
        { error: 'earningId is required' },
        { status: 400 }
      );
    }
    
    // Update earning status
    const { error: updateError } = await supabase
      .from('affiliate_earnings')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        paid_by: userId,
        notes: notes || null,
      })
      .eq('id', earningId)
      .eq('status', 'pending'); // Only update if pending
    
    if (updateError) throw updateError;
    
    return NextResponse.json({
      success: true,
      message: 'Commission marked as paid',
    });
    
  } catch (error) {
    console.error('[/api/admin/affiliate/earnings] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to update earning' },
      { status: 500 }
    );
  }
}
