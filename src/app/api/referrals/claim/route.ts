import { NextRequest, NextResponse } from "next/server";
import { getSession, getAuthUserId } from "@/lib/telegram/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await getAuthUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as { code?: string };
    const code = (body.code || "").trim();
    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.rpc("claim_referral", {
      p_code: code,
      p_invitee_user_id: userId,
    });

    if (error) {
      console.error("[Referrals] claim rpc error:", error);
      return NextResponse.json({ error: "Failed to claim referral" }, { status: 500 });
    }

    return NextResponse.json({ result: data });
  } catch (error) {
    console.error("[Referrals] /claim error:", error);
    return NextResponse.json({ error: "Failed to claim referral" }, { status: 500 });
  }
}



