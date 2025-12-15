/**
 * Example: Veo 3.1 Image-to-Video Generation
 * 
 * This example shows how to generate a video from an image using Veo 3.1
 */

import { kieClient } from '@/lib/api/kie-client';

async function generateImageToVideo(imageUrl: string) {
  try {
    console.log('Starting Veo 3.1 image-to-video generation...');
    console.log('Image URL:', imageUrl);

    // Step 1: Generate video from image
    const response = await kieClient.veoGenerate({
      prompt: 'Animate this scene with gentle camera movement and natural motion. Add cinematic quality.',
      model: 'veo3', // or 'veo3_fast' for faster generation
      aspectRatio: '16:9',
      imageUrls: [imageUrl], // Image to animate
      enhancePrompt: true,
    });

    const taskId = response.data.taskId;
    console.log('Task created:', taskId);

    // Step 2: Wait for completion
    console.log('Waiting for video generation to complete...');
    const videoUrls = await kieClient.veoWaitForCompletion(taskId);

    console.log('Video generation completed!');
    console.log('Video URLs:', videoUrls);

    // Step 3: Get 1080p version
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
  const imageUrl = process.argv[2] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop';
  
  generateImageToVideo(imageUrl)
    .then(result => {
      console.log('\n✅ Success!');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error('\n❌ Failed:', error.message);
      process.exit(1);
    });
}

export { generateImageToVideo };
