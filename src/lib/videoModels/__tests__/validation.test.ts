import { VideoGenerationRequestSchema, validateAgainstCapability } from '../schema';
import { getModelCapability } from '../capabilities';

describe('Video Capability Validation (Requests)', () => {
  it('Kling 2.6 T2V allows audio toggle', () => {
    const capability = getModelCapability('kling-2.6');
    expect(capability).toBeDefined();

    const req = {
      modelId: 'kling-2.6',
      mode: 't2v',
      prompt: 'test prompt',
      aspectRatio: '16:9',
      durationSec: 5,
      sound: true,
    };

    const parsed = VideoGenerationRequestSchema.safeParse(req);
    expect(parsed.success).toBe(true);
    const result = validateAgainstCapability(parsed.success ? parsed.data : (req as any), capability!);
    expect(result.valid).toBe(true);
  });

  it('Motion control requires image + reference video + orientation + camera control', () => {
    const capability = getModelCapability('kling-motion-control');
    expect(capability).toBeDefined();

    const reqMissing = {
      modelId: 'kling-motion-control',
      mode: 'motion_control',
      prompt: 'motion',
      aspectRatio: 'source',
      durationSec: 5,
      // missing inputImage, referenceVideo, characterOrientation, cameraControl
    };

    const parsedMissing = VideoGenerationRequestSchema.safeParse(reqMissing);
    expect(parsedMissing.success).toBe(false);

    const reqInvalidDuration = {
      modelId: 'kling-motion-control',
      mode: 'motion_control',
      prompt: 'motion',
      aspectRatio: 'source',
      durationSec: 12,
      inputImage: 'data:image/png;base64,aaa',
      referenceVideo: 'data:video/mp4;base64,bbb',
      characterOrientation: 'image',
      cameraControl: '{}',
      resolution: '720p',
    };

    const parsedDuration = VideoGenerationRequestSchema.safeParse(reqInvalidDuration);
    expect(parsedDuration.success).toBe(true);
    const result = validateAgainstCapability(parsedDuration.success ? parsedDuration.data : (reqInvalidDuration as any), capability!);
    expect(result.valid).toBe(false);
  });

  it('WAN 2.6 allows 15s and requires resolution', () => {
    const capability = getModelCapability('wan-2.6');
    expect(capability).toBeDefined();

    const reqOk = {
      modelId: 'wan-2.6',
      mode: 't2v',
      prompt: 'cinematic scene',
      aspectRatio: '16:9',
      durationSec: 15,
      resolution: '1080p',
    };
    const parsedOk = VideoGenerationRequestSchema.safeParse(reqOk);
    expect(parsedOk.success).toBe(true);
    const resultOk = validateAgainstCapability(parsedOk.success ? parsedOk.data : (reqOk as any), capability!);
    expect(resultOk.valid).toBe(true);

    const reqMissingRes = {
      modelId: 'wan-2.6',
      mode: 't2v',
      prompt: 'cinematic scene',
      aspectRatio: '16:9',
      durationSec: 15,
    };
    const parsedMissingRes = VideoGenerationRequestSchema.safeParse(reqMissingRes);
    expect(parsedMissingRes.success).toBe(true);
    const resultMissingRes = validateAgainstCapability(parsedMissingRes.success ? parsedMissingRes.data : (reqMissingRes as any), capability!);
    expect(resultMissingRes.valid).toBe(false);
  });

  it('Grok Imagine Video allows only 6s or 10s', () => {
    const capability = getModelCapability('grok-video');
    expect(capability).toBeDefined();

    const req = {
      modelId: 'grok-video',
      mode: 't2v',
      prompt: 'grok test',
      aspectRatio: '1:1',
      durationSec: 12,
    };
    const parsed = VideoGenerationRequestSchema.safeParse(req);
    expect(parsed.success).toBe(true);
    const result = validateAgainstCapability(parsed.success ? parsed.data : (req as any), capability!);
    expect(result.valid).toBe(false);
  });
});
