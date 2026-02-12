import { describe, expect, it } from 'vitest';
import { calcBillableSeconds, calcPerSecondCredits } from '@/lib/pricing/videoPricing';

describe('videoPricing per-second models', () => {
  it('rounds and clamps billable seconds', () => {
    expect(calcBillableSeconds({ rawSeconds: 4.2, min: 1, max: 15 })).toBe(5);
    expect(calcBillableSeconds({ rawSeconds: 0, min: 1, max: 15 })).toBe(0);
    expect(calcBillableSeconds({ rawSeconds: 99, min: 1, max: 15 })).toBe(15);
  });

  it('calculates motion control rates by resolution', () => {
    const hd = calcPerSecondCredits({
      modelId: 'kling-motion-control',
      seconds: 6.01,
      motionResolution: '720p',
      minSeconds: 3,
      maxSeconds: 30,
    });
    expect(hd.billableSeconds).toBe(7);
    expect(hd.creditsPerSecond).toBe(6);
    expect(hd.credits).toBe(42);

    const fhd = calcPerSecondCredits({
      modelId: 'kling-motion-control',
      seconds: 6.01,
      motionResolution: '1080p',
      minSeconds: 3,
      maxSeconds: 30,
    });
    expect(fhd.creditsPerSecond).toBe(9);
    expect(fhd.credits).toBe(63);
  });

  it('calculates avatar and infinitalk rates', () => {
    const avatarStd = calcPerSecondCredits({ modelId: 'kling-ai-avatar-standard', seconds: 4.2 });
    expect(avatarStd.billableSeconds).toBe(5);
    expect(avatarStd.creditsPerSecond).toBe(8);
    expect(avatarStd.credits).toBe(40);

    const avatarPro = calcPerSecondCredits({ modelId: 'kling-ai-avatar-pro', seconds: 4.2 });
    expect(avatarPro.creditsPerSecond).toBe(16);
    expect(avatarPro.credits).toBe(80);

    const infinitalk = calcPerSecondCredits({ modelId: 'infinitalk-720p', seconds: 4.2 });
    expect(infinitalk.creditsPerSecond).toBe(12);
    expect(infinitalk.credits).toBe(60);
  });
});

