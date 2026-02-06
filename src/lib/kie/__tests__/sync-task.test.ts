import { describe, it, expect } from 'vitest';
import { parseResultJsonToUrls } from '../sync-task';

describe('KIE result parsing', () => {
  it('parses all Grok Imagine outputs (6 urls)', () => {
    const urls = Array.from({ length: 6 }, (_, i) => `https://example.com/${i}.png`);
    const resultJson = JSON.stringify({ resultUrls: urls });
    const parsed = parseResultJsonToUrls(resultJson);
    expect(parsed).toHaveLength(6);
    expect(parsed).toEqual(urls);
  });
});
