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

  it('Motion control requires image + reference video + orientation', () => {
    const capability = getModelCapability('kling-motion-control');
    expect(capability).toBeDefined();

    const reqMissing = {
      modelId: 'kling-motion-control',
      mode: 'motion_control',
      prompt: 'motion',
      aspectRatio: 'source',
      durationSec: 5,
      // missing inputImage, referenceVideo, characterOrientation
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
      resolution: '720p',
    };

    const parsedDuration = VideoGenerationRequestSchema.safeParse(reqInvalidDuration);
    expect(parsedDuration.success).toBe(true);
    const result = validateAgainstCapability(parsedDuration.success ? parsedDuration.data : (reqInvalidDuration as any), capability!);
    expect(result.valid).toBe(false);
  });

  it('rejects empty prompt at schema level', () => {
    const req = {
      modelId: 'kling-motion-control',
      mode: 'motion_control',
      prompt: '',
      aspectRatio: 'source',
      durationSec: 5,
      inputImage: 'data:image/png;base64,aaa',
      referenceVideo: 'data:video/mp4;base64,bbb',
      characterOrientation: 'image',
      resolution: '720p',
    };

    const parsed = VideoGenerationRequestSchema.safeParse(req);
    expect(parsed.success).toBe(false);
  });

  it('Motion control allows 30s for video orientation and rejects 31s', () => {
    const capability = getModelCapability('kling-motion-control');
    expect(capability).toBeDefined();

    const req30 = {
      modelId: 'kling-motion-control',
      mode: 'motion_control',
      prompt: 'motion',
      aspectRatio: 'source',
      durationSec: 30,
      inputImage: 'data:image/png;base64,aaa',
      referenceVideo: 'data:video/mp4;base64,bbb',
      characterOrientation: 'video',
      resolution: '1080p',
    };
    const parsed30 = VideoGenerationRequestSchema.safeParse(req30);
    expect(parsed30.success).toBe(true);
    const result30 = validateAgainstCapability(parsed30.success ? parsed30.data : (req30 as any), capability!);
    expect(result30.valid).toBe(true);

    const req31 = { ...req30, durationSec: 31 };
    const parsed31 = VideoGenerationRequestSchema.safeParse(req31);
    expect(parsed31.success).toBe(true);
    const result31 = validateAgainstCapability(parsed31.success ? parsed31.data : (req31 as any), capability!);
    expect(result31.valid).toBe(false);
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

  it('Kling O3 Standard validates multishot payload', () => {
    const capability = getModelCapability('kling-o3-standard');
    expect(capability).toBeDefined();

    const reqOk = {
      modelId: 'kling-o3-standard',
      mode: 'i2v',
      prompt: 'cinematic walk',
      aspectRatio: '16:9',
      durationSec: 8,
      inputImage: 'data:image/png;base64,aaa',
      shotType: 'customize',
      multiPrompt: [
        { prompt: 'shot one', duration: 4 },
        { prompt: 'shot two', duration: 4 },
      ],
      generateAudio: true,
    };

    const parsedOk = VideoGenerationRequestSchema.safeParse(reqOk);
    expect(parsedOk.success).toBe(true);
    const resultOk = validateAgainstCapability(parsedOk.success ? parsedOk.data : (reqOk as any), capability!);
    expect(resultOk.valid).toBe(true);

    const reqBadDuration = {
      ...reqOk,
      durationSec: 4,
    };
    const parsedBadDuration = VideoGenerationRequestSchema.safeParse(reqBadDuration);
    expect(parsedBadDuration.success).toBe(true);
    const resultBadDuration = validateAgainstCapability(parsedBadDuration.success ? parsedBadDuration.data : (reqBadDuration as any), capability!);
    expect(resultBadDuration.valid).toBe(false);
  });

  it('Kling O3 Standard allows t2v without input image', () => {
    const capability = getModelCapability('kling-o3-standard');
    expect(capability).toBeDefined();

    const req = {
      modelId: 'kling-o3-standard',
      mode: 't2v',
      prompt: 'a city at sunrise',
      aspectRatio: '16:9',
      durationSec: 5,
      shotType: 'single',
    };

    const parsed = VideoGenerationRequestSchema.safeParse(req);
    expect(parsed.success).toBe(true);
    const result = validateAgainstCapability(parsed.success ? parsed.data : (req as any), capability!);
    expect(result.valid).toBe(true);
  });

  it('Kling O3 Standard validates v2v requires reference video', () => {
    const capability = getModelCapability('kling-o3-standard');
    expect(capability).toBeDefined();

    const reqMissingVideo = {
      modelId: 'kling-o3-standard',
      mode: 'v2v',
      prompt: 'transform to noir',
      aspectRatio: '1:1',
      durationSec: 10,
    };
    const parsedMissingVideo = VideoGenerationRequestSchema.safeParse(reqMissingVideo);
    expect(parsedMissingVideo.success).toBe(true);
    const resultMissingVideo = validateAgainstCapability(
      parsedMissingVideo.success ? parsedMissingVideo.data : (reqMissingVideo as any),
      capability!
    );
    expect(resultMissingVideo.valid).toBe(false);

    const reqOk = {
      ...reqMissingVideo,
      referenceVideo: 'data:video/mp4;base64,aaa',
    };
    const parsedOk = VideoGenerationRequestSchema.safeParse(reqOk);
    expect(parsedOk.success).toBe(true);
    const resultOk = validateAgainstCapability(parsedOk.success ? parsedOk.data : (reqOk as any), capability!);
    expect(resultOk.valid).toBe(true);
  });

  it('Kling O1 Standard validates i2v/start_end/v2v requirements', () => {
    const capability = getModelCapability('kling-o1');
    expect(capability).toBeDefined();

    const i2vReq = {
      modelId: 'kling-o1',
      mode: 'i2v',
      prompt: 'street scene',
      aspectRatio: '16:9',
      durationSec: 5,
      inputImage: 'data:image/png;base64,aaa',
    };
    const i2vParsed = VideoGenerationRequestSchema.safeParse(i2vReq);
    expect(i2vParsed.success).toBe(true);
    const i2vResult = validateAgainstCapability(i2vParsed.success ? i2vParsed.data : (i2vReq as any), capability!);
    expect(i2vResult.valid).toBe(true);

    const startEndReq = {
      modelId: 'kling-o1',
      mode: 'start_end',
      prompt: 'transition shot',
      aspectRatio: '16:9',
      durationSec: 10,
      startImage: 'data:image/png;base64,aaa',
      endImage: 'data:image/png;base64,bbb',
    };
    const startEndParsed = VideoGenerationRequestSchema.safeParse(startEndReq);
    expect(startEndParsed.success).toBe(true);
    const startEndResult = validateAgainstCapability(
      startEndParsed.success ? startEndParsed.data : (startEndReq as any),
      capability!
    );
    expect(startEndResult.valid).toBe(true);

    const v2vMissingReq = {
      modelId: 'kling-o1',
      mode: 'v2v',
      prompt: 'restyle',
      aspectRatio: '16:9',
      durationSec: 5,
    };
    const v2vMissingParsed = VideoGenerationRequestSchema.safeParse(v2vMissingReq);
    expect(v2vMissingParsed.success).toBe(true);
    const v2vMissingResult = validateAgainstCapability(
      v2vMissingParsed.success ? v2vMissingParsed.data : (v2vMissingReq as any),
      capability!
    );
    expect(v2vMissingResult.valid).toBe(false);
  });
});
