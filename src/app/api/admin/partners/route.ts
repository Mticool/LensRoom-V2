import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireRole, respondAuthError } from '@/lib/auth/requireRole';

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin');
    
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    let query = supabase
      .from('affiliate_applications')
      .select(`
        *,
        telegram_profiles!affiliate_applications_user_id_fkey (
          first_name,
          last_name,
          telegram_username
        )
      `)
      .order('created_at', { ascending: false });
    
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[API Partners] Error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ applications: [] });
      }
      throw error;
    }
    
    const applications = (data || []).map((a: any) => ({
      ...a,
      profiles: a.telegram_profiles ? {
        display_name: [a.telegram_profiles.first_name, a.telegram_profiles.last_name].filter(Boolean).join(' ') || null,
        username: a.telegram_profiles.telegram_username,
      } : null,
    }));
    
    return NextResponse.json({ applications });
    
  } catch (error) {
    console.error('[API Partners] Error:', error);
    return respondAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole('admin');
    
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { applicationId, action, tier, percent } = body;
    
    if (!applicationId || !action) {
      return NextResponse.json({ error: 'applicationId and action are required' }, { status: 400 });
    }
    
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
    }
    
    const { data: app, error: appError } = await supabase
      .from('affiliate_applications')
      .select('*')
      .eq('id', applicationId)
      .single();
    
    if (appError || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }
    
    const { error: updateError } = await supabase
      .from('affiliate_applications')
      .update({ status: action === 'approve' ? 'approved' : 'rejected', updated_at: new Date().toISOString() })
      .eq('id', applicationId);
    
    if (updateError) throw updateError;
    
    if (action === 'approve') {
      const tierValue = tier || 'classic';
      const percentValue = percent || (tierValue === 'pro' ? 50 : 30);
      
      await supabase.from('affiliate_tiers').upsert({
        user_id: app.user_id,
        tier: tierValue,
        percent: percentValue,
        updated_at: new Date().toISOString(),
      });
    }
    
    return NextResponse.json({ success: true, message: `Application ${action}d successfully` });
    
  } catch (error) {
    console.error('[API Partners] Error:', error);
    return respondAuthError(error);
  }
}
