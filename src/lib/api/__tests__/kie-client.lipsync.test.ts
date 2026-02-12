import { describe, expect, it, vi } from 'vitest';
import { KieAIClient } from '@/lib/api/kie-client';

describe('KIE lipSyncVideo payload mapping', () => {
  it('maps avatar payload to image_url/audio_url/prompt', async () => {
    const client = new KieAIClient({
      baseUrl: 'https://api.kie.ai',
      apiKey: 'test-key',
      mockMode: false,
      callbackUrlBase: 'https://example.com',
      callbackSecret: 'secret',
    });

    const createTaskSpy = vi
      .spyOn(client, 'createTask')
      .mockResolvedValue({ code: 200, message: 'ok', data: { taskId: 't1' } } as any);

    await client.lipSyncVideo({
      model: 'kling/ai-avatar-standard',
      imageUrl: 'https://cdn.example.com/image.png',
      audioUrl: 'https://cdn.example.com/audio.mp3',
      prompt: 'friendly talking',
    });

    expect(createTaskSpy).toHaveBeenCalledTimes(1);
    const req = createTaskSpy.mock.calls[0][0] as any;
    expect(req.model).toBe('kling/ai-avatar-standard');
    expect(req.input.image_url).toBe('https://cdn.example.com/image.png');
    expect(req.input.audio_url).toBe('https://cdn.example.com/audio.mp3');
    expect(req.input.prompt).toBe('friendly talking');
    expect(req.input.resolution).toBeUndefined();
  });

  it('maps infinitalk payload with resolution and seed', async () => {
    const client = new KieAIClient({
      baseUrl: 'https://api.kie.ai',
      apiKey: 'test-key',
      mockMode: false,
      callbackUrlBase: 'https://example.com',
      callbackSecret: 'secret',
    });

    const createTaskSpy = vi
      .spyOn(client, 'createTask')
      .mockResolvedValue({ code: 200, message: 'ok', data: { taskId: 't2' } } as any);

    await client.lipSyncVideo({
      model: 'infinitalk/from-audio',
      imageUrl: 'https://cdn.example.com/image.png',
      audioUrl: 'https://cdn.example.com/audio.mp3',
      prompt: 'speaker with calm expression',
      resolution: '720p',
      seed: 12345,
    });

    const req = createTaskSpy.mock.calls[0][0] as any;
    expect(req.model).toBe('infinitalk/from-audio');
    expect(req.input.resolution).toBe('720p');
    expect(req.input.seed).toBe(12345);
    expect(req.input.image_url).toBeTruthy();
    expect(req.input.audio_url).toBeTruthy();
  });

  it('maps motion control payload to input_urls [image, video]', async () => {
    const client = new KieAIClient({
      baseUrl: 'https://api.kie.ai',
      apiKey: 'test-key',
      mockMode: false,
      callbackUrlBase: 'https://example.com',
      callbackSecret: 'secret',
    });

    const createTaskSpy = vi
      .spyOn(client, 'createTask')
      .mockResolvedValue({ code: 200, message: 'ok', data: { taskId: 't3' } } as any);

    await (client as any).generateMarketVideo({
      model: 'kling-2.6/motion-control',
      provider: 'kie_market',
      prompt: 'motion transfer',
      mode: 'motion_control',
      imageUrl: 'https://cdn.example.com/ref.png',
      videoUrl: 'https://cdn.example.com/motion.mp4',
      resolution: '1080p',
      characterOrientation: 'image',
    });

    const req = createTaskSpy.mock.calls[0][0] as any;
    expect(req.model).toBe('kling-2.6/motion-control');
    expect(req.input.input_urls).toEqual([
      'https://cdn.example.com/ref.png',
      'https://cdn.example.com/motion.mp4',
    ]);
    expect(req.input.video_urls).toBeUndefined();
    expect(req.input.mode).toBe('1080p');
    expect(req.input.character_orientation).toBe('image');
  });
});
