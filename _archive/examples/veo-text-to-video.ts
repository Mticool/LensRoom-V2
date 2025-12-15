/**
 * Example: Veo 3.1 Text-to-Video Generation
 * 
 * This example shows how to generate a video from text using Veo 3.1
 */

import { kieClient } from '@/lib/api/kie-client';

async function generateTextToVideo() {
  try {
    console.log('Starting Veo 3.1 text-to-video generation...');

    // Step 1: Generate video
    const response = await kieClient.veoGenerate({
      prompt: 'A serene mountain landscape at sunset, with clouds moving across the sky. Cinematic, 4K quality.',
      model: 'veo3', // or 'veo3_fast' for faster generation
      aspectRatio: '16:9',
      enhancePrompt: true,
    });

    const taskId = response.data.taskId;
    console.log('Task created:', taskId);

    // Step 2: Wait for completion (polls status every 30 seconds)
    console.log('Waiting for video generation to complete...');
    const videoUrls = await kieClient.veoWaitForCompletion(taskId);

    console.log('Video generation completed!');
    console.log('Video URLs:', videoUrls);

    // Step 3: Get 1080p version (for 16:9 videos)
    console.log('Fetching 1080p version...');
    const hd = await kieClient.veoGet1080p(taskId);
    
    if (hd.data.video1080pUrl) {
      console.log('1080p URL:', hd.data.video1080pUrl);
    } else {
      console.log('1080p version not ready yet');
    }

    return {
      taskId,
      videoUrls,
      video1080pUrl: hd.data.video1080pUrl,
    };
  } catch (error) {
    console.error('Error generating video:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  generateTextToVideo()
    .then(result => {
      console.log('\n✅ Success!');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error('\n❌ Failed:', error.message);
      process.exit(1);
    });
}

export { generateTextToVideo };
