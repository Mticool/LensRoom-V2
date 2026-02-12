import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/rate-limit', () => ({
  getClientIP: () => '127.0.0.1',
  RATE_LIMITS: { generation: {} },
  checkRateLimit: () => ({ success: true }),
  rateLimitResponse: () => new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 }),
}));

describe('POST /api/generate/video Kling O1 early validation', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('rejects unsupported mode for Kling O1', async () => {
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/generate/video', {
      method: 'POST',
      body: JSON.stringify({
        model: 'kling-o1',
        prompt: 'test',
        mode: 'storyboard',
        duration: 5,
      }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(String(json.error)).toBe('VALIDATION_ERROR');
  });

  it('rejects i2v request without input image', async () => {
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/generate/video', {
      method: 'POST',
      body: JSON.stringify({
        model: 'kling-o1',
        prompt: 'test',
        mode: 'i2v',
        duration: 5,
      }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(String(json.error)).toBe('VALIDATION_ERROR');
  });

  it('rejects v2v request without reference video', async () => {
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/generate/video', {
      method: 'POST',
      body: JSON.stringify({
        model: 'kling-o1',
        prompt: 'test',
        mode: 'v2v',
        duration: 5,
      }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(String(json.error)).toBe('VALIDATION_ERROR');
  });
});
