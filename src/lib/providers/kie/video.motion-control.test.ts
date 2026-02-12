import { describe, expect, it } from 'vitest';
import { buildKieVideoPayload } from './video';

describe('KIE motion-control payload mapping', () => {
  it('builds payload with required motion-control fields only', () => {
    const payload = buildKieVideoPayload({
      modelId: 'kling-motion-control',
      mode: 'motion_control',
      prompt: 'walk forward',
      durationSec: 6,
      resolution: '1080p',
      inputImageUrl: 'https://example.com/character.png',
      referenceVideoUrl: 'https://example.com/motion.mp4',
      characterOrientation: 'video',
    });

    expect(payload.model).toBe('kling-2.6/motion-control');
    expect(payload.mode).toBe('motion_control');
    expect(payload.resolution).toBe('1080p');
    expect(payload.imageUrl).toBe('https://example.com/character.png');
    expect(payload.videoUrl).toBe('https://example.com/motion.mp4');
    expect(payload.characterOrientation).toBe('video');
    expect((payload as any).cameraControl).toBeUndefined();
  });
});
