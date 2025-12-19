import { NextResponse } from "next/server";
import { getSession, getAuthUserId } from "@/lib/telegram/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await getAuthUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();

    // Ensure code exists (DB function from migration 012)
    let code: string | null = null;
    try {
      const { data, error } = await supabase.rpc("ensure_referral_code", { p_user_id: userId });
      if (error) throw error;
      code = (data as any) || null;
    } catch (e) {
      // If migrations not applied yet, fall back to direct lookup (best-effort).
      const { data } = await supabase
        .from("referral_codes")
        .select("code")
        .eq("user_id", userId)
        .maybeSingle();
      code = (data as any)?.code || null;
      if (!code) {
        return NextResponse.json(
          { error: "Referrals not configured (run DB migration 012_referrals.sql)" },
          { status: 501 }
        );
      }
    }

    const { count } = await supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("inviter_user_id", userId);

    if (!code) {
      return NextResponse.json(
        { error: "Referrals not configured (run DB migration 012_referrals.sql)" },
        { status: 501 }
      );
    }

    const baseUrl = (env.optional("SITE_URL") || env.optional("NEXT_PUBLIC_APP_URL") || "https://lensroom.ru").replace(/\/$/, "");
    const link = `${baseUrl}/?ref=${encodeURIComponent(code)}`;

    return NextResponse.json({
      code,
      link,
      bonusTotal: 100,
      inviterBonus: 50,
      inviteeBonus: 50,
      invitedCount: count || 0,
    });
  } catch (error) {
    console.error("[Referrals] /me error:", error);
    return NextResponse.json({ error: "Failed to load referral info" }, { status: 500 });
  }
}



