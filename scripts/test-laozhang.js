#!/usr/bin/env node

/**
 * Test script for LaoZhang API
 * 
 * Usage:
 *   node scripts/test-laozhang.js              # Test all models
 *   node scripts/test-laozhang.js image        # Test image models only
 *   node scripts/test-laozhang.js video        # Test video models only
 *   node scripts/test-laozhang.js "prompt"     # Custom prompt for image test
 */

const API_KEY = process.env.LAOZHANG_API_KEY;
const BASE_URL = "https://api.laozhang.ai/v1";

// Image models
const IMAGE_MODELS = {
  nano_banana: "gemini-2.5-flash-image-preview",        // Fast
  nano_banana_pro: "gemini-3-pro-image-preview",        // Quality
  nano_banana_pro_2k: "gemini-3-pro-image-preview-2k",  // 2K
  nano_banana_pro_4k: "gemini-3-pro-image-preview-4k",  // 4K
  seedream_4_5: "seedream-4-5-251128",                  // Seedream
};

// Video models
const VIDEO_MODELS = {
  veo_31_fast: "veo-3.1-fast",
  veo_31: "veo-3.1",
  veo_31_landscape: "veo-3.1-landscape",
  sora_2: "sora-2",
  sora_video2: "sora_video2",
  sora_video2_15s: "sora_video2-15s",
};

async function testImageGeneration(modelName, modelId, prompt) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🖼️  Testing IMAGE: ${modelName} (${modelId})`);
  console.log(`Prompt: "${prompt.substring(0, 50)}..."`);
  console.log("=".repeat(60));

  const startTime = Date.now();

  try {
    const body = {
      model: modelId,
      prompt: prompt,
      n: 1,
    };

    // Some LaoZhang image models are picky about parameter names.
    // Keep a conservative default for most "OpenAI-style" image models (size),
    // but switch to aspect_ratio for Seedream variants.
    if (String(modelId).startsWith("seedream-")) {
      body.aspect_ratio = "1:1";
    } else {
      body.size = "1024x1024";
    }

    const response = await fetch(`${BASE_URL}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Response: ${response.status} (${elapsed}s)`);

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error("❌ Failed");
      // LaoZhang often returns a JSON error body; print a preview to understand 401/403 causes.
      const preview = (responseText || "").trim().slice(0, 800);
      if (preview) {
        console.error("Error body (preview):");
        console.error(preview);
      }
      const www = response.headers.get("www-authenticate");
      if (www) {
        console.error("WWW-Authenticate:", www);
      }
      return { success: false, model: modelName, status: response.status, error: preview || `HTTP ${response.status}` };
    }

    const result = JSON.parse(responseText);
    const size = result.data?.[0]?.b64_json?.length || 0;
    console.log(`✅ Success! ${(size / 1024).toFixed(0)} KB`);

    return { success: true, model: modelName, result };
  } catch (error) {
    console.error("❌ Failed:", error.message);
    return { success: false, model: modelName, error: error.message };
  }
}

async function testVideoGeneration(modelName, modelId, prompt) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🎬 Testing VIDEO: ${modelName} (${modelId})`);
  console.log(`Prompt: "${prompt.substring(0, 50)}..."`);
  console.log("=".repeat(60));

  const startTime = Date.now();

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Response: ${response.status} (${elapsed}s)`);

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error("❌ Failed");
      const preview = (responseText || "").trim().slice(0, 800);
      if (preview) {
        console.error("Error body (preview):");
        console.error(preview);
      }
      const www = response.headers.get("www-authenticate");
      if (www) {
        console.error("WWW-Authenticate:", www);
      }
      return { success: false, model: modelName, status: response.status, error: preview || `HTTP ${response.status}` };
    }

    const result = JSON.parse(responseText);
    const content = result.choices?.[0]?.message?.content || "";
    const urlMatch = content.match(/\[download video\]\((https?:\/\/[^)]+)\)/);
    
    if (urlMatch) {
      console.log(`✅ Success! Video: ${urlMatch[1].substring(0, 60)}...`);
      return { success: true, model: modelName, url: urlMatch[1] };
    } else {
      console.error("❌ No video URL in response");
      return { success: false, model: modelName, error: "No video URL" };
    }
  } catch (error) {
    console.error("❌ Failed:", error.message);
    return { success: false, model: modelName, error: error.message };
  }
}

async function main() {
  if (!API_KEY) {
    console.error("Missing LAOZHANG_API_KEY in environment.");
    process.exit(1);
  }

  const arg = process.argv[2] || "all";
  const testMode = ["all", "image", "video"].includes(arg) ? arg : "image";
  const imagePrompt = testMode === "image" && arg !== "image" ? arg : "A professional product photo of a luxury watch, studio lighting, 8k";
  const videoPrompt = "A beautiful cinematic shot of ocean waves at sunset, 4K quality";
  
  console.log("\n🚀 LaoZhang API Test");
  console.log(`API: ${BASE_URL}`);
  console.log(`Key: set (redacted)`);
  console.log(`Mode: ${testMode.toUpperCase()}`);
  
  const results = [];
  
  // Test IMAGE models
  if (testMode === "all" || testMode === "image") {
    console.log("\n\n📸 IMAGE MODELS");
    for (const [name, modelId] of Object.entries(IMAGE_MODELS)) {
      results.push(await testImageGeneration(name, modelId, imagePrompt));
    }
  }
  
  // Test VIDEO models
  if (testMode === "all" || testMode === "video") {
    console.log("\n\n🎬 VIDEO MODELS");
    for (const [name, modelId] of Object.entries(VIDEO_MODELS)) {
      results.push(await testVideoGeneration(name, modelId, videoPrompt));
    }
  }
  
  // Summary
  console.log("\n\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  
  const imageResults = results.filter(r => Object.keys(IMAGE_MODELS).includes(r.model));
  const videoResults = results.filter(r => Object.keys(VIDEO_MODELS).includes(r.model));
  
  if (imageResults.length > 0) {
    console.log("\n🖼️  IMAGE:");
    for (const r of imageResults) {
      console.log(`   ${r.success ? "✅" : "❌"} ${r.model}`);
    }
  }
  
  if (videoResults.length > 0) {
    console.log("\n🎬 VIDEO:");
    for (const r of videoResults) {
      console.log(`   ${r.success ? "✅" : "❌"} ${r.model}`);
    }
  }
  
  const passed = results.filter(r => r.success).length;
  console.log(`\n📊 Total: ${passed}/${results.length} passed`);
  
  process.exit(passed === results.length ? 0 : 1);
}

main().catch(console.error);
