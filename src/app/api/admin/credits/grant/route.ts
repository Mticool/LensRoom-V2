import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/requireRole";

/**
 * POST /api/admin/credits/grant
 * Начисление звезд пользователю (только для админов)
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");

    const body = await request.json();
    const { username, telegramId, amount, reason } = body;

    if (!username && !telegramId) {
      return NextResponse.json(
        { error: "username or telegramId is required" },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "amount is required and must be a positive number" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    let profile: any = null;
    let profileError: any = null;
    
    const cleanUsername = username 
      ? (username.startsWith("@") ? username.slice(1) : username) 
      : "";

    if (telegramId) {
      const { data, error } = await supabase
        .from("telegram_profiles")
        .select("auth_user_id, telegram_username, telegram_id")
        .eq("telegram_id", telegramId)
        .maybeSingle();
      
      profile = data;
      profileError = error;
    } else if (username && cleanUsername) {
      const { data: profiles, error } = await supabase
        .from("telegram_profiles")
        .select("auth_user_id, telegram_username, telegram_id")
        .ilike("telegram_username", `%${cleanUsername}%`)
        .limit(10);
      
      profileError = error;
      
      profile = profiles?.find(
        (p: any) =>
          p.telegram_username &&
          (p.telegram_username.toLowerCase() === cleanUsername.toLowerCase() ||
            p.telegram_username.toLowerCase() === `@${cleanUsername}`.toLowerCase())
      );
    }

    if (profileError) {
      console.error("[Admin Grant Credits] Error:", profileError);
      return NextResponse.json({ error: "Failed to find user" }, { status: 500 });
    }

    if (!profile || !profile.auth_user_id) {
      const identifier = telegramId ? `Telegram ID ${telegramId}` : `username "${username}"`;
      return NextResponse.json({ error: `User with ${identifier} not found` }, { status: 404 });
    }

    const userId = profile.auth_user_id;

    const { data: creditsData } = await supabase
      .from("credits")
      .select("amount, subscription_stars, package_stars")
      .eq("user_id", userId)
      .maybeSingle();

    const currentSubscription = creditsData?.subscription_stars || 0;
    const currentPackage = creditsData?.package_stars || 0;
    const legacyAmount = creditsData?.amount || 0;
    
    // Calculate current total (handle legacy data)
    const currentBalance = currentSubscription + currentPackage > 0 
      ? currentSubscription + currentPackage 
      : legacyAmount;
    
    // Add to package_stars (admin grants never expire)
    const newPackageStars = (currentPackage > 0 ? currentPackage : legacyAmount) + amount;
    const newBalance = currentSubscription + newPackageStars;

    const { error: updateError } = await supabase
      .from("credits")
      .upsert({ 
        user_id: userId, 
        amount: newBalance, 
        subscription_stars: currentSubscription,
        package_stars: newPackageStars,
        updated_at: new Date().toISOString() 
      }, { onConflict: "user_id" });

    if (updateError) {
      console.error("[Admin Grant Credits] Update error:", updateError);
      return NextResponse.json({ error: "Failed to update credits" }, { status: 500 });
    }

    await supabase.from("credit_transactions").insert({
      user_id: userId,
      amount: amount,
      type: "admin_grant",
      description: reason ? `Административное начисление: +${amount} ⭐ (${reason})` : `Административное начисление: +${amount} ⭐`,
      metadata: { admin_action: true, reason: reason || "Manual grant", username: profile.telegram_username || cleanUsername },
    });

    const displayUsername = profile.telegram_username || cleanUsername || String(telegramId);

    return NextResponse.json({
      success: true,
      message: `Successfully granted ${amount} ⭐ to @${displayUsername}`,
      data: { username: displayUsername, userId, amount, previousBalance: currentBalance, newBalance },
    });
  } catch (error: any) {
    console.error("[Admin Grant Credits] Error:", error);
    if (error.message?.includes("Unauthorized") || error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

