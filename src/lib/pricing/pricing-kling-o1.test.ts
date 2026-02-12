import { describe, expect, it } from 'vitest';
import { computePrice, getSkuFromRequest } from './pricing';

describe('pricing: Kling O1 Standard', () => {
  it('maps kling-o1 5s and 10s to expected SKUs', () => {
    expect(getSkuFromRequest('kling-o1', { duration: 5, mode: 'i2v' })).toBe('kling_o1:5s');
    expect(getSkuFromRequest('kling-o1', { duration: 10, mode: 'i2v' })).toBe('kling_o1:10s');
  });

  it('returns expected prices for 5s and 10s', () => {
    expect(computePrice('kling-o1', { duration: 5, mode: 'i2v' }).stars).toBe(56);
    expect(computePrice('kling-o1', { duration: 10, mode: 'v2v' }).stars).toBe(112);
  });
});
