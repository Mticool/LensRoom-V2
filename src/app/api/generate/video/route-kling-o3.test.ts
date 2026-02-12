import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/rate-limit', () => ({
  getClientIP: () => '127.0.0.1',
  RATE_LIMITS: { generation: {} },
  checkRateLimit: () => ({ success: true }),
  rateLimitResponse: () => new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 }),
}));

vi.mock('@/lib/env', () => ({
  env: {
    isKlingO3StandardEnabled: () => true,
  },
}));

describe('POST /api/generate/video Kling O3 early validation', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('rejects unsupported mode for Kling O3', async () => {
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/generate/video', {
      method: 'POST',
      body: JSON.stringify({
        model: 'kling-o3-standard',
        prompt: 'test',
        mode: 'start_end',
        duration: 5,
      }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(String(json.error)).toBe('VALIDATION_ERROR');
    const messages = Array.isArray(json.details) ? json.details.map((d: any) => String(d.message || '')) : [];
    expect(messages.some((m: string) => m.includes('startImage') || m.includes('referenceImages'))).toBe(true);
  });

  it('rejects v2v request without videoUrl', async () => {
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/generate/video', {
      method: 'POST',
      body: JSON.stringify({
        model: 'kling-o3-standard',
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
    const messages = Array.isArray(json.details) ? json.details.map((d: any) => String(d.message || '')) : [];
    expect(messages.some((m: string) => m.toLowerCase().includes('referencevideo'))).toBe(true);
  });

  it('rejects i2v request without reference image', async () => {
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/generate/video', {
      method: 'POST',
      body: JSON.stringify({
        model: 'kling-o3-standard',
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
    const messages = Array.isArray(json.details) ? json.details.map((d: any) => String(d.message || '')) : [];
    expect(messages.some((m: string) => m.toLowerCase().includes('inputimage'))).toBe(true);
  });
});
