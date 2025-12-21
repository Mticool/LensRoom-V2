import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/telegram/auth";

export const dynamic = "force-dynamic";

async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("telegram_profiles")
    .select("role")
    .eq("telegram_id", session.id)
    .single();

  return data?.role === "admin" || data?.role === "manager";
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    // Total generations
    const { count: total } = await supabase
      .from("generations")
      .select("*", { count: "exact", head: true });

    // Today's generations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayCount } = await supabase
      .from("generations")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    // By model (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: generations } = await supabase
      .from("generations")
      .select("model_name")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .eq("status", "success");

    // Count by model
    const modelCounts: Record<string, number> = {};
    (generations || []).forEach((g) => {
      const model = g.model_name || "Unknown";
      modelCounts[model] = (modelCounts[model] || 0) + 1;
    });

    const byModel = Object.entries(modelCounts)
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count);

    // By status
    const { data: statusData } = await supabase
      .from("generations")
      .select("status")
      .gte("created_at", thirtyDaysAgo.toISOString());

    const statusCounts: Record<string, number> = {};
    (statusData || []).forEach((g) => {
      const status = g.status || "unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const byStatus = Object.entries(statusCounts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      total: total || 0,
      today: todayCount || 0,
      byModel,
      byStatus,
    });
  } catch (error) {
    console.error("[Admin Analytics] Error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
