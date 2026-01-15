import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Admin endpoint to manually grant 50⭐ registration bonus
 * POST /api/admin/grant-registration-bonus
 * Body: { telegram_username: "username" } or { user_id: "uuid" }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    
    // Check admin auth
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    // Get target user
    const body = await req.json();
    const { telegram_username, user_id } = body;

    if (!telegram_username && !user_id) {
      return NextResponse.json({ 
        error: 'Missing telegram_username or user_id' 
      }, { status: 400 });
    }

    // Find user
    let targetUserId = user_id;
    
    if (!targetUserId && telegram_username) {
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('id, telegram_username')
        .ilike('telegram_username', telegram_username)
        .single();
      
      if (!targetProfile) {
        return NextResponse.json({ 
          error: `User not found: ${telegram_username}` 
        }, { status: 404 });
      }
      
      targetUserId = targetProfile.id;
    }

    // Check current balance
    const { data: existingCredits } = await supabase
      .from('credits')
      .select('package_stars, subscription_stars, amount')
      .eq('user_id', targetUserId)
      .maybeSingle();

    const currentTotal = existingCredits 
      ? (existingCredits.package_stars || 0) + (existingCredits.subscription_stars || 0) + (existingCredits.amount || 0)
      : 0;

    // Grant 50⭐ bonus
    const BONUS = 50;
    
    const { error: upsertError } = await supabase
      .from('credits')
      .upsert({
        user_id: targetUserId,
        amount: (existingCredits?.amount || 0) + BONUS,
        subscription_stars: existingCredits?.subscription_stars || 0,
        package_stars: existingCredits?.package_stars || 0,
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('[Admin Grant Bonus] Error:', upsertError);
      return NextResponse.json({ 
        error: 'Failed to grant bonus',
        details: upsertError.message 
      }, { status: 500 });
    }

    // Create transaction record
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: targetUserId,
        amount: BONUS,
        type: 'grant',
        description: `Manual registration bonus by admin ${authUser.id}`,
      });

    return NextResponse.json({
      success: true,
      user_id: targetUserId,
      telegram_username,
      bonus_granted: BONUS,
      previous_balance: currentTotal,
      new_balance: currentTotal + BONUS,
      message: `✅ Granted ${BONUS}⭐ to ${telegram_username || targetUserId}`,
    });

  } catch (error: any) {
    console.error('[Admin Grant Bonus] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
