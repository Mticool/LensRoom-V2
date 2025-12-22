import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireRole, respondAuthError } from '@/lib/auth/requireRole';

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin');
    
    const supabase = getSupabaseAdmin();
    
    // Get all affiliate tiers with profile info
    const { data, error } = await supabase
      .from('affiliate_tiers')
      .select(`
        *,
        telegram_profiles!affiliate_tiers_user_id_fkey (
          first_name,
          last_name,
          telegram_username
        )
      `)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('[API Partners Tiers] Error:', error);
      // Если таблица не существует, вернуть пустой массив
      if (error.code === '42P01') {
        return NextResponse.json({ tiers: [] });
      }
      throw error;
    }
    
    // Форматируем данные для совместимости
    const tiers = (data || []).map((t: any) => ({
      ...t,
      profiles: t.telegram_profiles ? {
        display_name: [t.telegram_profiles.first_name, t.telegram_profiles.last_name].filter(Boolean).join(' ') || null,
        username: t.telegram_profiles.telegram_username,
      } : null,
    }));
    
    return NextResponse.json({ tiers });
    
  } catch (error) {
    console.error('[API Partners Tiers] Error:', error);
    return respondAuthError(error);
  }
}
