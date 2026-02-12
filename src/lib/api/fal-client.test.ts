import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FalAIClient } from './fal-client';

const fetchWithTimeoutMock = vi.fn();

vi.mock('./fetch-with-timeout', () => ({
  fetchWithTimeout: (...args: any[]) => fetchWithTimeoutMock(...args),
}));

describe('FalAIClient Kling O3', () => {
  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
  });

  it('submits O3 standard payload with request id', async () => {
    fetchWithTimeoutMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ request_id: 'req_o3', status_url: '/status/req_o3' }),
    });

    const client = new FalAIClient('test-key');
    const result = await client.submitKlingO3StandardImageToVideo({
      prompt: 'test',
      image_url: 'https://example.com/image.jpg',
      duration: '8',
      shot_type: 'customize',
      multi_prompt: [
        { prompt: 'shot one', duration: 4 },
        { prompt: 'shot two', duration: 4 },
      ],
      generate_audio: true,
    });

    expect(result.request_id).toBe('req_o3');
    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetchWithTimeoutMock.mock.calls[0];
    expect(String(endpoint)).toContain('/fal-ai/kling-video/o3/standard/image-to-video');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({
      shot_type: 'customize',
      generate_audio: true,
    });
  });

  it('submits O3 standard t2v payload to text endpoint', async () => {
    fetchWithTimeoutMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ request_id: 'req_o3_t2v', status_url: '/status/req_o3_t2v' }),
    });

    const client = new FalAIClient('test-key');
    const result = await client.submitKlingO3StandardTextToVideo({
      prompt: 'a flying car',
      duration: '5',
      shot_type: 'single',
    });

    expect(result.request_id).toBe('req_o3_t2v');
    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetchWithTimeoutMock.mock.calls[0];
    expect(String(endpoint)).toContain('/fal-ai/kling-video/o3/standard/text-to-video');
    expect(init.method).toBe('POST');
  });

  it('submits O3 standard v2v payload to reference endpoint', async () => {
    fetchWithTimeoutMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ request_id: 'req_o3_v2v', status_url: '/status/req_o3_v2v' }),
    });

    const client = new FalAIClient('test-key');
    const result = await client.submitKlingO3StandardVideoToVideoReference({
      prompt: 'make it cinematic',
      video_url: 'https://example.com/ref.mp4',
      duration: '10',
      shot_type: 'customize',
      multi_prompt: [
        { prompt: 'scene one', duration: 5 },
        { prompt: 'scene two', duration: 5 },
      ],
    });

    expect(result.request_id).toBe('req_o3_v2v');
    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetchWithTimeoutMock.mock.calls[0];
    expect(String(endpoint)).toContain('/fal-ai/kling-video/o3/standard/video-to-video/reference');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({
      video_url: 'https://example.com/ref.mp4',
      shot_type: 'customize',
    });
  });
});

describe('FalAIClient Kling O1', () => {
  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
  });

  it('submits O1 standard v2v reference payload', async () => {
    fetchWithTimeoutMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ request_id: 'req_o1_v2v', status_url: '/status/req_o1_v2v' }),
    });

    const client = new FalAIClient('test-key');
    const result = await client.submitKlingO1VideoToVideoReference({
      prompt: 'cinematic restyle',
      video_url: 'https://example.com/input.mp4',
      duration: '10',
      aspect_ratio: '16:9',
    });

    expect(result.request_id).toBe('req_o1_v2v');
    const [endpoint, init] = fetchWithTimeoutMock.mock.calls[0];
    expect(String(endpoint)).toContain('/fal-ai/kling-video/o1/standard/video-to-video/reference');
    expect(init.method).toBe('POST');
  });
});
