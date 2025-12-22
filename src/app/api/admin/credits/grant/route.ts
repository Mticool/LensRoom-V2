import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/requireRole";

/**
 * POST /api/admin/credits/grant
 * Начисление звезд пользователю (только для админов)
 * 
 * Body:
 * {
 *   username?: string,    // Telegram username (с @ или без)
 *   telegramId?: number,  // Telegram ID (альтернативный способ поиска)
 *   amount: number,       // Количество звезд для начисления
 *   reason?: string       // Причина начисления (опционально)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Проверка прав администратора
    await requireRole("admin");

    const body = await request.json();
    const { username, telegramId, amount, reason } = body;

    // Валидация
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
    
    // Очищенный username для логирования
    const cleanUsername = username 
      ? (username.startsWith("@") ? username.slice(1) : username) 
      : "";

    // Шаг 1: Найти пользователя по telegramId или username
    if (telegramId) {
      // Поиск по Telegram ID
      const { data, error } = await supabase
        .from("telegram_profiles")
        .select("auth_user_id, telegram_username, telegram_id")
        .eq("telegram_id", telegramId)
        .maybeSingle();
      
      profile = data;
      profileError = error;
    } else if (username && cleanUsername) {
      // Ищем по telegram_username (без учета регистра)
      const { data: profiles, error } = await supabase
        .from("telegram_profiles")
        .select("auth_user_id, telegram_username, telegram_id")
        .ilike("telegram_username", `%${cleanUsername}%`)
        .limit(10);
      
      profileError = error;
      
      // Находим точное совпадение (с @ или без)
      profile = profiles?.find(
        (p: any) =>
          p.telegram_username &&
          (p.telegram_username.toLowerCase() === cleanUsername.toLowerCase() ||
            p.telegram_username.toLowerCase() === `@${cleanUsername}`.toLowerCase())
      );
    }

    if (profileError) {
      console.error("[Admin Grant Credits] Error finding user:", profileError);
      return NextResponse.json(
        { error: "Failed to find user" },
        { status: 500 }
      );
    }

    if (!profile || !profile.auth_user_id) {
      const identifier = telegramId ? `Telegram ID ${telegramId}` : `username "${username}"`;
      return NextResponse.json(
        { error: `User with ${identifier} not found` },
        { status: 404 }
      );
    }

    const userId = profile.auth_user_id;

    // Шаг 2: Получить текущий баланс
    const { data: creditsData, error: creditsError } = await supabase
      .from("credits")
      .select("amount")
      .eq("user_id", userId)
      .maybeSingle();

    if (creditsError && creditsError.code !== "PGRST116") {
      // PGRST116 = not found, это нормально
      console.error("[Admin Grant Credits] Error fetching credits:", creditsError);
      return NextResponse.json(
        { error: "Failed to fetch current balance" },
        { status: 500 }
      );
    }

    const currentBalance = creditsData?.amount || 0;
    const newBalance = currentBalance + amount;

    // Шаг 3: Обновить или создать запись в credits
    const { error: updateError } = await supabase
      .from("credits")
      .upsert(
        {
          user_id: userId,
          amount: newBalance,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (updateError) {
      console.error("[Admin Grant Credits] Error updating credits:", updateError);
      return NextResponse.json(
        { error: "Failed to update credits" },
        { status: 500 }
      );
    }

    // Шаг 4: Записать транзакцию в историю
    const { error: transactionError } = await supabase
      .from("credit_transactions")
      .insert({
        user_id: userId,
        amount: amount,
        type: "admin_grant",
        description: reason 
          ? `Административное начисление: +${amount} ⭐ (${reason})`
          : `Административное начисление: +${amount} ⭐`,
        metadata: {
          admin_action: true,
          reason: reason || "Manual grant by admin",
          username: profile.telegram_username || cleanUsername || String(telegramId),
          granted_at: new Date().toISOString(),
        },
      });

    if (transactionError) {
      console.error("[Admin Grant Credits] Error creating transaction:", transactionError);
      // Не критично, но логируем
    }

    const displayUsername = profile.telegram_username || cleanUsername || String(telegramId);
    
    console.log(
      `[Admin Grant Credits] Granted ${amount} stars to @${displayUsername} (${userId}). Balance: ${currentBalance} → ${newBalance}`
    );

    return NextResponse.json({
      success: true,
      message: `Successfully granted ${amount} ⭐ to @${displayUsername}`,
      data: {
        username: displayUsername,
        userId,
        amount,
        previousBalance: currentBalance,
        newBalance,
        transactionRecorded: !transactionError,
      },
    });
  } catch (error: any) {
    console.error("[Admin Grant Credits] Error:", error);
    
    // Если ошибка авторизации
    if (error.message?.includes("Unauthorized") || error.message?.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

