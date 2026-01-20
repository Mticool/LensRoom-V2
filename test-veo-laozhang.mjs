// Test LaoZhang Veo 3.1 video generation
const API_KEY = process.env.LAOZHANG_API_KEY;
const BASE_URL = "https://api.laozhang.ai/v1";

async function testVeoVideo(model, prompt) {
  console.log(`\n🎬 Testing ${model}...`);
  console.log(`Prompt: ${prompt.substring(0, 50)}...`);
  
  const body = {
    model: model,
    messages: [{ role: "user", content: prompt }]
  };
  
  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify(body)
    });
    
    const text = await response.text();
    console.log(`Status: ${response.status}`);
    
    if (!response.ok) {
      console.log(`❌ Error: ${text.substring(0, 200)}`);
      return null;
    }
    
    const result = JSON.parse(text);
    const content = result.choices?.[0]?.message?.content || "";
    
    // Extract video URL
    const urlMatch = content.match(/\[download video\]\((https?:\/\/[^)]+)\)/);
    const videoUrl = urlMatch ? urlMatch[1] : null;
    
    if (videoUrl) {
      console.log(`✅ SUCCESS! Video URL: ${videoUrl.substring(0, 100)}...`);
      return videoUrl;
    } else {
      console.log(`⚠️ No video URL found in response:`);
      console.log(content.substring(0, 300));
      return null;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
}

// Test i2v capability - check if the API supports image input
async function testVeoI2V(model, prompt, imageUrl) {
  console.log(`\n🖼️ Testing ${model} with image (i2v)...`);
  
  const body = {
    model: model,
    messages: [
      { 
        role: "user", 
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ]
  };
  
  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify(body)
    });
    
    const text = await response.text();
    console.log(`Status: ${response.status}`);
    
    if (!response.ok) {
      console.log(`❌ Error: ${text.substring(0, 200)}`);
      return null;
    }
    
    const result = JSON.parse(text);
    const content = result.choices?.[0]?.message?.content || "";
    
    const urlMatch = content.match(/\[download video\]\((https?:\/\/[^)]+)\)/);
    const videoUrl = urlMatch ? urlMatch[1] : null;
    
    if (videoUrl) {
      console.log(`✅ I2V SUCCESS! Video URL: ${videoUrl.substring(0, 100)}...`);
      return videoUrl;
    } else {
      console.log(`⚠️ I2V Response:`);
      console.log(content.substring(0, 300));
      return null;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log("=== LaoZhang Veo 3.1 Test ===\n");
  if (!API_KEY) {
    console.error("Missing LAOZHANG_API_KEY in environment.");
    process.exit(1);
  }
  
  // Test t2v first
  const models = [
    "veo-3.1-fast",
    "veo-3.1"
  ];
  
  const prompt = "A golden retriever playing with a ball in a sunny park";
  
  for (const model of models) {
    await testVeoVideo(model, prompt);
  }
  
  // Test i2v (if supported)
  console.log("\n=== Testing Image-to-Video (i2v) ===");
  const testImage = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png";
  await testVeoI2V("veo-3.1", "Make this image come to life with gentle animation", testImage);
}

main();
