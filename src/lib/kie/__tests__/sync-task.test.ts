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

  it('parses outputs as objects (url/audioUrl/audio_url)', () => {
    const resultJson = JSON.stringify({
      outputs: [
        { url: 'https://cdn.example.com/a.mp3' },
        { audioUrl: 'https://cdn.example.com/b.wav' },
        { audio_url: 'https://cdn.example.com/c.ogg' },
      ],
    });
    const parsed = parseResultJsonToUrls(resultJson);
    expect(parsed).toEqual([
      'https://cdn.example.com/a.mp3',
      'https://cdn.example.com/b.wav',
      'https://cdn.example.com/c.ogg',
    ]);
  });
});
