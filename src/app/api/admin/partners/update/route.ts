import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/telegram/auth';

/**
 * POST /api/admin/partners/update
 * 
 * Update affiliate partner tier/percent
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
    
    // Check if partner exists
    const { data: existing, error: existingError } = await supabase
      .from('affiliate_tiers')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (existingError || !existing) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }
    
    // Update affiliate tier
    const tierValue = tier || (percent >= 50 ? 'pro' : 'classic');
    
    const { error: updateError } = await supabase
      .from('affiliate_tiers')
      .update({
        tier: tierValue,
        percent: percent,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    
    if (updateError) throw updateError;
    
    return NextResponse.json({
      success: true,
      message: `Partner updated: ${tierValue} with ${percent}% commission`,
    });
    
  } catch (error) {
    console.error('[/api/admin/partners/update] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to update partner' },
      { status: 500 }
    );
  }
}

