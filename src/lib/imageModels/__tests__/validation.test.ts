import { describe, it, expect } from 'vitest';
import { getImageModelCapability, validateImageRequest } from '../capabilities';

function validate(modelId: string, payload: any) {
  const cap = getImageModelCapability(modelId);
  if (!cap) throw new Error(`Missing capability for ${modelId}`);
  return validateImageRequest(cap, { modelId, ...payload });
}

describe('image validation', () => {
  it('allows GPT Image 1.5 medium/high quality', () => {
    const okMedium = validate('gpt-image', {
      mode: 't2i',
      prompt: 'hello',
      quality: 'medium',
      aspectRatio: '1:1',
      variants: 1,
    });
    expect(okMedium.success).toBe(true);

    const okHigh = validate('gpt-image', {
      mode: 't2i',
      prompt: 'hello',
      quality: 'high',
      aspectRatio: '1:1',
      variants: 1,
    });
    expect(okHigh.success).toBe(true);
  });

  it('rejects GPT quality for non-GPT models', () => {
    const res = validate('z-image', {
      mode: 't2i',
      prompt: 'hello',
      quality: 'medium',
      aspectRatio: '1:1',
      variants: 1,
    });
    expect(res.success).toBe(false);
  });

  it('requires image for Topaz Upscale', () => {
    const res = validate('topaz-image-upscale', {
      mode: 'i2i',
      prompt: '',
      aspectRatio: '1:1',
      variants: 1,
    });
    expect(res.success).toBe(false);
  });

  it('requires image for Seedream Edit', () => {
    const res = validate('seedream-4.5-edit', {
      mode: 'i2i',
      prompt: 'Edit this',
      aspectRatio: '1:1',
      variants: 1,
    });
    expect(res.success).toBe(false);
  });
});
