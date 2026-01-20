import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSessionToken } from "@/lib/telegram/auth";

/**
 * DEV ONLY.
 *
 * Creates `lr_session` cookie by impersonating the most recently active Telegram profile.
 * This makes it possible to smoke-test `/api/generate/*` locally without clicking through Telegram.
 */
export async function POST(_req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = getSupabaseAdmin() as any;

  const { data: profile, error } = await supabase
    .from("telegram_profiles")
    .select("id, telegram_id, telegram_username, first_name, photo_url, is_admin, role, last_login_at")
    .order("last_login_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !profile) {
    return NextResponse.json(
      { error: "No telegram profile found for impersonation", detail: error?.message || String(error || "") },
      { status: 500 }
    );
  }

  const token = await createSessionToken({
    profileId: String(profile.id),
    telegramId: Number(profile.telegram_id),
    username: (profile.telegram_username as string | null) || null,
    firstName: (profile.first_name as string | null) || null,
    photoUrl: (profile.photo_url as string | null) || null,
    isAdmin: !!profile.is_admin,
    role: (profile.role as "user" | "manager" | "admin") || "user",
  });

  const res = NextResponse.json({
    ok: true,
    profile: {
      id: profile.id,
      telegramId: profile.telegram_id,
      username: profile.telegram_username,
      firstName: profile.first_name,
      role: profile.role,
      lastLoginAt: profile.last_login_at,
    },
  });

  res.cookies.set("lr_session", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  return res;
}

