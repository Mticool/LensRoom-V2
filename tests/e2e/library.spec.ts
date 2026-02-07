import { test, expect } from '@playwright/test';

test.describe('Library ("Мои результаты")', () => {
  test('renders items including queued state (no runtime crash)', async ({ page }) => {
    test.setTimeout(120_000);
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ role: 'user' }),
      });
    });

    await page.route('**/api/generations?**', async (route) => {
      const url = route.request().url();
      // Favorites store calls: /api/generations?favorites=true&limit=100
      if (url.includes('favorites=true')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ generations: [], count: 0 }),
        });
        return;
      }
      await route.fallback();
    });

    await page.route('**/api/library?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'gen-success-photo-1',
              user_id: 'u1',
              type: 'photo',
              status: 'success',
              created_at: new Date(Date.now() - 60_000).toISOString(),
              updated_at: null,
              prompt: 'Test prompt',
              model_name: 'nano-banana-pro',
              preview_status: 'ready',
              originalUrl: '/showcase/4.jpg',
              previewUrl: '/showcase/4.jpg',
              posterUrl: null,
              displayUrl: '/showcase/4.jpg',
              resultUrls: null,
            },
            {
              id: 'gen-queued-video-1',
              user_id: 'u1',
              type: 'video',
              status: 'queued',
              created_at: new Date(Date.now() - 10_000).toISOString(),
              updated_at: null,
              prompt: 'Queued video',
              model_name: 'kling-2.6',
              preview_status: 'none',
              originalUrl: null,
              previewUrl: null,
              posterUrl: null,
              displayUrl: null,
              resultUrls: null,
            },
          ],
          count: 2,
          meta: { limit: 30, offset: 0, hasMore: false },
        }),
      });
    });

    const libResp = page.waitForResponse((r) => r.url().includes('/api/library') && r.ok());
    await page.goto('/library', { waitUntil: 'domcontentloaded' });
    await libResp;

    await expect(page.getByRole('heading', { name: 'Мои результаты' })).toBeVisible();
    await expect(page.getByText('nano-banana-pro', { exact: true })).toBeVisible();
    await expect(page.getByText('kling-2.6', { exact: true })).toBeVisible();

    // Tap/click opens viewer (important for touch devices where hover actions don't work).
    await page.getByText('nano-banana-pro', { exact: true }).click();
    await expect(page.getByText('🖼 Фото', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Скачать', exact: true })).toBeVisible();
  });
});
