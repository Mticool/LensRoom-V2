import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/telegram/auth';

/**
 * POST /api/admin/partners/remove
 * 
 * Remove user from affiliate partners (returns to regular referral program with stars)
 * Body: { userId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const adminId = session.profileId;
    
    const supabase = getSupabaseAdmin();
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', adminId)
      .single();
    
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }
    
    // Delete affiliate tier (returns user to regular referral program)
    const { error: deleteError } = await supabase
      .from('affiliate_tiers')
      .delete()
      .eq('user_id', userId);
    
    if (deleteError) throw deleteError;
    
    return NextResponse.json({
      success: true,
      message: 'Partner removed. User returned to regular referral program (stars)',
    });
    
  } catch (error) {
    console.error('[/api/admin/partners/remove] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to remove partner' },
      { status: 500 }
    );
  }
}
