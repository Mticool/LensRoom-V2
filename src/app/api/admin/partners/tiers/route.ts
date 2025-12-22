import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireRole, respondAuthError } from '@/lib/auth/requireRole';

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin');
    
    const supabase = getSupabaseAdmin();
    
    // Get all affiliate tiers
    const { data, error } = await supabase
      .from('affiliate_tiers')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('[API Partners Tiers] Error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ tiers: [] });
      }
      throw error;
    }
    
    // Fetch profiles separately
    const userIds = [...new Set((data || []).map((t: any) => t.user_id).filter(Boolean))];
    
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
    
    const tiers = (data || []).map((t: any) => {
      const profile = profilesMap[t.user_id];
      return {
        ...t,
        profiles: profile ? {
          display_name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null,
          username: profile.telegram_username,
        } : null,
      };
    });
    
    return NextResponse.json({ tiers });
    
  } catch (error) {
    console.error('[API Partners Tiers] Error:', error);
    return respondAuthError(error);
  }
}

