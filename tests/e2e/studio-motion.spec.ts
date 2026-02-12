import { test, expect, type Page } from '@playwright/test';

function mockStudioBasics(page: Page) {
  page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'u1', username: 'test', role: 'user' },
        balance: 999,
        subscriptionStars: 0,
        packageStars: 0,
      }),
    });
  });

  page.route('**/api/studio/threads', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ threads: [] }),
    });
  });

  page.route('**/api/generations?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ generations: [], count: 0 }),
    });
  });
}

test.describe('Studio Motion Control (mobile)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('uploads image/video and sends URL payload', async ({ page }) => {
    mockStudioBasics(page);

    let generateCalled = false;

    await page.route('**/api/upload/voice-assets', async (route) => {
      const body = route.request().postData() || '';
      const isVideo = body.includes('name="type"\r\n\r\nvideo');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: isVideo
            ? 'https://cdn.example.com/motion-video.mp4'
            : 'https://cdn.example.com/character-image.jpg',
        }),
      });
    });

    await page.route('**/api/generate/video', async (route) => {
      const body = route.request().postDataJSON() as any;
      generateCalled = true;

      expect(body.model).toBe('kling-motion-control');
      expect(typeof body.referenceImage).toBe('string');
      expect(typeof body.referenceVideo).toBe('string');
      expect(body.referenceImage.startsWith('data:')).toBe(false);
      expect(body.referenceVideo.startsWith('data:')).toBe(false);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, jobId: 'studio-motion-job', status: 'queued', creditCost: 1 }),
      });
    });

    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7n7WQAAAAASUVORK5CYII=',
      'base64'
    );
    const tinyMp4 = Buffer.from('AAAAIGZ0eXBpc29tAAAAAGlzb20', 'base64');

    await page.goto('/create/studio?section=motion&model=kling-motion-control', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Референс видео не выбран')).toBeVisible();

    await page.locator('input[type="file"][accept="image/*"]').setInputFiles({
      name: 'character.png',
      mimeType: 'image/png',
      buffer: tinyPng,
    });

    await page.locator('input[type="file"][accept="video/*"]').setInputFiles({
      name: 'motion.mp4',
      mimeType: 'video/mp4',
      buffer: tinyMp4,
    });

    await page.locator('textarea').fill('Run motion test');
    await page.locator('textarea').press('Enter');

    await expect.poll(() => generateCalled, { timeout: 15_000 }).toBe(true);
  });
});
