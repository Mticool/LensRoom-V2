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

    const { subscription } = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Save or update push subscription
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh,
        auth: subscription.keys?.auth,
        expiration_time: subscription.expirationTime,
        user_agent: request.headers.get('user-agent') || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'endpoint',
      });

    if (error) {
      console.error('[Push] Failed to save subscription:', error);
      return NextResponse.json(
        { error: 'Failed to save subscription' },
        { status: 500 }
      );
    }

    console.log('[Push] Subscription saved for user:', userId);

    return NextResponse.json({
      success: true,
      message: 'Subscription saved',
    });
  } catch (error) {
    console.error('[Push] Subscribe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}







