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
      // Keep this endpoint non-erroring for anonymous users; client can treat missing session as logged out.
      return NextResponse.json({
        user: null,
        telegramId: null,
        username: null,
        firstName: null,
        photoUrl: null,
        isAdmin: false,
        role: 'user',
      });
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


