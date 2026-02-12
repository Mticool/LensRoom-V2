import { describe, expect, it } from 'vitest';
import { getSkuFromRequest, calculateTotalStars } from './pricing';

describe('Kling O3 Standard pricing', () => {
  it('builds expected SKU for no-audio shot', () => {
    const sku = getSkuFromRequest('kling-o3-standard', {
      duration: 8,
      audio: false,
    });
    expect(sku).toBe('kling_o3_standard:8s:no_audio');
    expect(calculateTotalStars(sku, 8)).toBe(80);
  });

  it('builds expected SKU for audio shot', () => {
    const sku = getSkuFromRequest('kling-o3-standard', {
      duration: 10,
      audio: true,
    });
    expect(sku).toBe('kling_o3_standard:10s:audio');
    expect(calculateTotalStars(sku, 10)).toBe(150);
  });
});
