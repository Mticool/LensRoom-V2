import { describe, it, expect } from 'vitest';
import { extractVideoUrl } from './utils';

describe('extractVideoUrl', () => {
  it('returns download proxy for expirable laozhang URLs when success', () => {
    const gen = {
      id: 'gen_123',
      status: 'success',
      result_url: 'https://api.laozhang.ai/v1/videos/abc/content?token=xyz',
    };
    expect(extractVideoUrl(gen)).toBe('/api/generations/gen_123/download?kind=original&proxy=1');
  });

  it('returns direct url when not done', () => {
    const gen = {
      id: 'gen_123',
      status: 'queued',
      result_url: 'https://api.laozhang.ai/v1/videos/abc/content?token=xyz',
    };
    expect(extractVideoUrl(gen)).toBe('https://api.laozhang.ai/v1/videos/abc/content?token=xyz');
  });
});
