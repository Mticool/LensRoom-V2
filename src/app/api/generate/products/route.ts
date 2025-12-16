import { NextRequest, NextResponse } from "next/server";
import { getSession, getAuthUserId } from "@/lib/telegram/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { kieClient } from "@/lib/api/kie-client";
import { getApiModelId, getPackCost, getSingleCost, PACK_SLIDES_DEFAULT } from "@/config/productImageModes";

type ProductGenerateBody = {
  modeId: string;
  generationType: "single" | "pack";
  slidesCount: number;
  modelKey: string;
  // base64 data URLs
  productPhotos: string[];
  // prompts per slide (client-built)
  slidePrompts: string[];
  aspectRatio?: string; // "1:1" etc
};

async function uploadDataUrlToStorage(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  dataUrl: string,
  suffix: string
): Promise<string> {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) return dataUrl; // already a URL
  const mime = match[1];
  const b64 = match[2];
  const buffer = Buffer.from(b64, "base64");
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const path = `${userId}/inputs/${Date.now()}_${suffix}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("generations")
    .upload(path, buffer, { contentType: mime, upsert: true });
  if (upErr) throw upErr;
  const { data: pub } = supabase.storage.from("generations").getPublicUrl(path);
  return pub.publicUrl;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ProductGenerateBody;
    const {
      modeId,
      generationType,
      slidesCount,
      modelKey,
      productPhotos,
      slidePrompts,
      aspectRatio = "1:1",
    } = body;

    if (!modelKey || !modeId || !generationType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!Array.isArray(productPhotos) || productPhotos.length === 0) {
      return NextResponse.json({ error: "productPhotos is required" }, { status: 400 });
    }
    const count = generationType === "single" ? 1 : (slidesCount || PACK_SLIDES_DEFAULT);
    if (!Array.isArray(slidePrompts) || slidePrompts.length < 1) {
      return NextResponse.json({ error: "slidePrompts is required" }, { status: 400 });
    }

    const telegramSession = await getSession();
    if (!telegramSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = await getAuthUserId(telegramSession);
    if (!userId) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();

    // Compute total cost (server-side)
    const totalCost =
      generationType === "single"
        ? getSingleCost(modeId)
        : getPackCost(modeId, count);

    // Check credits
    const { data: creditsData, error: creditsError } = await supabase
      .from("credits")
      .select("amount")
      .eq("user_id", userId)
      .single();

    if (creditsError || !creditsData) {
      return NextResponse.json({ error: "Failed to fetch credits" }, { status: 500 });
    }
    if (creditsData.amount < totalCost) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          required: totalCost,
          available: creditsData.amount,
          message: `Нужно ${totalCost} ⭐, у вас ${creditsData.amount} ⭐`,
        },
        { status: 402 }
      );
    }

    // Deduct credits
    const newBalance = creditsData.amount - totalCost;
    const { error: deductError } = await supabase
      .from("credits")
      .update({ amount: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (deductError) {
      return NextResponse.json({ error: "Failed to deduct credits" }, { status: 500 });
    }

    // Create generation record (best-effort)
    const { data: generation, error: genError } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        type: "product",
        model_id: modelKey,
        model_name: modelKey,
        prompt: slidePrompts[0] || "product",
        credits_used: totalCost,
        status: "queued",
      })
      .select()
      .single();
    if (genError) console.error("[Products API] Failed to save generation:", genError);

    // Record transaction (best-effort)
    try {
      await supabase.from("credit_transactions").insert({
        user_id: userId,
        amount: -totalCost,
        type: "deduction",
        description: `Маркетплейсы: ${generationType === "single" ? "1" : count} изображ.`,
        generation_id: generation?.id,
      });
    } catch (e) {
      console.error("[Products API] Failed to record transaction:", e);
    }

    // Upload product photos (public URLs)
    const uploadedUrls: string[] = [];
    for (let i = 0; i < productPhotos.length; i++) {
      uploadedUrls.push(await uploadDataUrlToStorage(supabase, userId, productPhotos[i], `product_${i}`));
    }

    const apiModelId = getApiModelId(modelKey);

    // Create KIE tasks (one per slide)
    const jobs: Array<{ slideIndex: number; jobId: string }> = [];
    for (let i = 0; i < count; i++) {
      const prompt = slidePrompts[i] || slidePrompts[slidePrompts.length - 1] || slidePrompts[0];
      const img = uploadedUrls[i % uploadedUrls.length];
      const input: Record<string, unknown> = {
        prompt,
        aspect_ratio: aspectRatio,
        output_format: "png",
        // i2i style (helps keep product)
        image_input: [img],
      };

      // Model-specific params
      if (apiModelId.includes("flux-2")) {
        // Flux requires resolution + aspect_ratio
        input.resolution = "1K";
      } else if (apiModelId.startsWith("seedream/4.5")) {
        // Seedream uses quality basic/high, not resolution
        input.quality = "basic";
      } else {
        // Default to 1K where supported
        input.resolution = "1K";
      }

      const create = await kieClient.createTask({ model: apiModelId, input });
      jobs.push({ slideIndex: i, jobId: create.data.taskId });
    }

    return NextResponse.json({
      success: true,
      generationId: generation?.id || null,
      totalCost,
      jobs,
    });
  } catch (error) {
    console.error("[Products API] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

