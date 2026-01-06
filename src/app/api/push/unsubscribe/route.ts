import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth/requireRole';

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    let userId: string;
    try {
      const auth = await requireAuth();
      userId = auth.authUserId;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Delete subscription
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);

    if (error) {
      console.error('[Push] Failed to delete subscription:', error);
      return NextResponse.json(
        { error: 'Failed to delete subscription' },
        { status: 500 }
      );
    }

    console.log('[Push] Subscription removed for user:', userId);

    return NextResponse.json({
      success: true,
      message: 'Subscription removed',
    });
  } catch (error) {
    console.error('[Push] Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}







