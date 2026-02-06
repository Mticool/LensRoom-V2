import { describe, it, expect } from 'vitest';
import { buildKieImagePayload } from '@/lib/providers/kie/image';


describe('buildKieImagePayload', () => {
  it('maps GPT Image i2i to the correct API model', () => {
    const payload = buildKieImagePayload({
      modelId: 'gpt-image',
      mode: 'i2i',
      params: {
        prompt: 'Edit this',
        quality: 'medium',
        aspectRatio: '1:1',
        outputFormat: 'png',
      },
      assetUrls: { referenceImages: ['https://example.com/img.png'] },
    });

    expect(payload.model).toBe('gpt-image/1.5-image-to-image');
    expect(payload.imageInputs?.length).toBe(1);
  });
});
