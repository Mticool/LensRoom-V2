import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireRole, respondAuthError } from '@/lib/auth/requireRole';

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin');
    
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    // Get applications first, then fetch profiles separately (no FK)
    let query = supabase
      .from('affiliate_applications')
      .select('*')
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
    
    // Fetch profiles for each application
    const userIds = [...new Set((data || []).map((a: any) => a.user_id).filter(Boolean))];
    
    let profilesMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('telegram_profiles')
        .select('auth_user_id, first_name, last_name, telegram_username')
        .in('auth_user_id', userIds);
      
      profilesMap = (profiles || []).reduce((acc: any, p: any) => {
        acc[p.auth_user_id] = p;
        return acc;
      }, {});
    }
    
    const applications = (data || []).map((a: any) => {
      const profile = profilesMap[a.user_id];
      return {
        ...a,
        profiles: profile ? {
          display_name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null,
          username: profile.telegram_username,
        } : null,
      };
    });
    
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

