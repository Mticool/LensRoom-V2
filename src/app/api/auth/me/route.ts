import { NextResponse } from "next/server";
import { getSession, getAuthUserId } from "@/lib/telegram/auth";

/**
 * GET /api/auth/me
 * Returns current user info from Telegram session
 */
export async function GET() {
  try {
    const telegramSession = await getSession();
    
    if (!telegramSession) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const authUserId = await getAuthUserId(telegramSession);
    
    return NextResponse.json({
      user: {
        id: authUserId,
      },
      telegramId: telegramSession.telegramId,
      username: telegramSession.username,
      firstName: telegramSession.firstName,
      photoUrl: telegramSession.photoUrl,
      isAdmin: telegramSession.isAdmin,
      role: telegramSession.role,
    });
  } catch (error) {
    console.error("[Auth Me] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

