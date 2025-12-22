import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST /api/affiliate/apply
 * 
 * Submit affiliate application (инфлюенсер)
 * Body: { channelUrl: string, followers?: number, proofText?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }
    
    const userId = session.profileId;
    const body = await request.json();
    const { channelUrl, followers, proofText } = body;
    
    if (!channelUrl || typeof channelUrl !== 'string') {
      return NextResponse.json(
        { error: 'Channel URL is required' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseAdmin();
    
    // Check if user already has a pending/approved application
    const { data: existing } = await supabase
      .from('affiliate_applications')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['pending', 'approved'])
      .single();
    
    if (existing) {
      return NextResponse.json(
        {
          error: `You already have a ${existing.status} application`,
          applicationId: existing.id,
        },
        { status: 400 }
      );
    }
    
    // Create application
    const { data, error } = await supabase
      .from('affiliate_applications')
      .insert({
        user_id: userId,
        channel_url: channelUrl,
        followers: followers || null,
        proof_text: proofText || null,
        status: 'pending',
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      application: data,
    });
    
  } catch (error) {
    console.error('[/api/affiliate/apply] Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/affiliate/apply
 * 
 * Get current user's affiliate application status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }
    
    const userId = session.telegramId;
    const supabase = getSupabaseAdmin();
    
    // Get latest application
    const { data } = await supabase
      .from('affiliate_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    return NextResponse.json({
      application: data || null,
    });
    
  } catch (error) {
    console.error('[/api/affiliate/apply] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to get application' },
      { status: 500 }
    );
  }
}

