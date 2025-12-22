import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireRole, respondAuthError } from '@/lib/auth/requireRole';

export async function GET(request: NextRequest) {
  try {
    const { authUserId } = await requireRole('admin');
    
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const affiliateUserId = searchParams.get('affiliateUserId');
    
    let query = supabase
      .from('affiliate_earnings')
      .select(`
        *,
        affiliate:telegram_profiles!affiliate_earnings_affiliate_user_id_fkey(first_name, last_name, telegram_username),
        referral:telegram_profiles!affiliate_earnings_referral_user_id_fkey(first_name, last_name, telegram_username)
      `)
      .order('created_at', { ascending: false });
    
    if (status && ['pending', 'paid', 'cancelled'].includes(status)) {
      query = query.eq('status', status);
    }
    
    if (affiliateUserId) {
      query = query.eq('affiliate_user_id', affiliateUserId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[API Earnings] Error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ earnings: [], summary: [] });
      }
      throw error;
    }
    
    // Форматируем данные
    const earnings = (data || []).map((e: any) => ({
      ...e,
      affiliate: e.affiliate ? {
        display_name: [e.affiliate.first_name, e.affiliate.last_name].filter(Boolean).join(' ') || null,
        username: e.affiliate.telegram_username,
      } : null,
      referral: e.referral ? {
        display_name: [e.referral.first_name, e.referral.last_name].filter(Boolean).join(' ') || null,
        username: e.referral.telegram_username,
      } : null,
    }));
    
    // Get summary (может не существовать)
    let summary: any[] = [];
    try {
      const { data: summaryData } = await supabase
        .from('affiliate_earnings_summary')
        .select('*')
        .order('total_commission_rub', { ascending: false });
      summary = summaryData || [];
    } catch {
      // view может не существовать
    }
    
    return NextResponse.json({ earnings, summary });
    
  } catch (error) {
    console.error('[API Earnings] Error:', error);
    return respondAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authUserId } = await requireRole('admin');
    
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { earningId, notes } = body;
    
    if (!earningId) {
      return NextResponse.json({ error: 'earningId is required' }, { status: 400 });
    }
    
    const { error: updateError } = await supabase
      .from('affiliate_earnings')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        paid_by: authUserId,
        notes: notes || null,
      })
      .eq('id', earningId)
      .eq('status', 'pending');
    
    if (updateError) throw updateError;
    
    return NextResponse.json({ success: true, message: 'Commission marked as paid' });
    
  } catch (error) {
    console.error('[API Earnings] Error:', error);
    return respondAuthError(error);
  }
}
