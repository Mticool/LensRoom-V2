import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/telegram/auth';

/**
 * POST /api/admin/partners/manual
 * 
 * Manually add a user as affiliate partner (without application)
 * Body: { userId: string, tier: 'classic'|'pro', percent: number }
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
    const { userId, tier, percent } = body;
    
    if (!userId || !percent) {
      return NextResponse.json(
        { error: 'userId and percent are required' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Create/update affiliate tier
    const tierValue = tier || (percent >= 50 ? 'pro' : 'classic');
    
    const { error: tierError } = await supabase
      .from('affiliate_tiers')
      .upsert({
        user_id: userId,
        tier: tierValue,
        percent: percent,
        updated_at: new Date().toISOString(),
      });
    
    if (tierError) throw tierError;
    
    return NextResponse.json({
      success: true,
      message: `User added as ${tierValue} partner with ${percent}% commission`,
    });
    
  } catch (error) {
    console.error('[/api/admin/partners/manual] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to add partner' },
      { status: 500 }
    );
  }
}

