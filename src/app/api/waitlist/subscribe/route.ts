import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { WaitlistType } from '@/types/telegram';

interface SubscribeBody {
  type: WaitlistType;
  source?: string;
}

const VALID_TYPES: WaitlistType[] = [
  'academy',
  'feature_video_ads',
  'feature_lifestyle',
  'feature_ab_covers',
  'feature_infographics',
];

/**
 * POST /api/waitlist/subscribe
 * Subscribe current user to a waitlist
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login first.' },
        { status: 401 }
      );
    }

    // 2. Parse and validate body
    const body: SubscribeBody = await request.json();
    
    if (!body.type || !VALID_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid subscription type' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 3. Upsert subscription
    const { error: subscribeError } = await supabase
      .from('waitlist_subscriptions')
      .upsert(
        {
          profile_id: session.profileId,
          type: body.type,
          source: body.source || null,
          status: 'active',
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'profile_id,type',
        }
      );

    if (subscribeError) {
      console.error('[Waitlist] Subscribe error:', subscribeError);
      return NextResponse.json(
        { error: 'Failed to subscribe' },
        { status: 500 }
      );
    }

    // 4. Check if user can receive notifications
    const { data: botLink } = await supabase
      .from('telegram_bot_links')
      .select('can_notify')
      .eq('telegram_id', session.telegramId)
      .single();

    const canNotify = botLink?.can_notify || false;

    return NextResponse.json({
      ok: true,
      canNotify,
      message: canNotify 
        ? 'Подписка оформлена! Мы напишем вам в Telegram.'
        : 'Подписка оформлена! Подключите бота для уведомлений.',
    });
  } catch (error) {
    console.error('[Waitlist] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/waitlist/subscribe
 * Unsubscribe from a waitlist
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as WaitlistType;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid subscription type' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('waitlist_subscriptions')
      .update({ status: 'cancelled' })
      .eq('profile_id', session.profileId)
      .eq('type', type);

    if (error) {
      console.error('[Waitlist] Unsubscribe error:', error);
      return NextResponse.json(
        { error: 'Failed to unsubscribe' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Waitlist] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/waitlist/subscribe
 * Get current user's subscriptions
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ subscriptions: [] });
    }

    const supabase = getSupabaseAdmin();

    const { data: subscriptions } = await supabase
      .from('waitlist_subscriptions')
      .select('type, status, created_at')
      .eq('profile_id', session.profileId)
      .eq('status', 'active');

    return NextResponse.json({
      subscriptions: subscriptions || [],
    });
  } catch (error) {
    console.error('[Waitlist] Error:', error);
    return NextResponse.json({ subscriptions: [] });
  }
}



