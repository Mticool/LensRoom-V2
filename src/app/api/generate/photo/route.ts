import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession, getAuthUserId } from "@/lib/telegram/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getKieClient } from "@/lib/api/kie-client";
import { PHOTO_MODELS, getModelById } from "@/config/models";
import { getSkuFromRequest, getPriceStars, calculateTotalStars, PRICING_VERSION, type PricingOptions } from "@/lib/pricing/pricing";
import { integrationNotConfigured } from "@/lib/http/integration-error";
import { ensureProfileExists } from "@/lib/supabase/ensure-profile";
import { getPhotoVariantByIds } from "@/config/photoVariantRegistry";
import { requireAuth } from "@/lib/auth/requireRole";
import { getCreditBalance, deductCredits } from "@/lib/credits/split-credits";
import sharp from "sharp";
import {
  isNanoBananaPro,
  calculateNBPCost,
  incrementQuotaUsage,
  recordGenerationRun,
  refundStars,
  NBP_MODEL_KEY,
} from "@/lib/quota/nano-banana-pro";
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';
import { resolveAspectRatio, logAspectRatioResolution } from '@/lib/api/aspect-ratio-utils';

function mimeTypesFromFormats(formats?: Array<'jpeg' | 'png' | 'webp'>): string[] | null {
  if (!formats || formats.length === 0) return null;
  const m: string[] = [];
  for (const f of formats) {
    if (f === 'jpeg') m.push('image/jpeg');
    if (f === 'png') m.push('image/png');
    if (f === 'webp') m.push('image/webp');
  }
  return m.length ? m : null;
}

function parseDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  const match = String(dataUrl || "").match(/^data:(.+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
}

function estimateBytesFromBase64(base64: string): number {
  // Roughly: 4 chars -> 3 bytes (minus padding).
  const s = String(base64 || "");
  const padding = s.endsWith("==") ? 2 : s.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((s.length * 3) / 4) - padding);
}

async function buildReferenceCollageDataUrl(
  refs: string[],
  opts?: { tile?: number; maxTiles?: number }
): Promise<string> {
  const tile = opts?.tile ?? 512;
  const maxTiles = opts?.maxTiles ?? 8;
  const input = refs.slice(0, maxTiles);

  const cols = input.length <= 1 ? 1 : input.length <= 4 ? 2 : 4;
  const rows = Math.max(1, Math.ceil(input.length / cols));

  const width = cols * tile;
  const height = rows * tile;

  const tiles = await Promise.all(
    input.map(async (src, idx) => {
      let buffer: Buffer;
      const parsed = parseDataUrl(src);
      if (parsed) {
        buffer = Buffer.from(parsed.base64, "base64");
      } else {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`Failed to fetch reference image (${res.status})`);
        buffer = Buffer.from(await res.arrayBuffer());
      }

      const resized = await sharp(buffer)
        .resize(tile, tile, { fit: "cover" })
        .png()
        .toBuffer();

      const x = (idx % cols) * tile;
      const y = Math.floor(idx / cols) * tile;
      return { input: resized, left: x, top: y };
    })
  );

  const out = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite(tiles)
    .png()
    .toBuffer();

  return `data:image/png;base64,${out.toString("base64")}`;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(`gen:photo:${clientIP}`, RATE_LIMITS.generation);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    const { prompt, negativePrompt, aspectRatio, variants = 1, mode = 't2i', referenceImage, referenceImages, outputFormat } = body;
    const threadIdRaw = body?.threadId;
    const legacyModel = body?.model;
    const baseModelId = body?.modelId;
    const variantId = body?.variantId;
    const clientParams = body?.params;

    // Validate required fields
    if ((!legacyModel && !(baseModelId && variantId)) || !prompt) {
      return NextResponse.json(
        { error: "Model (or modelId+variantId) and prompt are required" },
        { status: 400 }
      );
    }

    // Resolve new variant-based payload to an internal model id
    let effectiveModelId: string = String(legacyModel || "");
    let resolvedParams: any = null;
    let baseTitle: string | null = null;
    let resolvedVariantId: string | null = null;
    let resolvedVariantStars: number | null = null;

    if (baseModelId && variantId) {
      // This generator currently only supports 1 image per request for variant pricing.
      if (Number(variants || 1) !== 1) {
        return NextResponse.json({ error: "variants must be 1 for variant-based photo generation" }, { status: 400 });
      }

      const resolved = getPhotoVariantByIds(String(baseModelId), String(variantId));
      if (!resolved) {
        return NextResponse.json({ error: "Invalid modelId/variantId" }, { status: 400 });
      }
      const { base, variant } = resolved;
      if (!variant.enabled) {
        return NextResponse.json({ error: "Selected variant is disabled" }, { status: 400 });
      }

      effectiveModelId = variant.sourceModelId;
      resolvedParams = variant.params || {};
      baseTitle = base.title || null;
      resolvedVariantId = variant.id;
      resolvedVariantStars = Number(variant.stars || 0);

      // Optional: ignore clientParams for pricing/selection safety (we keep it only for logging)
      void clientParams;
    }

    // Find model info
    const modelInfo = getModelById(effectiveModelId);
    if (!modelInfo || modelInfo.type !== 'photo') {
      return NextResponse.json(
        { error: "Invalid model", availableModels: PHOTO_MODELS.map(m => m.id) },
        { status: 400 }
      );
    }

    const requestedAspectRatio = String(aspectRatio || "").trim();
    if (requestedAspectRatio && Array.isArray(modelInfo.aspectRatios) && modelInfo.aspectRatios.length > 0) {
      if (!modelInfo.aspectRatios.includes(requestedAspectRatio)) {
        return NextResponse.json(
          {
            error: "Unsupported aspect ratio for this model",
            aspectRatio: requestedAspectRatio,
            allowed: modelInfo.aspectRatios,
          },
          { status: 400 }
        );
      }
    }

    console.log('[API] Photo request:', {
      modelId: effectiveModelId,
      provider: modelInfo.provider,
      aspectRatio: requestedAspectRatio || null,
      mode,
      variants,
      outputFormat,
      hasReference: Array.isArray(referenceImages) ? referenceImages.length > 0 : !!referenceImage,
    });

    type OutputFormat = "png" | "jpg" | "webp";
    const rawOut = String(outputFormat || "").trim().toLowerCase();
    let requestedOutputFormat: OutputFormat =
      rawOut === "jpg" ? "jpg" : rawOut === "webp" ? "webp" : "png";
    // Some tools require PNG (alpha), force server-side.
    if (effectiveModelId === "recraft-remove-background") {
      requestedOutputFormat = "png";
    }
    // Enforce model-specific output formats (Nano Banana Pro supports only PNG/JPG).
    const allowedOutputs = (modelInfo as any)?.outputFormats as Array<"png" | "jpg"> | undefined;
    if (allowedOutputs && allowedOutputs.length) {
      const normalized = requestedOutputFormat === "webp" ? "webp" : requestedOutputFormat;
      if (normalized === "webp" || !allowedOutputs.includes(normalized as any)) {
        requestedOutputFormat = allowedOutputs[0] as OutputFormat;
      }
    }

    // === NEW PRICING SYSTEM (2026-01-27) ===
    const { quality: legacyQuality, resolution: legacyResolution } = body;
    const quality =
      resolvedParams?.quality && resolvedParams.quality !== "default"
        ? String(resolvedParams.quality)
        : legacyQuality || undefined;
    const resolution =
      resolvedParams?.resolution && resolvedParams.resolution !== "default"
        ? String(resolvedParams.resolution)
        : legacyResolution || undefined;

    // Build pricing options
    const pricingOptions: PricingOptions = {
      quality,
      resolution,
      mode: mode as any,
    };

    // Generate SKU and get price
    let sku: string;
    let creditCost: number;
    
    try {
      // If variant payload was used with explicit stars, use that
      if (resolvedVariantStars !== null && resolvedVariantStars > 0) {
        // For variant-based pricing, we still need a SKU for tracking
        sku = getSkuFromRequest(effectiveModelId, pricingOptions);
        creditCost = resolvedVariantStars;
      } else {
        // Use new SKU-based pricing system
        sku = getSkuFromRequest(effectiveModelId, pricingOptions);
        creditCost = calculateTotalStars(sku);
        
        // For variants > 1, multiply the price
        if (variants && variants > 1) {
          creditCost = creditCost * variants;
        }
      }
    } catch (error) {
      console.error('[API] Pricing system error:', {
        modelId: effectiveModelId,
        quality,
        resolution,
        mode,
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ 
        error: "Pricing error: No price defined for this model/variant combination",
        details: `Model: ${effectiveModelId}, Quality: ${quality || 'default'}, Resolution: ${resolution || 'default'}`,
        modelId: effectiveModelId,
      }, { status: 500 });
    }
    
    if (!Number.isFinite(creditCost) || creditCost <= 0) {
      console.error('[API] Invalid price computed:', {
        modelId: effectiveModelId,
        quality,
        resolution,
        variants,
        sku,
        creditCost,
        resolvedVariantStars,
      });
      return NextResponse.json({ 
        error: "Invalid price for selected model/variant",
        details: `Model: ${effectiveModelId}, Quality: ${quality || 'default'}, Resolution: ${resolution || 'default'}`,
      }, { status: 400 });
    }

    // Check Telegram auth and get user role
    let userId: string;
    let userRole: "user" | "manager" | "admin" = "user";
    let skipCredits = false;

    try {
      const auth = await requireAuth();
      userId = auth.authUserId;
      userRole = auth.role;
      // Managers and admins don't pay credits when generating content for gallery
      skipCredits = userRole === "manager" || userRole === "admin";
    } catch (error) {
      // Fallback to old auth method
      const telegramSession = await getSession();
      if (!telegramSession) {
        return NextResponse.json(
          { error: "Unauthorized. Please log in to generate images." },
          { status: 401 }
        );
      }
      userId = await getAuthUserId(telegramSession) || "";
      if (!userId) {
        return NextResponse.json(
          { error: "User account not found. Please contact support." },
          { status: 404 }
        );
      }
    }
    
    // Check credits using admin client
    const supabase = getSupabaseAdmin();

    // Optional: validate threadId and ensure it belongs to user.
    // NOTE: Projects are shared across Photo/Video/Motion/Music, so we must NOT enforce model_id match here.
    const threadId = threadIdRaw ? String(threadIdRaw).trim() : "";
    if (threadId) {
      try {
        const { data: thread, error: threadErr } = await supabase
          .from("studio_threads")
          .select("id,user_id,model_id")
          .eq("id", threadId)
          .eq("user_id", userId)
          .single();

        if (threadErr || !thread) {
          return NextResponse.json({ error: "Invalid threadId" }, { status: 400 });
        }
      } catch (e) {
        console.error("[API] threadId validation error:", e);
        return NextResponse.json({ error: "Failed to validate threadId" }, { status: 500 });
      }
    }

    // === NANO BANANA PRO QUOTA LOGIC ===
    // For NBP, determine actual cost based on plan entitlements
    let actualCreditCost = creditCost;
    let isIncludedByPlan = false;
    let nbpVariantKey: string | null = null;
    let nbpPlanId: string | null = null;
    
    if (!skipCredits && isNanoBananaPro(effectiveModelId)) {
      const nbpCost = await calculateNBPCost(supabase, userId, quality);
      actualCreditCost = nbpCost.stars;
      isIncludedByPlan = nbpCost.isIncluded;
      nbpVariantKey = nbpCost.variantKey;
      nbpPlanId = nbpCost.planId;
      
      console.log('[API] NBP quota check:', {
        userId,
        variantKey: nbpVariantKey,
        planId: nbpPlanId,
        usedThisMonth: nbpCost.usedThisMonth,
        isIncluded: isIncludedByPlan,
        actualCost: actualCreditCost,
        originalCost: creditCost,
      });
    }

    // Skip credit check for managers/admins
    if (!skipCredits) {
      // Get user credits (split: subscription + package)
      const creditBalance = await getCreditBalance(supabase, userId);

      // Check if enough credits (only if not included by plan)
      if (!isIncludedByPlan && creditBalance.totalBalance < actualCreditCost) {
        return NextResponse.json(
          { 
            error: "Insufficient credits", 
            required: actualCreditCost, 
            available: creditBalance.totalBalance,
            subscriptionStars: creditBalance.subscriptionStars,
            packageStars: creditBalance.packageStars,
            message: `Нужно ${actualCreditCost} ⭐, у вас ${creditBalance.totalBalance} ⭐ (${creditBalance.subscriptionStars} подписка + ${creditBalance.packageStars} пакет)`
          },
          { status: 402 } // Payment Required
        );
      }

      // Deduct credits (only if not included by plan)
      // Priority: subscription stars first (use before they expire), then package stars
      if (!isIncludedByPlan && actualCreditCost > 0) {
        const deductResult = await deductCredits(supabase, userId, actualCreditCost);
        
        // 🔍 AUDIT LOG: Star deduction with SKU tracking (2026-01-27)
        if (process.env.NODE_ENV === 'development' || process.env.AUDIT_STARS === 'true') {
          console.log('[⭐ AUDIT] Photo generation:', JSON.stringify({
            userId,
            modelId: effectiveModelId,
            variantId: resolvedVariantId || 'default',
            sku,
            pricingVersion: PRICING_VERSION,
            quality: quality || 'default',
            resolution: resolution || 'default',
            priceStars: actualCreditCost,
            deductedFromSubscription: deductResult.deductedFromSubscription,
            deductedFromPackage: deductResult.deductedFromPackage,
            balanceBefore: creditBalance.totalBalance,
            balanceAfter: deductResult.totalBalance,
            isIncludedByPlan,
            timestamp: new Date().toISOString(),
          }));
        }
        
        if (!deductResult.success) {
          return NextResponse.json(
            { error: "Failed to deduct credits" },
            { status: 500 }
          );
        }
      }
      
      // Increment quota usage for NBP included generations
      if (isIncludedByPlan && nbpVariantKey) {
        try {
          await incrementQuotaUsage(supabase, userId, NBP_MODEL_KEY, nbpVariantKey);
        } catch (e) {
          console.error('[API] Failed to increment quota usage:', e);
        }
      }
    }

    // Ensure `profiles` row exists (generations.user_id may FK to profiles.id)
    try {
      await ensureProfileExists(supabase, userId);
    } catch (e) {
      console.error("[API] Failed to ensure profile exists:", e);
    }

    // Save generation to history (admin client bypasses RLS; FK can still fail if profile row missing)
    console.log("[API] Creating generation for user:", userId, "model:", effectiveModelId);
    let generation: any = null;
    let genError: any = null;

    // Resolve aspect ratio (used for API call, but NOT saved to DB - column doesn't exist yet)
    const finalAspectRatioForDb = resolveAspectRatio(aspectRatio, effectiveModelId);
    
    const insertOnce = async (opts?: { includeParams?: boolean }) => {
      const includeParams = opts?.includeParams !== false;
      // Persist minimal generation params for UI (avoid storing large blobs like base64 images).
      const safeClientParams = (() => {
        if (!clientParams || typeof clientParams !== "object") return null;
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(clientParams as Record<string, unknown>)) {
          if (v == null) continue;
          if (typeof v === "string") {
            // Drop huge strings (likely accidental data URLs).
            if (v.length > 500) continue;
            out[k] = v;
            continue;
          }
          if (typeof v === "number" || typeof v === "boolean") {
            out[k] = v;
            continue;
          }
          // Keep small arrays/objects only if JSON-safe and reasonably sized.
          try {
            const s = JSON.stringify(v);
            if (s.length > 1000) continue;
            out[k] = v;
          } catch {
            // ignore
          }
        }
        return Object.keys(out).length ? out : null;
      })();

      const paramsForDb: Record<string, unknown> = {
        mode: String(mode || "t2i"),
        variants: Number(variants || 1),
        outputFormat: requestedOutputFormat,
        quality: quality || null,
        resolution: resolution || null,
        provider: modelInfo.provider,
        apiModelId: modelInfo.apiId,
        baseModelId: baseModelId || null,
        variantId: resolvedVariantId || null,
        ...(safeClientParams ? { clientParams: safeClientParams } : {}),
      };

      const payload: Record<string, unknown> = {
        user_id: userId,
        type: "photo",
        model_id: effectiveModelId,
        model_name: baseTitle || modelInfo.name,
        prompt: prompt,
        negative_prompt: negativePrompt,
        credits_used: creditCost,
        charged_stars: actualCreditCost, // Actual stars charged (may be 0 if included)
        sku: sku, // SKU for pricing tracking
        pricing_version: PRICING_VERSION, // Pricing version for audit
        status: "queued",
        aspect_ratio: finalAspectRatioForDb, // Now saving aspect_ratio (migration applied)
        thread_id: threadId || null,
      };
      if (includeParams) payload.params = paramsForDb;

      const r = await supabase.from("generations").insert(payload).select().single();
      generation = r.data;
      genError = r.error;
    };

    await insertOnce({ includeParams: true });
    if (genError) {
      const code = genError?.code ? String(genError.code) : "";
      const msg = genError?.message ? String(genError.message) : String(genError);

      // Backward compatibility: production DB may not have `generations.params` yet.
      // PostgREST: PGRST204 "Could not find the 'params' column ..."
      if (code === "PGRST204" && /params/i.test(msg)) {
        await insertOnce({ includeParams: false });
      }

      // Common root cause: FK violation to profiles.id (23503). Retry after ensuring profile.
      if (code === "23503" || /foreign key/i.test(msg)) {
        try {
          await ensureProfileExists(supabase, userId);
          await insertOnce({ includeParams: true });
        } catch (e) {
          // keep original error below if still failing
          console.error("[API] Retry after ensureProfileExists failed:", e);
        }
      }
    }

    if (genError) {
      console.error("[API] Failed to save generation:", JSON.stringify(genError, null, 2));
      console.error("[API] Generation data:", { userId, model: effectiveModelId, prompt: prompt.substring(0, 50) });
      return NextResponse.json(
        {
          error: "Failed to create generation record",
          details: genError?.message || String(genError),
          hint: "Likely missing profiles row or FK/RLS issue on `generations.user_id`",
        },
        { status: 500 }
      );
    }

    console.log("[API] Generation created:", generation?.id);

    // Record credit transaction (only for regular users, not managers/admins, and only if charged)
    if (!skipCredits && !isIncludedByPlan && actualCreditCost > 0) {
      try {
        await supabase.from('credit_transactions').insert({
          user_id: userId,
          amount: -actualCreditCost, // Negative for deduction
          type: 'deduction',
          description: `Генерация фото: ${(baseTitle || modelInfo.name)}${resolvedVariantId ? ` • ${resolvedVariantId}` : ""}${nbpVariantKey ? ` (${nbpVariantKey})` : ""}`,
          generation_id: generation?.id,
          sku: sku, // Track SKU in transaction
          pricing_version: PRICING_VERSION, // Track pricing version
        });
      } catch (e) {
        console.error('[API] Failed to record transaction:', e);
      }
    }
    
    // Record generation run for analytics (always, even if 0 stars charged)
    if (!skipCredits && isNanoBananaPro(effectiveModelId)) {
      await recordGenerationRun(supabase, {
        generationId: generation?.id,
        userId,
        provider: modelInfo.provider,
        providerModel: modelInfo.apiId,
        variantKey: nbpVariantKey || '1k_2k',
        starsCharged: actualCreditCost,
        includedByPlan: isIncludedByPlan,
        status: 'pending',
      });
    }

    // Map aspect ratio to KIE format
    const aspectRatioMap: Record<string, string> = {
      "1:1": "1:1",
      "16:9": "16:9",
      "9:16": "9:16",
      "4:3": "4:3",
      "3:4": "3:4",
    };

    // Generate image
    const uploadDataUrlToStorage = async (dataUrl: string, suffix: string) => {
      const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
      if (!match) return dataUrl; // already a URL
      let mime = match[1];
      const b64 = match[2];
      let buffer: Buffer = Buffer.from(b64, "base64") as unknown as Buffer;
      let ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";

      // Normalize HEIC/HEIF uploads to JPEG to keep storage + downstream providers compatible.
      if (mime.includes("heic") || mime.includes("heif")) {
        buffer = (await sharp(buffer).jpeg({ quality: 92 }).toBuffer()) as unknown as Buffer;
        mime = "image/jpeg";
        ext = "jpg";
      }
      const path = `${userId}/inputs/${Date.now()}_${suffix}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('generations')
        .upload(path, buffer, { contentType: mime, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('generations').getPublicUrl(path);
      return pub.publicUrl;
    };

    const encodeImageBuffer = async (
      input: Buffer,
      fmt: OutputFormat
    ): Promise<{ buffer: Buffer; ext: string; contentType: string }> => {
      if (fmt === "jpg") {
        const out = await sharp(input).jpeg({ quality: 92 }).toBuffer();
        return { buffer: out, ext: "jpg", contentType: "image/jpeg" };
      }
      if (fmt === "webp") {
        const out = await sharp(input).webp({ quality: 90 }).toBuffer();
        return { buffer: out, ext: "webp", contentType: "image/webp" };
      }
      const out = await sharp(input).png().toBuffer();
      return { buffer: out, ext: "png", contentType: "image/png" };
    };

    const uploadGeneratedImageBuffer = async (
      input: Buffer,
      providerPrefix: string,
      fmt: OutputFormat
    ): Promise<{ publicUrl: string; storagePath: string }> => {
      const encoded = await encodeImageBuffer(input, fmt);
      const fileName = `${providerPrefix}_${Date.now()}_${Math.random().toString(36).slice(2)}.${encoded.ext}`;
      const storagePath = `${userId}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("generations")
        .upload(storagePath, encoded.buffer, {
          contentType: encoded.contentType,
          upsert: true,
        });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from("generations").getPublicUrl(storagePath);
      return { publicUrl: publicUrlData.publicUrl, storagePath };
    };

    // Normalize reference inputs:
    // - legacy: referenceImage (single)
    // - new: referenceImages (array, up to maxInputImages)
    const rawRefs: string[] = Array.isArray(referenceImages)
      ? referenceImages.filter((x: unknown): x is string => typeof x === "string" && x.trim().length > 0)
      : [];
    if (!rawRefs.length && typeof referenceImage === "string" && referenceImage.trim().length > 0) {
      rawRefs.push(referenceImage);
    }

    const maxRefs = Number((modelInfo as any)?.maxInputImages ?? 1);
    const maxMb = Number((modelInfo as any)?.maxInputImageSizeMb ?? 10);
    const maxBytes = Math.max(1, maxMb) * 1024 * 1024;
    const allowedMimes = mimeTypesFromFormats((modelInfo as any)?.inputImageFormats);

    // For i2i, validate references and prepare:
    // - `referenceForProvider`: data URL (may be a collage if multiple refs)
    // - `kieImageInputs`: array of public URLs (uploaded to storage) for KIE-style providers
    let referenceForProvider: string | null = null;
    let kieImageInputs: string[] | undefined = undefined;

    if (mode === "i2i") {
      if (rawRefs.length === 0) {
        return NextResponse.json({ error: "referenceImage/referenceImages is required for i2i" }, { status: 400 });
      }
      if (rawRefs.length > maxRefs) {
        return NextResponse.json({ error: `Too many reference images. Max is ${maxRefs}` }, { status: 400 });
      }

      // Validate each ref (best-effort). For data URLs we can validate MIME + decoded size.
      for (let i = 0; i < rawRefs.length; i++) {
        const src = String(rawRefs[i] || "");
        const parsed = parseDataUrl(src);
        if (!parsed) continue; // URL refs are allowed (we can't infer size reliably here)

        if (allowedMimes && !allowedMimes.includes(String(parsed.mime || "").toLowerCase())) {
          return NextResponse.json(
            { error: `Unsupported reference image format: ${parsed.mime}. Allowed: ${allowedMimes.join(", ")}` },
            { status: 400 }
          );
        }

        const approxBytes = estimateBytesFromBase64(parsed.base64);
        if (approxBytes > maxBytes) {
          return NextResponse.json(
            { error: `Reference image is too large (${(approxBytes / 1024 / 1024).toFixed(1)}MB). Max: ${maxMb}MB` },
            { status: 400 }
          );
        }
      }

      // Provider ref:
      // - single ref: use it directly
      // - multiple refs: build a collage so that single-image edit APIs can still "see" all refs
      referenceForProvider = rawRefs.length === 1
        ? rawRefs[0]!
        : await buildReferenceCollageDataUrl(rawRefs, { maxTiles: maxRefs });

      // For KIE-like providers, upload all refs to storage and pass URLs array.
      // (Even if the underlying model uses only first, keeping an array is forward-compatible.)
      const uploadedUrls = await Promise.all(
        rawRefs.map(async (src, idx) => {
          return await uploadDataUrlToStorage(src, `i2i_${idx}`);
        })
      );
      kieImageInputs = uploadedUrls.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
    }

    const fixed = (modelInfo as any)?.fixedResolution as string | undefined;
    const q = String(quality || '').toLowerCase();
    const r = String(resolution || '').toLowerCase();

    // Some LensRoom model ids map to different KIE model ids depending on mode.
    // Keep a single LensRoom id, but choose the correct provider model per request.
    let apiModelId = String(modelInfo.apiId || "");
    if (effectiveModelId === "flux-2-pro" && mode === "i2i" && (kieImageInputs?.length ?? 0) > 0) {
      apiModelId = "flux-2/pro-image-to-image";
    }

    const isFlux2 = apiModelId.includes("flux-2");
    const isSeedream45 = apiModelId.startsWith("seedream/4.5");

    // Safety: in this app Seedream 4.5 is T2I-only (edit model not wired).
    if (effectiveModelId === "seedream-4.5" && mode === "i2i") {
      return NextResponse.json(
        { error: "Seedream 4.5 currently supports Text-to-Image only (no reference edit)." },
        { status: 400 }
      );
    }
    // Map to KIE `resolution` ONLY when the model actually uses it.
    // (Some models like Seedream/Z-image do NOT accept `resolution` and will error if we pass e.g. "BALANCED".)
    let resolutionForKie: string | undefined;
    if (fixed || isFlux2) {
      if (fixed) {
        resolutionForKie = fixed;
      } else if (r === '2k' || q === '2k') {
        resolutionForKie = '2K';
      } else if (r === '4k' || q === '4k') {
        resolutionForKie = '4K';
      } else if (r === '1k' || q === '1k') {
        resolutionForKie = '1K';
      } else {
        // Flux defaults to 1K if not specified
        resolutionForKie = '1K';
      }
    }

    let response: any;
    
    // Handle GenAIPro provider (Nano Banana / Nano Banana Pro)
    if (modelInfo.provider === 'genaipro') {
      const { getGenAIProClient, IMAGE_ASPECT_RATIOS } = await import("@/lib/api/genaipro-client");
      
      try {
        const genaiproClient = getGenAIProClient();
        
        // Resolve aspect ratio with model-specific default
        const finalAspectRatio = resolveAspectRatio(aspectRatio, effectiveModelId);
        logAspectRatioResolution(aspectRatio, finalAspectRatio, effectiveModelId, 'GenAIPro');
        
        // Map aspect ratio to GenAIPro format
        const genaiproAspectRatio = 
          finalAspectRatio === '16:9' || finalAspectRatio === '3:2' ? IMAGE_ASPECT_RATIOS.LANDSCAPE :
          finalAspectRatio === '9:16' || finalAspectRatio === '2:3' ? IMAGE_ASPECT_RATIOS.PORTRAIT :
          IMAGE_ASPECT_RATIOS.SQUARE;
        
        // Number of images to generate
        const numVariants = Math.min(Math.max(Number(variants) || 1, 1), 4);
        
        console.log('[API] GenAIPro request:', { 
          model: effectiveModelId,
          aspectRatio: genaiproAspectRatio,
          mode,
          hasReference: !!referenceForProvider,
          variants: numVariants,
        });
        
        // Generate image with GenAIPro
        const genaiproResponse = await genaiproClient.generateImage({
          prompt: prompt,
          aspect_ratio: genaiproAspectRatio,
          number_of_images: numVariants,
          // reference_images: referenceImages // TODO: Add reference images support
        });

        const imageUrls = genaiproResponse?.images?.map(img => img.url) || [];
        
        if (imageUrls.length === 0) {
          throw new Error("No images returned from GenAIPro");
        }

        console.log(`[API] GenAIPro generation completed: ${imageUrls.length} images`);

        // Download and upload images to our storage
        const uploadPromises = imageUrls.map(async (imageUrl, index) => {
          const dl = await fetch(imageUrl);
          if (!dl.ok) throw new Error(`Failed to download: ${dl.status}`);
          const sourceBuffer = Buffer.from(await dl.arrayBuffer());
          return await uploadGeneratedImageBuffer(sourceBuffer, `genaipro_${index}`, requestedOutputFormat);
        });

        const uploadedResults = await Promise.all(uploadPromises);
        const finalUrls = uploadedResults.map(r => r.publicUrl);
        const originalPath = uploadedResults[0]?.storagePath || null;

        // Update generation record with success
        await supabase
          .from("generations")
          .update({
            status: "success",
            result_urls: finalUrls,
            original_path: originalPath,
            updated_at: new Date().toISOString(),
          })
          .eq("id", generation?.id);
        
        // Log generation run for analytics
        try {
          await supabase.from('generation_runs').insert({
            generation_id: generation?.id,
            user_id: userId,
            provider: 'genaipro',
            provider_model: modelInfo.apiId,
            variant_key: quality || 'default',
            stars_charged: creditCost,
            status: 'success',
          });
        } catch (logError) {
          console.error('[API] Failed to log generation run:', logError);
        }
        
        // Return completed status (no polling needed)
        return NextResponse.json({
          success: true,
          jobId: generation?.id,
          status: 'completed',
          generationId: generation?.id,
          provider: 'genaipro',
          kind: 'image',
          creditCost: creditCost,
          results: finalUrls.map(url => ({ url })),
        });
      } catch (genaiproError: any) {
        console.error('[API] GenAIPro generation failed:', genaiproError);
        
        // Refund only if we actually charged stars
        if (!skipCredits && !isIncludedByPlan && actualCreditCost > 0) {
          await refundStars(supabase, userId, actualCreditCost, generation?.id);
        }
        
        // Update generation status
        await supabase
          .from('generations')
          .update({
            status: 'failed',
            error: genaiproError.message || 'GenAIPro API error',
          })
          .eq('id', generation?.id);
        
        // Log failed run
        try {
          await supabase.from('generation_runs').insert({
            generation_id: generation?.id,
            user_id: userId,
            provider: 'genaipro',
            provider_model: modelInfo.apiId,
            variant_key: quality || 'default',
            stars_charged: 0,
            status: 'refunded',
          });
        } catch (logError) {
          console.error('[API] Failed to log failed run:', logError);
        }
        
        return NextResponse.json(
          { error: genaiproError.message || 'Failed to generate image' },
          { status: 500 }
        );
      }
    }
    
    // Handle LaoZhang provider (Nano Banana / Nano Banana Pro)
    if (modelInfo.provider === 'laozhang') {
      const { getLaoZhangClient, getLaoZhangModelId, aspectRatioToLaoZhangSize, resolutionToLaoZhangSize } = await import("@/lib/api/laozhang-client");
      
      try {
        const laozhangClient = getLaoZhangClient();
        
        // Select the right LaoZhang model based on resolution
        // For nano-banana-pro: 1k_2k -> gemini-3-pro-image-preview-2k, 4k -> gemini-3-pro-image-preview-4k
        const laozhangModelId = getLaoZhangModelId(effectiveModelId, quality || resolution);
        
        // Resolve aspect ratio with model-specific default
        const finalAspectRatio = resolveAspectRatio(aspectRatio, effectiveModelId);
        logAspectRatioResolution(aspectRatio, finalAspectRatio, effectiveModelId, 'LaoZhang');
        
        let imageSize: string;
        if (quality && ['1k', '1k_2k', '2k', '4k'].includes(quality.toLowerCase())) {
          // Resolution-based sizing
          imageSize = resolutionToLaoZhangSize(quality, finalAspectRatio);
        } else {
          // Default aspect ratio based sizing
          imageSize = aspectRatioToLaoZhangSize(finalAspectRatio);
        }
        
        // Number of images to generate (parallel generation)
        const numVariants = Math.min(Math.max(Number(variants) || 1, 1), 4);
        
        console.log('[API] LaoZhang request:', { 
          model: laozhangModelId,
          originalModel: modelInfo.apiId,
          size: imageSize, 
          aspectRatio: finalAspectRatio,
          quality,
          mode,
          hasReference: !!referenceForProvider,
          variants: numVariants,
        });
        
        // Helper function to generate a single image with retries
        const generateSingleImage = async (index: number): Promise<{ url: string; storagePath: string } | null> => {
          const maxAttempts = 3;
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
              let laozhangResponse;
              
              if (mode === 'i2i' && referenceForProvider) {
                laozhangResponse = await laozhangClient.editImage({
                  model: laozhangModelId,
                  prompt: prompt,
                  image: referenceForProvider,
                  n: 1,
                  size: imageSize,
                  response_format: "b64_json",
                });
              } else {
                laozhangResponse = await laozhangClient.generateImage({
                  model: laozhangModelId,
                  prompt: prompt,
                  n: 1,
                  size: imageSize,
                  response_format: "b64_json",
                });
              }

              const imageUrlFromProvider = laozhangResponse?.data?.[0]?.url;
              const b64Json = laozhangResponse?.data?.[0]?.b64_json;

              if (!imageUrlFromProvider && !b64Json) {
                if (attempt < maxAttempts) {
                  console.warn(`[API] LaoZhang image ${index + 1} empty, retrying (${attempt}/${maxAttempts})...`);
                  await new Promise((r) => setTimeout(r, 800));
                  continue;
                }
                return null;
              }

              let sourceBuffer: Buffer;
              if (b64Json) {
                sourceBuffer = Buffer.from(b64Json, "base64");
              } else {
                const dl = await fetch(imageUrlFromProvider!);
                if (!dl.ok) throw new Error(`Failed to download: ${dl.status}`);
                sourceBuffer = Buffer.from(await dl.arrayBuffer());
              }

              const uploaded = await uploadGeneratedImageBuffer(sourceBuffer, `laozhang_${index}`, requestedOutputFormat);
              return { url: uploaded.publicUrl, storagePath: uploaded.storagePath };
            } catch (err) {
              if (attempt < maxAttempts) {
                console.warn(`[API] LaoZhang image ${index + 1} failed, retrying (${attempt}/${maxAttempts})...`, err);
                await new Promise((r) => setTimeout(r, 800));
              } else {
                console.error(`[API] LaoZhang image ${index + 1} failed after ${maxAttempts} attempts:`, err);
                return null;
              }
            }
          }
          return null;
        };

        // Generate all images in parallel
        console.log(`[API] Starting parallel generation of ${numVariants} images...`);
        const startTime = Date.now();
        
        const generationPromises = Array.from({ length: numVariants }, (_, i) => generateSingleImage(i));
        const results = await Promise.all(generationPromises);
        
        const successfulResults = results.filter((r): r is { url: string; storagePath: string } => r !== null);
        
        console.log(`[API] Parallel generation completed in ${Date.now() - startTime}ms: ${successfulResults.length}/${numVariants} successful`);

        if (successfulResults.length === 0) {
          throw new Error("All image generations failed");
        }

        const finalUrls = successfulResults.map(r => r.url);
        const originalPath = successfulResults[0]?.storagePath || null;

        // Update generation record with success
        await supabase
          .from("generations")
          .update({
            status: "success",
            result_urls: finalUrls,
            original_path: originalPath,
            updated_at: new Date().toISOString(),
          })
          .eq("id", generation?.id);
        
        // Log generation run for analytics
        try {
          await supabase.from('generation_runs').insert({
            generation_id: generation?.id,
            user_id: userId,
            provider: 'laozhang',
            provider_model: modelInfo.apiId,
            variant_key: quality || 'default',
            stars_charged: creditCost,
            status: 'success',
          });
        } catch (logError) {
          console.error('[API] Failed to log generation run:', logError);
        }
        
        // Return completed status (no polling needed)
        return NextResponse.json({
          success: true,
          jobId: generation?.id,
          status: 'completed',
          generationId: generation?.id,
          provider: 'laozhang',
          kind: 'image',
          creditCost: creditCost,
          results: finalUrls.map(url => ({ url })),
        });
      } catch (laozhangError: any) {
        console.error('[API] LaoZhang generation failed:', laozhangError);
        
        // Refund only if we actually charged stars (skip managers/admins and included-by-plan runs)
        if (!skipCredits && !isIncludedByPlan && actualCreditCost > 0) {
          await refundStars(supabase, userId, actualCreditCost, generation?.id);
        }
        
        // Update generation status
        await supabase
          .from('generations')
          .update({
            status: 'failed',
            error: laozhangError.message || 'LaoZhang API error',
          })
          .eq('id', generation?.id);
        
        // Log failed run
        try {
          await supabase.from('generation_runs').insert({
            generation_id: generation?.id,
            user_id: userId,
            provider: 'laozhang',
            provider_model: modelInfo.apiId,
            variant_key: quality || 'default',
            stars_charged: 0,
            status: 'refunded',
          });
        } catch (logError) {
          console.error('[API] Failed to log failed run:', logError);
        }
        
        return NextResponse.json(
          { error: laozhangError.message || 'Failed to generate image' },
          { status: 500 }
        );
      }
    }

    // Handle OpenAI provider (GPT Image)
    if (modelInfo.provider === 'openai') {
      const { getOpenAIClient, getOpenAIProviderCost, aspectRatioToOpenAISize } = await import("@/lib/api/openai-client");
      
      // Get quality from variant params or request quality parameter
      // Variants pass quality as resolvedParams.quality (e.g., "medium", "high")
      let openaiQuality: 'medium' | 'high' = 'medium';
      if (resolvedParams?.quality) {
        openaiQuality = resolvedParams.quality === 'high' ? 'high' : 'medium';
      } else if (quality) {
        openaiQuality = quality === 'high' ? 'high' : 'medium';
      }
      
      // Resolve aspect ratio with model-specific default
      const finalAspectRatio = resolveAspectRatio(aspectRatio, effectiveModelId);
      logAspectRatioResolution(aspectRatio, finalAspectRatio, effectiveModelId, 'OpenAI');
      
      // Get size from aspect ratio (user selection)
      const openaiSize = aspectRatioToOpenAISize(finalAspectRatio);
      const openaiOutputFormat: "png" | "jpeg" | "webp" =
        requestedOutputFormat === "webp" ? "webp" : requestedOutputFormat === "jpg" ? "jpeg" : "png";
      
      try {
        const openaiClient = getOpenAIClient();
        
        // Number of images to generate (parallel generation)
        const numVariants = Math.min(Math.max(Number(variants) || 1, 1), 4);
        
        console.log('[API] OpenAI request:', { 
          model: modelInfo.apiId, 
          quality: openaiQuality, 
          size: openaiSize, 
          aspectRatio,
          variants: numVariants,
        });
        
        // Helper function to generate a single image
        const generateSingleImage = async (index: number): Promise<{ url: string; storagePath: string } | null> => {
          try {
            const openaiRequest: any = {
              model: modelInfo.apiId,
              prompt: prompt,
              n: 1,
              quality: openaiQuality,
              size: openaiSize,
              output_format: openaiOutputFormat,
            };
            
            const openaiResponse = await openaiClient.generateImage(openaiRequest);
            
            const imageUrlFromProvider = openaiResponse.data?.[0]?.url;
            const b64Json = openaiResponse.data?.[0]?.b64_json;

            if (!imageUrlFromProvider && !b64Json) {
              console.error(`[API] OpenAI image ${index + 1} has no data`);
              return null;
            }

            let sourceBuffer: Buffer;
            if (b64Json) {
              sourceBuffer = Buffer.from(b64Json, "base64");
            } else {
              const dl = await fetch(imageUrlFromProvider!);
              if (!dl.ok) throw new Error(`Failed to download: ${dl.status}`);
              sourceBuffer = Buffer.from(await dl.arrayBuffer());
            }

            const uploaded = await uploadGeneratedImageBuffer(sourceBuffer, `openai_${index}`, requestedOutputFormat);
            return { url: uploaded.publicUrl, storagePath: uploaded.storagePath };
          } catch (err) {
            console.error(`[API] OpenAI image ${index + 1} failed:`, err);
            return null;
          }
        };

        // Generate all images in parallel
        console.log(`[API] Starting parallel OpenAI generation of ${numVariants} images...`);
        const startTime = Date.now();
        
        const generationPromises = Array.from({ length: numVariants }, (_, i) => generateSingleImage(i));
        const results = await Promise.all(generationPromises);
        
        const successfulResults = results.filter((r): r is { url: string; storagePath: string } => r !== null);
        
        console.log(`[API] Parallel OpenAI generation completed in ${Date.now() - startTime}ms: ${successfulResults.length}/${numVariants} successful`);

        if (successfulResults.length === 0) {
          throw new Error("All OpenAI image generations failed");
        }

        const finalUrls = successfulResults.map(r => r.url);
        const openaiOriginalPath = successfulResults[0]?.storagePath || null;

        // Update generation record with success
        await supabase
          .from("generations")
          .update({
            status: "success",
            result_urls: finalUrls,
            original_path: openaiOriginalPath,
            updated_at: new Date().toISOString(),
          })
          .eq("id", generation?.id);
        
        // Log provider cost for analytics (per image cost * successful images)
        const providerCostUsd = getOpenAIProviderCost(openaiQuality, openaiSize) * successfulResults.length;
        const { getUsdRubRate } = await import('@/config/exchange-rates');
        const usdRubRate = getUsdRubRate();
        const providerCostRub = providerCostUsd * usdRubRate;
        
        // Log generation run for unit economics
        try {
          await supabase.from('generation_runs').insert({
            generation_id: generation?.id,
            user_id: userId,
            provider: 'openai',
            provider_model: modelInfo.apiId,
            variant_key: `${openaiQuality}_${openaiSize}`,
            stars_charged: creditCost,
            status: 'success',
            provider_cost_usd: providerCostUsd,
            provider_cost_rub: providerCostRub,
            usd_rub_rate_at_time: usdRubRate,
            rub_per_star_at_time: providerCostRub / creditCost,
          });
        } catch (logError) {
          console.error('[API] Failed to log generation run:', logError);
        }
        
        // Return in same format as KIE but with completed status
        // so that StudioRuntime knows no polling is needed
        return NextResponse.json({
          success: true,
          jobId: generation?.id, // Use generation ID as jobId
          status: 'completed', // Mark as completed immediately
          generationId: generation?.id,
          provider: 'openai',
          kind: 'image',
          creditCost: creditCost,
          // Include results directly so polling can be skipped
          results: finalUrls.map(url => ({ url })),
        });
      } catch (openaiError: any) {
        console.error('[API] OpenAI generation failed:', openaiError);
        
        // Refund only if we actually charged stars (skip managers/admins and included-by-plan runs)
        if (!skipCredits && !isIncludedByPlan && actualCreditCost > 0) {
          await refundStars(supabase, userId, actualCreditCost, generation?.id);
        }
        
        // Update generation status
        await supabase
          .from('generations')
          .update({
            status: 'failed',
            error: openaiError.message || 'OpenAI API error',
          })
          .eq('id', generation?.id);
        
        // Log failed run
        try {
          await supabase.from('generation_runs').insert({
            generation_id: generation?.id,
            user_id: userId,
            provider: 'openai',
            provider_model: modelInfo.apiId,
            variant_key: `${openaiQuality}_${openaiSize}`,
            stars_charged: 0, // Refunded
            status: 'refunded',
          });
        } catch (logError) {
          console.error('[API] Failed to log failed run:', logError);
        }
        
        return NextResponse.json(
          { error: openaiError.message || 'Failed to generate image' },
          { status: 500 }
        );
      }
    }

    // Handle KIE providers
    let kieClient: any;
    try {
      kieClient = getKieClient();
    } catch (e) {
      return integrationNotConfigured("kie", [
        "KIE_API_KEY",
        "KIE_CALLBACK_SECRET",
        "KIE_CALLBACK_URL",
      ]);
    }

    // Resolve aspect ratio with model-specific default (for KIE providers)
    const finalAspectRatio = resolveAspectRatio(aspectRatio, effectiveModelId);
    logAspectRatioResolution(aspectRatio, finalAspectRatio, effectiveModelId, 'KIE');
    
    // Standard photo generation
    const kieOutputFormat: "png" | "jpg" = requestedOutputFormat === "jpg" ? "jpg" : "png";
    const generateParams: any = {
      model: modelInfo.apiId,
      prompt: negativePrompt ? `${prompt}. Avoid: ${negativePrompt}` : prompt,
      aspectRatio: aspectRatioMap[finalAspectRatio] || String(finalAspectRatio),
      outputFormat: kieOutputFormat,
    };

    // Only set `resolution` for models that actually accept it (e.g. FLUX.2 Pro).
    if (resolutionForKie) {
      generateParams.resolution = resolutionForKie;
    }
    
    // Add quality only if it's a valid quality option (not resolution-based)
    // For Nano Banana Pro and similar models, quality is resolution-based ('1k_2k', '4k', etc.)
    // Don't pass quality separately for these models - the API uses resolution parameter instead
    // Also exclude generic quality values that shouldn't be passed for resolution-based models
    const resolutionBasedQualityValues = ['1k_2k', '4k', '1k', '2k', '8k', 'fast', 'turbo', 'balanced', 'quality', 'ultra'];
    const isResolutionBasedModel = effectiveModelId.includes('nano-banana') || effectiveModelId.includes('imagen') || apiModelId.includes("flux-2");
    const isGptImage = effectiveModelId === "gpt-image" || String(apiModelId || "").includes("gpt-image");

    // Seedream maps Turbo/Balanced/Quality -> basic/high inside kie-client, so pass it through.
    if (isSeedream45 && quality) {
      generateParams.quality = String(quality);
    } else if (isGptImage) {
      // GPT Image on KIE requires quality (medium/high). Default to medium if not provided.
      generateParams.quality = String(quality || "medium");
    } else if (quality && !resolutionBasedQualityValues.includes(quality.toLowerCase()) && !isResolutionBasedModel) {
      // For other models: only pass non-resolution-like quality enums.
      generateParams.quality = quality;
    }
    
    if (kieImageInputs && kieImageInputs.length > 0) {
      generateParams.imageInputs = kieImageInputs;
    }

    // Tool params: Topaz Upscale requires `scale` ("2x" | "4x")
    const isTopazUpscale =
      effectiveModelId === "topaz-image-upscale" || String(apiModelId || "").includes("topaz/image-upscale");
    if (isTopazUpscale) {
      const raw =
        (resolvedParams?.upscaleFactor ??
          resolvedParams?.upscale_factor ??
          resolvedParams?.scale ??
          (clientParams as any)?.upscaleFactor ??
          (clientParams as any)?.upscale_factor ??
          (clientParams as any)?.scale ??
          (body as any)?.upscaleFactor ??
          (body as any)?.upscale_factor ??
          (body as any)?.scale ??
          "") as any;

      const s = String(raw || "").trim().toLowerCase();
      // Accept: "8", "8x", "8k" => "8"; "4", "4x", "4k" => "4"; everything else defaults to "2"
      const upscaleFactor = 
        s === "8" || s === "8x" || s === "8k" ? "8" :
        s === "4" || s === "4x" || s === "4k" ? "4" : "2";
      generateParams.upscaleFactor = upscaleFactor;
    }
    
    console.log('[API] Generating image with params:', {
      model: generateParams.model,
      resolution: generateParams.resolution,
      quality: generateParams.quality,
      aspectRatio: generateParams.aspectRatio,
    });
    
    try {
      response = await kieClient.generateImage(generateParams);
    } catch (kieError: any) {
      const errMsg = kieError?.message || "KIE API error";
      console.error('[API] KIE generateImage error:', {
        message: kieError?.message,
        code: kieError?.code,
        errorCode: kieError?.errorCode,
      });

      // Refund only if we actually charged stars (skip managers/admins and included-by-plan runs)
      if (!skipCredits && !isIncludedByPlan && actualCreditCost > 0) {
        await refundStars(supabase, userId, actualCreditCost, generation?.id);
      }

      // Update generation status (best-effort)
      if (generation?.id) {
        try {
          await supabase
            .from("generations")
            .update({
              status: "failed",
              error: errMsg,
              updated_at: new Date().toISOString(),
            })
            .eq("id", generation.id);
        } catch (e) {
          console.error("[API] Failed to update generation on KIE error:", e);
        }
      }

      // Log failed run for NBP analytics (best-effort)
      if (!skipCredits && isNanoBananaPro(effectiveModelId)) {
        try {
          await recordGenerationRun(supabase, {
            generationId: generation?.id,
            userId,
            provider: modelInfo.provider,
            providerModel: modelInfo.apiId,
            variantKey: nbpVariantKey || '1k_2k',
            starsCharged: 0,
            includedByPlan: isIncludedByPlan,
            status: 'refunded',
          });
        } catch (e) {
          console.error('[API] Failed to record refunded NBP run:', e);
        }
      }

      return NextResponse.json({ error: errMsg }, { status: 500 });
    }

    // Attach task_id to DB record so callbacks / sync can find it reliably
    if (generation?.id) {
      try {
        await supabase
          .from("generations")
          .update({ task_id: response.id, status: "generating" })
          .eq("id", generation.id);
      } catch (e) {
        console.warn("[API] Failed to set task_id on generation:", e);
      }
    }

    return NextResponse.json({
      success: true,
      jobId: response.id,
      status: response.status,
      estimatedTime: response.estimatedTime || 30,
      creditCost: creditCost,
      generationId: generation?.id,
      provider: modelInfo.provider,
      kind: "image",
    });
  } catch (error) {
    console.error("[API] Photo generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}