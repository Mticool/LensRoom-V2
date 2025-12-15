/**
 * ===== PRODUCTION EXAMPLES WITH WEBHOOK =====
 * Real-world examples for using KIE.ai API in production
 */

import { KieClient, KiePhotoModel, KieVideoModel } from '@/lib/api/kie-client-extended';
import express from 'express';

// Initialize client
const client = new KieClient(process.env.KIE_API_KEY);

// ===== EXAMPLE 1: TEXT TO IMAGE =====

export async function exampleTextToImage() {
  console.log('=== TEXT TO IMAGE EXAMPLE ===\n');

  try {
    // Create task with callback
    const response = await client.textToImage({
      model: KiePhotoModel.NANO_BANANA,
      prompt: 'A serene mountain landscape at sunset, photorealistic, 4K',
      aspectRatio: '16:9',
      resolution: '1K',
      outputFormat: 'png',
      callBackUrl: 'https://lensroom.ru/api/webhooks/kie?secret=your-secret',
    });

    console.log('Task created:', response.data.taskId);

    // Option 1: Wait for result (polling)
    const result = await client.waitForResult(response.data.taskId);
    console.log('Generated images:', result.resultUrls);

    return result;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// ===== EXAMPLE 2: IMAGE TO IMAGE =====

export async function exampleImageToImage() {
  console.log('=== IMAGE TO IMAGE EXAMPLE ===\n');

  try {
    const response = await client.imageToImage({
      model: KiePhotoModel.QWEN_IMAGE_EDIT,
      prompt: 'Add autumn colors and golden hour lighting',
      imageUrls: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1024'],
      aspectRatio: '16:9',
      callBackUrl: 'https://lensroom.ru/api/webhooks/kie?secret=your-secret',
    });

    console.log('Task created:', response.data.taskId);

    const result = await client.waitForResult(response.data.taskId);
    console.log('Edited images:', result.resultUrls);

    return result;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// ===== EXAMPLE 3: TEXT TO VIDEO =====

export async function exampleTextToVideo() {
  console.log('=== TEXT TO VIDEO EXAMPLE ===\n');

  try {
    // Using Veo 3.1
    const response = await client.textToVideo({
      model: KieVideoModel.VEO_3_FAST,
      prompt: 'A serene mountain landscape at sunset, cinematic camera movement',
      aspectRatio: '16:9',
      callBackUrl: 'https://lensroom.ru/api/webhooks/veo?secret=your-secret',
    });

    console.log('Veo task created:', response.data.taskId);

    // Wait for Veo result (longer timeout)
    const videoUrls = await client.veoWaitForResult(response.data.taskId);
    console.log('Generated videos:', videoUrls);

    // Try to get 1080p version
    try {
      const hd = await client.veoGet1080p(response.data.taskId);
      if (hd.video1080pUrl) {
        console.log('1080p URL:', hd.video1080pUrl);
      }
    } catch (e) {
      console.log('1080p not available yet');
    }

    return videoUrls;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// ===== EXAMPLE 4: IMAGE TO VIDEO =====

export async function exampleImageToVideo() {
  console.log('=== IMAGE TO VIDEO EXAMPLE ===\n');

  try {
    // Using Kling 2.6
    const response = await client.imageToVideo({
      model: KieVideoModel.KLING_2_6_I2V,
      prompt: 'Animate this scene with gentle camera movement and natural motion',
      imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920',
      duration: '5',
      aspectRatio: '16:9',
      callBackUrl: 'https://lensroom.ru/api/webhooks/kie?secret=your-secret',
    });

    console.log('Task created:', response.data.taskId);

    const result = await client.waitForResult(response.data.taskId, 10 * 60 * 1000);
    console.log('Generated videos:', result.resultUrls);

    return result;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// ===== EXAMPLE 5: PARALLEL GENERATION =====

export async function exampleParallelGeneration() {
  console.log('=== PARALLEL GENERATION EXAMPLE ===\n');

  try {
    // Start multiple tasks in parallel
    const tasks = await Promise.all([
      client.textToImage({
        model: KiePhotoModel.NANO_BANANA,
        prompt: 'Mountain landscape at sunset',
        aspectRatio: '16:9',
      }),
      client.textToImage({
        model: KiePhotoModel.IMAGEN_4,
        prompt: 'Ocean waves crashing on beach',
        aspectRatio: '16:9',
        quality: 'ultra',
      }),
      client.textToVideo({
        model: KieVideoModel.KLING_2_6_T2V,
        prompt: 'Sunset time-lapse over city',
        duration: '5',
        aspectRatio: '16:9',
      }),
    ]);

    console.log('All tasks created:', tasks.map(t => t.data.taskId));

    // Wait for all results
    const results = await Promise.all(
      tasks.map(t => client.waitForResult(t.data.taskId))
    );

    console.log('All generations completed!');
    results.forEach((result, i) => {
      console.log(`Task ${i + 1}:`, result.resultUrls);
    });

    return results;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// ===== PRODUCTION WEBHOOK SERVER =====

export function createWebhookServer(port: number = 3001) {
  const app = express();
  app.use(express.json());

  // Webhook endpoint for KIE Market API
  app.post('/api/webhooks/kie', async (req, res) => {
    try {
      // Verify secret
      const secret = req.query.secret;
      if (secret !== process.env.KIE_WEBHOOK_SECRET) {
        console.warn('[Webhook] Invalid secret');
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { taskId, status, resultUrls, error } = req.body;

      console.log('[Webhook] Received:', {
        taskId,
        status,
        urls: resultUrls?.length || 0,
        error,
      });

      // Process the webhook
      if (status === 'completed' && resultUrls) {
        // Save to database, send notification, etc.
        console.log('[Webhook] Task completed:', taskId);
        console.log('[Webhook] Result URLs:', resultUrls);

        // TODO: Update database
        // await updateGenerationInDB(taskId, {
        //   status: 'completed',
        //   result_urls: resultUrls,
        //   completed_at: new Date(),
        // });

        // TODO: Send notification to user
        // await notifyUser(taskId, resultUrls);
      } else if (status === 'failed') {
        console.error('[Webhook] Task failed:', taskId, error);

        // TODO: Update database
        // await updateGenerationInDB(taskId, {
        //   status: 'failed',
        //   error_message: error,
        //   completed_at: new Date(),
        // });

        // TODO: Refund credits if needed
        // await refundCredits(taskId);
      }

      res.json({ status: 'received', taskId });
    } catch (error) {
      console.error('[Webhook] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Webhook endpoint for Veo API
  app.post('/api/webhooks/veo', async (req, res) => {
    try {
      // Verify secret
      const secret = req.query.secret;
      if (secret !== process.env.VEO_WEBHOOK_SECRET) {
        console.warn('[Veo Webhook] Invalid secret');
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { code, msg, data } = req.body;

      if (code !== 200) {
        console.error('[Veo Webhook] Error response:', msg);
        return res.status(400).json({ error: msg });
      }

      const taskId = data?.taskId;
      const successFlag = data?.info?.successFlag;
      const resultUrls = data?.info?.resultUrls || [];

      console.log('[Veo Webhook] Received:', {
        taskId,
        successFlag,
        urls: resultUrls.length,
      });

      if (successFlag === 1) {
        // Success
        console.log('[Veo Webhook] Task completed:', taskId);
        console.log('[Veo Webhook] Result URLs:', resultUrls);

        // TODO: Update database
        // TODO: Trigger 1080p download if needed
        // setTimeout(async () => {
        //   const hd = await client.veoGet1080p(taskId);
        //   if (hd.video1080pUrl) {
        //     await updateGenerationInDB(taskId, {
        //       hd_url: hd.video1080pUrl,
        //     });
        //   }
        // }, 60000); // Wait 1 minute for 1080p

      } else if (successFlag === 2 || successFlag === 3) {
        // Failed
        const errorMsg = data?.info?.errorMsg;
        console.error('[Veo Webhook] Task failed:', taskId, errorMsg);

        // TODO: Update database, refund credits
      }

      res.json({ status: 'received', taskId, successFlag });
    } catch (error) {
      console.error('[Veo Webhook] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Start server
  app.listen(port, () => {
    console.log(`\n🚀 Webhook server running on port ${port}`);
    console.log(`   Endpoints:`);
    console.log(`   - POST /api/webhooks/kie?secret=xxx`);
    console.log(`   - POST /api/webhooks/veo?secret=xxx`);
    console.log(`   - GET  /health\n`);
  });

  return app;
}

// ===== RUN EXAMPLES =====

if (require.main === module) {
  const example = process.argv[2] || 'text-to-image';

  (async () => {
    try {
      switch (example) {
        case 'text-to-image':
          await exampleTextToImage();
          break;
        case 'image-to-image':
          await exampleImageToImage();
          break;
        case 'text-to-video':
          await exampleTextToVideo();
          break;
        case 'image-to-video':
          await exampleImageToVideo();
          break;
        case 'parallel':
          await exampleParallelGeneration();
          break;
        case 'webhook':
          createWebhookServer(3001);
          break;
        default:
          console.log('Unknown example:', example);
          console.log('Available: text-to-image, image-to-image, text-to-video, image-to-video, parallel, webhook');
      }
    } catch (error) {
      console.error('Example failed:', error);
      process.exit(1);
    }
  })();
}

export { client as kieClient };
