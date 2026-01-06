import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/analytics/funnel
 * Returns funnel data and time-series analytics
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole("manager");

    const supabase = getSupabaseAdmin();
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "30");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // === FUNNEL DATA ===

    // 1. Total registered users
    const { count: totalUsers } = await supabase
      .from("telegram_profiles")
      .select("*", { count: "exact", head: true });

    // 2. Users who made at least 1 generation
    const { data: usersWithGen } = await supabase
      .from("generations")
      .select("profile_id")
      .eq("status", "success");

    const uniqueGenerators = new Set(usersWithGen?.map((g: any) => g.profile_id)).size;

    // 3. Users who made at least 1 payment
    const { data: usersWithPayment } = await supabase
      .from("payments")
      .select("profile_id")
      .eq("status", "completed");

    const uniquePayers = new Set(usersWithPayment?.map((p: any) => p.profile_id)).size;

    // 4. Users who made 2+ payments (repeat customers)
    const payerCounts: Record<string, number> = {};
    usersWithPayment?.forEach((p: any) => {
      payerCounts[p.profile_id] = (payerCounts[p.profile_id] || 0) + 1;
    });
    const repeatPayers = Object.values(payerCounts).filter((c) => c >= 2).length;

    const funnel = {
      registration: totalUsers || 0,
      firstGeneration: uniqueGenerators,
      firstPurchase: uniquePayers,
      repeatPurchase: repeatPayers,
    };

    // === TIME SERIES DATA ===

    // Get daily user registrations
    const { data: usersDaily } = await supabase
      .from("telegram_profiles")
      .select("created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    // Get daily generations
    const { data: gensDaily } = await supabase
      .from("generations")
      .select("created_at, status, type, cost_stars")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    // Get daily payments
    const { data: paymentsDaily } = await supabase
      .from("payments")
      .select("created_at, amount_rub, status")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    // Aggregate by day
    const dailyData: Record<
      string,
      { users: number; generations: number; revenue: number; stars_spent: number }
    > = {};

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      dailyData[key] = { users: 0, generations: 0, revenue: 0, stars_spent: 0 };
    }

    // Count users by day
    usersDaily?.forEach((u: any) => {
      const key = new Date(u.created_at).toISOString().split("T")[0];
      if (dailyData[key]) dailyData[key].users++;
    });

    // Count generations by day
    gensDaily?.forEach((g: any) => {
      const key = new Date(g.created_at).toISOString().split("T")[0];
      if (dailyData[key]) {
        if (g.status === "success") dailyData[key].generations++;
        dailyData[key].stars_spent += g.cost_stars || 0;
      }
    });

    // Count revenue by day
    paymentsDaily?.forEach((p: any) => {
      if (p.status === "completed") {
        const key = new Date(p.created_at).toISOString().split("T")[0];
        if (dailyData[key]) dailyData[key].revenue += p.amount_rub || 0;
      }
    });

    const timeSeries = Object.entries(dailyData).map(([date, data]) => ({
      date,
      ...data,
    }));

    // === TODAY'S STATS ===
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todayUsers } = await supabase
      .from("telegram_profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    const { count: todayGens } = await supabase
      .from("generations")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString())
      .eq("status", "success");

    const { data: todayPayments } = await supabase
      .from("payments")
      .select("amount_rub")
      .eq("status", "completed")
      .gte("created_at", today.toISOString());

    const todayRevenue = todayPayments?.reduce((sum: number, p: any) => sum + (p.amount_rub || 0), 0) || 0;

    // === GENERATION BREAKDOWN ===
    const { data: genBreakdown } = await supabase
      .from("generations")
      .select("type, status")
      .gte("created_at", startDate.toISOString());

    const byType: Record<string, number> = { image: 0, video: 0, product: 0 };
    const byStatus: Record<string, number> = { success: 0, failed: 0, pending: 0 };

    genBreakdown?.forEach((g: any) => {
      const type = g.type || "image";
      byType[type] = (byType[type] || 0) + 1;
      byStatus[g.status] = (byStatus[g.status] || 0) + 1;
    });

    return NextResponse.json({
      funnel,
      timeSeries,
      today: {
        users: todayUsers || 0,
        generations: todayGens || 0,
        revenue: todayRevenue,
      },
      breakdown: {
        byType,
        byStatus,
      },
      period: { days, startDate: startDate.toISOString() },
    });
  } catch (error: any) {
    console.error("[Admin Funnel] error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}










