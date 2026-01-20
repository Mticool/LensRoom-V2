/**
 * Quick verification for video models without spending credits.
 *
 * - KIE provider is executed in MOCK mode (no external calls).
 * - LaoZhang/FAL are checked as "dry run" (request mapping only), because calling them can be paid.
 *
 * Usage:
 *   npx tsx scripts/quick-video-provider-check.ts
 */

process.env.NEXT_PUBLIC_MOCK_MODE = "1";

import { getKieClient } from "../src/lib/api/kie-client";
import { getLaoZhangVideoModelId } from "../src/lib/api/laozhang-client";
import { getModelById, type VideoModelConfig } from "../src/config/models";

type TestCase = {
  lensroomModelId: string;
  mode: "t2v" | "i2v";
  modelVariant?: string;
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
  sound?: boolean | string;
  quality?: string;
  imageUrl?: string;
};

function pickApiModelId(model: VideoModelConfig, tc: TestCase): string {
  if (tc.modelVariant && model.modelVariants?.length) {
    const v = model.modelVariants.find((x) => x.id === tc.modelVariant) || model.modelVariants[0];
    if (tc.mode === "i2v" && v?.apiIdI2v) return v.apiIdI2v;
    return v?.apiId || model.apiId;
  }
  if (tc.mode === "i2v" && model.apiIdI2v) return model.apiIdI2v;
  return model.apiId;
}

async function pollKieVideo(taskId: string, provider: any) {
  const client = getKieClient();
  // Mock tasks typically take ~15s (video) — wait up to ~30s for completion.
  for (let i = 0; i < 120; i++) {
    const st = await client.getVideoGenerationStatus(taskId, provider);
    const hasUrl = Boolean(st.outputs?.[0]?.url);
    if (hasUrl) return st;
    await new Promise((r) => setTimeout(r, 250));
  }
  return await getKieClient().getVideoGenerationStatus(taskId, provider);
}

async function run() {
  const cases: TestCase[] = [
    {
      lensroomModelId: "kling",
      modelVariant: "kling-2.6",
      mode: "t2v",
      duration: 5,
      aspectRatio: "16:9",
      sound: true,
    },
    {
      lensroomModelId: "wan",
      modelVariant: "wan-2.6",
      mode: "t2v",
      duration: 5,
      aspectRatio: "16:9",
      resolution: "1080p",
      sound: "native-dialogues",
    },
    {
      lensroomModelId: "bytedance-pro",
      mode: "i2v",
      duration: 5,
      aspectRatio: "9:16",
      resolution: "720p",
      imageUrl: "https://example.com/image.jpg",
    },
    {
      lensroomModelId: "sora-2-pro",
      mode: "i2v",
      duration: 10,
      aspectRatio: "portrait",
      quality: "standard",
      imageUrl: "https://example.com/image.jpg",
    },
    {
      lensroomModelId: "grok-video",
      mode: "t2v",
      duration: 5,
      aspectRatio: "1:1",
    },
  ];

  console.log("=== Quick video models provider check ===");
  console.log("KIE: mockMode =", process.env.NEXT_PUBLIC_MOCK_MODE);
  console.log("");

  const client = getKieClient();

  for (const tc of cases) {
    const model = getModelById(tc.lensroomModelId) as VideoModelConfig | undefined;
    if (!model || model.type !== "video") {
      console.log(`[SKIP] ${tc.lensroomModelId}: not a video model`);
      continue;
    }

    if (model.provider !== "kie_market") {
      console.log(`[SKIP] ${model.id}: provider=${model.provider} (not KIE market)`);
      continue;
    }

    const apiModelId = pickApiModelId(model, tc);
    const req = {
      model: apiModelId,
      provider: model.provider,
      prompt: "Smoke test prompt",
      mode: tc.mode,
      duration: tc.duration,
      aspectRatio: tc.aspectRatio,
      resolution: tc.resolution,
      sound: tc.sound,
      quality: tc.quality,
      imageUrl: tc.imageUrl,
    };

    console.log(`\n[REQUEST] ${model.id} -> ${apiModelId}`);
    console.log(JSON.stringify(req, null, 2));

    const started = await client.generateVideo(req as any);
    console.log("[RESPONSE] start:", JSON.stringify(started, null, 2));

    const status = await pollKieVideo(started.id, model.provider as any);
    console.log("[RESPONSE] status:", JSON.stringify(status, null, 2));
    console.log("[OK] outputs:", status.outputs?.map((o) => o.url).filter(Boolean));
  }

  console.log("\n=== Dry run: LaoZhang mapping ===");
  console.log("Veo 3.1 ->", getLaoZhangVideoModelId("veo-3.1", "16:9", "fast", 8));
  console.log("Sora 2 (10s portrait) ->", getLaoZhangVideoModelId("sora-2", "portrait", undefined, 10));
  console.log("Sora 2 (15s landscape) ->", getLaoZhangVideoModelId("sora-2", "landscape", undefined, 15));

  console.log("\n=== Dry run: FAL Kling O1 request fields ===");
  console.log(
    JSON.stringify(
      {
        prompt: "Smoke test prompt",
        start_image_url: "https://example.com/start.png",
        end_image_url: "https://example.com/end.png",
        duration: "5",
        aspect_ratio: "16:9",
      },
      null,
      2
    )
  );
}

run().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});

