import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/telegram/auth';

/**
 * GET /api/admin/partners
 * 
 * List all affiliate applications
 * Query params: ?status=pending|approved|rejected
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
    
    let query = supabase
      .from('affiliate_applications')
      .select(`
        *,
        profiles!affiliate_applications_user_id_fkey (
          display_name,
          username
        )
      `)
      .order('created_at', { ascending: false });
    
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return NextResponse.json({ applications: data || [] });
    
  } catch (error) {
    console.error('[/api/admin/partners] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/partners
 * 
 * Approve/reject affiliate application and set tier
 * Body: { applicationId: string, action: 'approve'|'reject', tier?: 'classic'|'pro', percent?: number }
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
    const { applicationId, action, tier, percent } = body;
    
    if (!applicationId || !action) {
      return NextResponse.json(
        { error: 'applicationId and action are required' },
        { status: 400 }
      );
    }
    
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be approve or reject' },
        { status: 400 }
      );
    }
    
    // Get application
    const { data: app, error: appError } = await supabase
      .from('affiliate_applications')
      .select('*')
      .eq('id', applicationId)
      .single();
    
    if (appError || !app) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }
    
    // Update application status
    const { error: updateError } = await supabase
      .from('affiliate_applications')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);
    
    if (updateError) throw updateError;
    
    // If approved, create/update affiliate tier
    if (action === 'approve') {
      const tierValue = tier || 'classic';
      const percentValue = percent || (tierValue === 'pro' ? 50 : 30);
      
      const { error: tierError } = await supabase
        .from('affiliate_tiers')
        .upsert({
          user_id: app.user_id,
          tier: tierValue,
          percent: percentValue,
          updated_at: new Date().toISOString(),
        });
      
      if (tierError) throw tierError;
    }
    
    return NextResponse.json({
      success: true,
      message: `Application ${action}d successfully`,
    });
    
  } catch (error) {
    console.error('[/api/admin/partners] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}
