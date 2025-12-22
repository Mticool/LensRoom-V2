import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/requireRole";

export async function GET(request: NextRequest) {
  try {
    await requireRole("admin");

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() || "";
    const type = searchParams.get("type") || "username";

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    let profileQuery = supabase
      .from("telegram_profiles")
      .select("auth_user_id, telegram_username, telegram_id, first_name, last_name");

    if (type === "telegram_id") {
      const telegramId = parseInt(query);
      if (isNaN(telegramId)) {
        return NextResponse.json({ error: "Invalid Telegram ID" }, { status: 400 });
      }
      profileQuery = profileQuery.eq("telegram_id", telegramId);
    } else {
      const cleanUsername = query.startsWith("@") ? query.slice(1) : query;
      profileQuery = profileQuery.ilike("telegram_username", `%${cleanUsername}%`);
    }

    const { data: profiles, error: profileError } = await profileQuery.limit(10);

    if (profileError) {
      console.error("[Admin Search] Error:", profileError);
      return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    let profile = profiles[0];
    if (type === "username") {
      const cleanUsername = query.startsWith("@") ? query.slice(1) : query;
      const exactMatch = profiles.find(
        (p: any) =>
          p.telegram_username &&
          (p.telegram_username.toLowerCase() === cleanUsername.toLowerCase() ||
            p.telegram_username.toLowerCase() === `@${cleanUsername}`.toLowerCase())
      );
      if (exactMatch) profile = exactMatch;
    }

    if (!profile.auth_user_id) {
      return NextResponse.json({ error: "У пользователя нет привязанного аккаунта" }, { status: 404 });
    }

    const { data: credits } = await supabase
      .from("credits")
      .select("amount")
      .eq("user_id", profile.auth_user_id)
      .maybeSingle();

    return NextResponse.json({
      user: {
        auth_user_id: profile.auth_user_id,
        telegram_username: profile.telegram_username,
        telegram_id: profile.telegram_id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        balance: credits?.amount || 0,
      },
    });
  } catch (error: any) {
    console.error("[Admin Search] Error:", error);
    if (error.message?.includes("Unauthorized") || error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

