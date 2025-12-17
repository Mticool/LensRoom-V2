import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendBulkMessages } from '@/lib/telegram/bot';
import { WaitlistType } from '@/types/telegram';

interface BroadcastBody {
  type: WaitlistType;
  message: string;
}

/**
 * POST /api/telegram/broadcast
 * Send broadcast message to all active subscribers of a waitlist type
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Check admin authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!session.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // 2. Parse body
    const body: BroadcastBody = await request.json();

    if (!body.type || !body.message) {
      return NextResponse.json(
        { error: 'Missing type or message' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 3. Get all active subscribers for this type
    const { data: subscribers, error } = await supabase
      .from('waitlist_subscriptions')
      .select(`
        id,
        profile_id,
        telegram_profiles!inner(telegram_id)
      `)
      .eq('type', body.type)
      .eq('status', 'active');

    if (error) {
      console.error('[Broadcast] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscribers' },
        { status: 500 }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({
        ok: true,
        sent: 0,
        failed: 0,
        total: 0,
        message: 'No active subscribers',
      });
    }

    // 4. Get telegram_ids and find bot links with chat_id
    const telegramIds = subscribers.map((s: any) => s.telegram_profiles.telegram_id);
    
    const { data: botLinks } = await supabase
      .from('telegram_bot_links')
      .select('telegram_id, chat_id, can_notify')
      .in('telegram_id', telegramIds)
      .eq('can_notify', true);

    if (!botLinks || botLinks.length === 0) {
      return NextResponse.json({
        ok: true,
        sent: 0,
        failed: 0,
        total: 0,
        message: 'No subscribers with notifications enabled',
      });
    }

    // 5. Prepare messages
    const messages = botLinks
      .filter((link: any) => link.chat_id)
      .map((link: any) => ({
        chat_id: link.chat_id,
        text: body.message,
      }));

    // 6. Send messages
    const result = await sendBulkMessages(messages);

    // 7. Update notified_at for sent messages
    const subscriberIds = subscribers.map((s: any) => s.id);
    await supabase
      .from('waitlist_subscriptions')
      .update({
        notified_at: new Date().toISOString(),
        status: 'notified',
      })
      .in('id', subscriberIds);

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      failed: result.failed,
      total: messages.length,
    });
  } catch (error) {
    console.error('[Broadcast] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/telegram/broadcast
 * Get broadcast stats (admin only)
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get stats by type
    const { data: stats } = await supabase
      .from('waitlist_subscriptions')
      .select('type, status')
      .eq('status', 'active');

    // Count by type
    const counts: Record<string, number> = {};
    stats?.forEach((s: any) => {
      counts[s.type] = (counts[s.type] || 0) + 1;
    });

    // Get total with notifications enabled
    const { count: canNotifyCount } = await supabase
      .from('telegram_bot_links')
      .select('*', { count: 'exact', head: true })
      .eq('can_notify', true);

    return NextResponse.json({
      byType: counts,
      totalCanNotify: canNotifyCount || 0,
    });
  } catch (error) {
    console.error('[Broadcast Stats] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



