import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    // Требуется роль manager или admin
    await requireRole("manager");

    const supabase = getSupabaseAdmin();

    // Получаем общее количество пользователей
    const { count: usersTotal } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Новые пользователи за последние 7 дней
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: usersNew7d } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString());

    // Выручка за последние 7 дней (из payments)
    const { data: payments } = await supabase
      .from("payments")
      .select("amount_rub, amount_stars")
      .eq("status", "completed")
      .gte("created_at", sevenDaysAgo.toISOString());

    const revenueGross = payments?.reduce((sum: number, p: any) => sum + (p.amount_rub || 0), 0) || 0;
    const revenueNet = revenueGross * 0.9; // После 10% комиссии

    // Топ пакетов (группируем по package_id)
    const { data: topPacks } = await supabase
      .from("payments")
      .select("package_id, amount_rub, amount_stars")
      .eq("status", "completed")
      .gte("created_at", sevenDaysAgo.toISOString());

    // Группируем по package_id
    const packsMap = new Map<string, { count: number; rub: number; stars: number }>();
    
    topPacks?.forEach((p: any) => {
      const packId = p.package_id || "unknown";
      const existing = packsMap.get(packId) || { count: 0, rub: 0, stars: 0 };
      
      packsMap.set(packId, {
        count: existing.count + 1,
        rub: existing.rub + (p.amount_rub || 0),
        stars: existing.stars + (p.amount_stars || 0),
      });
    });

    // Конвертируем в массив и сортируем по количеству
    const packsTop = Array.from(packsMap.entries())
      .map(([packId, stats]) => ({ packId, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Топ 10

    return NextResponse.json({
      users_total: usersTotal || 0,
      users_new_7d: usersNew7d || 0,
      revenue_7d: {
        gross: Math.round(revenueGross),
        net_after_tax_10pct: Math.round(revenueNet),
      },
      packs_top: packsTop,
    });
  } catch (error: any) {
    console.error("[Admin overview] error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
