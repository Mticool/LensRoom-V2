import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendBulkMessages } from "@/lib/telegram/bot";

export const dynamic = "force-dynamic";

// Segment definitions
type Segment =
  | "all"
  | "no_generation"
  | "no_purchase"
  | "inactive_7d"
  | "inactive_30d"
  | "paid_once"
  | "paid_multiple"
  | "low_balance";

interface BroadcastBody {
  segment: Segment;
  message: string;
  testMode?: boolean; // Send only to admin for testing
}

/**
 * GET /api/admin/broadcast
 * Get segment statistics
 */
export async function GET() {
  try {
    await requireRole("admin");

    const supabase = getSupabaseAdmin();

    // Get all users with bot links
    const { data: botLinks } = await supabase
      .from("telegram_bot_links")
      .select("telegram_id, can_notify, chat_id")
      .eq("can_notify", true)
      .not("chat_id", "is", null);

    const notifiableTelegramIds = new Set(botLinks?.map((b: any) => b.telegram_id) || []);
    const totalCanNotify = notifiableTelegramIds.size;

    // Get all telegram profiles
    const { data: profiles } = await supabase
      .from("telegram_profiles")
      .select("telegram_id, auth_user_id, created_at, last_login_at");

    if (!profiles) {
      return NextResponse.json({ segments: {}, totalCanNotify: 0 });
    }

    // Map telegram_id to auth_user_id
    const telegramToAuth = new Map<number, string>();
    profiles.forEach((p: any) => {
      if (p.auth_user_id) {
        telegramToAuth.set(p.telegram_id, p.auth_user_id);
      }
    });

    // Get generations per user
    const { data: generations } = await supabase
      .from("generations")
      .select("profile_id")
      .eq("status", "success");

    const usersWithGen = new Set(generations?.map((g: any) => g.profile_id) || []);

    // Get payments per user
    const { data: payments } = await supabase
      .from("payments")
      .select("profile_id")
      .eq("status", "completed");

    const paymentCounts: Record<string, number> = {};
    payments?.forEach((p: any) => {
      paymentCounts[p.profile_id] = (paymentCounts[p.profile_id] || 0) + 1;
    });

    // Get credits
    const { data: credits } = await supabase.from("credits").select("profile_id, balance");

    const userBalances: Record<string, number> = {};
    credits?.forEach((c: any) => {
      userBalances[c.profile_id] = c.balance || 0;
    });

    // Calculate segments
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const segments: Record<Segment, { total: number; canNotify: number }> = {
      all: { total: 0, canNotify: 0 },
      no_generation: { total: 0, canNotify: 0 },
      no_purchase: { total: 0, canNotify: 0 },
      inactive_7d: { total: 0, canNotify: 0 },
      inactive_30d: { total: 0, canNotify: 0 },
      paid_once: { total: 0, canNotify: 0 },
      paid_multiple: { total: 0, canNotify: 0 },
      low_balance: { total: 0, canNotify: 0 },
    };

    profiles.forEach((p: any) => {
      const tgId = p.telegram_id;
      const authId = p.auth_user_id;
      const canNotify = notifiableTelegramIds.has(tgId);
      const lastLogin = p.last_login_at ? new Date(p.last_login_at) : new Date(p.created_at);

      // All users
      segments.all.total++;
      if (canNotify) segments.all.canNotify++;

      // No generation
      if (authId && !usersWithGen.has(authId)) {
        segments.no_generation.total++;
        if (canNotify) segments.no_generation.canNotify++;
      }

      // No purchase
      if (authId && !paymentCounts[authId]) {
        segments.no_purchase.total++;
        if (canNotify) segments.no_purchase.canNotify++;
      }

      // Inactive 7d
      if (lastLogin < sevenDaysAgo) {
        segments.inactive_7d.total++;
        if (canNotify) segments.inactive_7d.canNotify++;
      }

      // Inactive 30d
      if (lastLogin < thirtyDaysAgo) {
        segments.inactive_30d.total++;
        if (canNotify) segments.inactive_30d.canNotify++;
      }

      // Paid once
      if (authId && paymentCounts[authId] === 1) {
        segments.paid_once.total++;
        if (canNotify) segments.paid_once.canNotify++;
      }

      // Paid multiple
      if (authId && paymentCounts[authId] && paymentCounts[authId] >= 2) {
        segments.paid_multiple.total++;
        if (canNotify) segments.paid_multiple.canNotify++;
      }

      // Low balance (< 10 stars)
      if (authId && (userBalances[authId] || 0) < 10) {
        segments.low_balance.total++;
        if (canNotify) segments.low_balance.canNotify++;
      }
    });

    return NextResponse.json({
      segments,
      totalCanNotify,
      totalUsers: profiles.length,
    });
  } catch (error: any) {
    console.error("[Admin Broadcast] GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}

/**
 * POST /api/admin/broadcast
 * Send broadcast to a segment
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");

    const body: BroadcastBody = await request.json();

    if (!body.segment || !body.message?.trim()) {
      return NextResponse.json({ error: "Missing segment or message" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get all profiles
    const { data: profiles } = await supabase
      .from("telegram_profiles")
      .select("telegram_id, auth_user_id, created_at, last_login_at");

    if (!profiles?.length) {
      return NextResponse.json({ sent: 0, failed: 0, message: "No users found" });
    }

    // Get bot links
    const { data: botLinks } = await supabase
      .from("telegram_bot_links")
      .select("telegram_id, chat_id, can_notify")
      .eq("can_notify", true)
      .not("chat_id", "is", null);

    const chatIdMap = new Map<number, number>();
    botLinks?.forEach((b: any) => {
      chatIdMap.set(b.telegram_id, b.chat_id);
    });

    // Get segment data
    const { data: generations } = await supabase
      .from("generations")
      .select("profile_id")
      .eq("status", "success");

    const usersWithGen = new Set(generations?.map((g: any) => g.profile_id) || []);

    const { data: payments } = await supabase
      .from("payments")
      .select("profile_id")
      .eq("status", "completed");

    const paymentCounts: Record<string, number> = {};
    payments?.forEach((p: any) => {
      paymentCounts[p.profile_id] = (paymentCounts[p.profile_id] || 0) + 1;
    });

    const { data: credits } = await supabase.from("credits").select("profile_id, balance");

    const userBalances: Record<string, number> = {};
    credits?.forEach((c: any) => {
      userBalances[c.profile_id] = c.balance || 0;
    });

    // Filter by segment
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const targetTelegramIds: number[] = [];

    profiles.forEach((p: any) => {
      const tgId = p.telegram_id;
      const authId = p.auth_user_id;
      const lastLogin = p.last_login_at ? new Date(p.last_login_at) : new Date(p.created_at);

      // Check if can send
      if (!chatIdMap.has(tgId)) return;

      let matches = false;

      switch (body.segment) {
        case "all":
          matches = true;
          break;
        case "no_generation":
          matches = !!authId && !usersWithGen.has(authId);
          break;
        case "no_purchase":
          matches = !!authId && !paymentCounts[authId];
          break;
        case "inactive_7d":
          matches = lastLogin < sevenDaysAgo;
          break;
        case "inactive_30d":
          matches = lastLogin < thirtyDaysAgo;
          break;
        case "paid_once":
          matches = !!authId && paymentCounts[authId] === 1;
          break;
        case "paid_multiple":
          matches = !!authId && paymentCounts[authId] >= 2;
          break;
        case "low_balance":
          matches = !!authId && (userBalances[authId] || 0) < 10;
          break;
      }

      if (matches) {
        targetTelegramIds.push(tgId);
      }
    });

    if (targetTelegramIds.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, message: "No users in segment" });
    }

    // Test mode - send only to first user (admin)
    const idsToSend = body.testMode ? targetTelegramIds.slice(0, 1) : targetTelegramIds;

    // Prepare messages
    const messages = idsToSend.map((tgId) => ({
      chat_id: chatIdMap.get(tgId)!,
      text: body.message,
    }));

    // Send
    const result = await sendBulkMessages(messages);

    // Log broadcast
    await supabase.from("admin_broadcasts").insert({
      segment: body.segment,
      message: body.message,
      sent_count: result.sent,
      failed_count: result.failed,
      test_mode: body.testMode || false,
    }).catch(() => {}); // Ignore if table doesn't exist

    return NextResponse.json({
      sent: result.sent,
      failed: result.failed,
      total: messages.length,
      testMode: body.testMode || false,
    });
  } catch (error: any) {
    console.error("[Admin Broadcast] POST error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}










