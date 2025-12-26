import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import crypto from 'crypto';
import { env } from "@/lib/env";

// Generate a unique login code and store it
// User will click link to bot with this code
// When they /start the bot, we validate the code and create session

export async function POST() {
  try {
    const supabase = getSupabaseAdmin();
    
    // Generate a unique login code (short, URL-safe)
    const code = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store the code in database
    const { error } = await (supabase as any)
      .from('telegram_login_codes')
      .insert({
        code,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

    if (error) {
      console.error('[Telegram Init] Error storing code:', error);
      return NextResponse.json(
        { error: 'Failed to create login code' },
        { status: 500 }
      );
    }

    // Return the code and bot link
    const botUsername = env.optional("TELEGRAM_BOT_USERNAME") || 'LensRoomBot';
    const botLink = `https://t.me/${botUsername}?start=login_${code}`;

    return NextResponse.json({
      code,
      botLink,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('[Telegram Init] Error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize login' },
      { status: 500 }
    );
  }
}



