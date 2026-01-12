import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireRole, respondAuthError } from "@/lib/auth/requireRole";

/**
 * POST /api/admin/partners/remove
 * 
 * Remove user from affiliate partners (returns to regular referral program with stars)
 * Body: { userId: string }
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");
    const supabase = getSupabaseAdmin();

    const body = await request.json();
    let userId = String(body?.userId || "").trim();
    let telegramUsername = String(body?.telegramUsername || body?.username || "").trim();
    const telegramId = body?.telegramId ? Number(body.telegramId) : null;

    const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
    if (userId && !looksLikeUuid && !telegramUsername && !telegramId) {
      telegramUsername = userId.replace(/^@/, "");
      userId = "";
    }

    if (!userId && !telegramUsername && !telegramId) {
      return NextResponse.json(
        { error: "userId (or telegramUsername/telegramId) is required" },
        { status: 400 }
      );
    }

    let targetAuthUserId = userId || null;
    if (!targetAuthUserId) {
      let q = supabase.from("telegram_profiles").select("auth_user_id");
      if (telegramId) q = q.eq("telegram_id", telegramId);
      else q = q.eq("telegram_username", telegramUsername);
      const { data: p } = await q.maybeSingle();
      targetAuthUserId = (p as any)?.auth_user_id || null;
    }
    if (!targetAuthUserId) {
      return NextResponse.json({ error: "User not found or has not logged in yet" }, { status: 404 });
    }
    
    // Delete affiliate tier (returns user to regular referral program)
    const { error: deleteError } = await supabase
      .from("affiliate_tiers")
      .delete()
      .eq("user_id", targetAuthUserId);
    
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message || "Failed to remove partner" }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Partner removed. User returned to regular referral program (stars)',
    });
    
  } catch (error) {
    console.error("[/api/admin/partners/remove] POST Error:", error);
    return respondAuthError(error);
  }
}

