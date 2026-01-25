import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * LaoZhang API Pricing (cost to us in USD)
 * Source: https://api.laozhang.ai/
 */
const LAOZHANG_COSTS = {
  // Image models
  "nano-banana": 0.003,       // gemini-2.5-flash-image-preview
  "nano-banana-pro": 0.008,   // gemini-3-pro-image-preview
  "nano-banana-pro-2k": 0.012,
  "nano-banana-pro-4k": 0.02,
  
  // Video models
  "veo-3.1": 0.015,           // veo-3.1
  "veo-3.1-fast": 0.01,       // veo-3.1-fast
  "veo-3.1-landscape": 0.015,
  "veo-3.1-landscape-fast": 0.01,
  "sora-2": 0.015,            // sora-2
  "sora_video2": 0.015,
  "sora_video2-15s": 0.02,
  "sora_video2-landscape": 0.015,
} as const;

// USD conversion rate for internal cost reporting
const USD_TO_LOCAL_RATE = 100;

export async function GET(request: NextRequest) {
  try {
    await requireRole("admin");
    
    const supabase = getSupabaseAdmin();
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get("days") || "30");
    
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    // Get all generations with laozhang provider
    const { data: generations, error } = await supabase
      .from("generations")
      .select("id, model, status, created_at, kind")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("[LaoZhang Stats] Error fetching generations:", error);
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
    
    // Filter LaoZhang models
    const laozhangModels = [
      "nano-banana", "nano-banana-pro",
      "veo-3.1", "sora-2"
    ];
    
    type Generation = { id: string; model: string | null; status: string | null; created_at: string | null; kind: string | null };
    
    const laozhangGenerations = (generations || []).filter((g: Generation) => 
      laozhangModels.some((m: string) => g.model?.includes(m))
    );
    
    // Calculate stats by model
    const byModel: Record<string, { count: number; success: number; failed: number; costUsd: number }> = {};
    
    for (const gen of laozhangGenerations as Generation[]) {
      const model = gen.model || "unknown";
      let modelKey = model;
      
      // Normalize model names
      if (model.includes("nano-banana-pro")) {
        modelKey = "nano-banana-pro";
      } else if (model.includes("nano-banana")) {
        modelKey = "nano-banana";
      } else if (model.includes("veo")) {
        modelKey = "veo-3.1";
      } else if (model.includes("sora")) {
        modelKey = "sora-2";
      }
      
      if (!byModel[modelKey]) {
        byModel[modelKey] = { count: 0, success: 0, failed: 0, costUsd: 0 };
      }
      
      byModel[modelKey].count++;
      
      if (gen.status === "success" || gen.status === "completed") {
        byModel[modelKey].success++;
        // Add cost only for successful generations
        const cost = LAOZHANG_COSTS[modelKey as keyof typeof LAOZHANG_COSTS] || 0.01;
        byModel[modelKey].costUsd += cost;
      } else if (gen.status === "failed" || gen.status === "error") {
        byModel[modelKey].failed++;
      }
    }
    
    // Calculate totals
    const totalGenerations = laozhangGenerations.length;
    const totalSuccess = Object.values(byModel).reduce((a, b) => a + b.success, 0);
    const totalFailed = Object.values(byModel).reduce((a, b) => a + b.failed, 0);
    const totalCostUsd = Object.values(byModel).reduce((a, b) => a + b.costUsd, 0);
    const totalCostRub = totalCostUsd * USD_TO_LOCAL_RATE;
    
    // Daily breakdown
    const dailyStats: Record<string, { count: number; costUsd: number }> = {};
    
    for (const gen of laozhangGenerations as Generation[]) {
      const date = gen.created_at?.split("T")[0];
      if (!date) continue;
      
      if (!dailyStats[date]) {
        dailyStats[date] = { count: 0, costUsd: 0 };
      }
      
      dailyStats[date].count++;
      
      if (gen.status === "success" || gen.status === "completed") {
        let modelKey = gen.model || "";
        if (modelKey.includes("nano-banana-pro")) modelKey = "nano-banana-pro";
        else if (modelKey.includes("nano-banana")) modelKey = "nano-banana";
        else if (modelKey.includes("veo")) modelKey = "veo-3.1";
        else if (modelKey.includes("sora")) modelKey = "sora-2";
        
        const cost = LAOZHANG_COSTS[modelKey as keyof typeof LAOZHANG_COSTS] || 0.01;
        dailyStats[date].costUsd += cost;
      }
    }
    
    // Convert to sorted array
    const dailyData = Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        count: stats.count,
        costUsd: stats.costUsd,
        costRub: stats.costUsd * USD_TO_LOCAL_RATE,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return NextResponse.json({
      period: days,
      totals: {
        generations: totalGenerations,
        success: totalSuccess,
        failed: totalFailed,
        costUsd: Math.round(totalCostUsd * 1000) / 1000,
        costRub: Math.round(totalCostRub),
      },
      byModel: Object.entries(byModel).map(([model, stats]) => ({
        model,
        ...stats,
        costUsd: Math.round(stats.costUsd * 1000) / 1000,
        costRub: Math.round(stats.costUsd * USD_TO_LOCAL_RATE),
      })).sort((a, b) => b.count - a.count),
      daily: dailyData,
    });
  } catch (error) {
    console.error("[LaoZhang Stats] Error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
