import { test, expect } from '@playwright/test';

test.describe('Library -> Regenerate ("Пересоздать")', () => {
  test('video uses generationId; photo uses prompt+model', async ({ page }) => {
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
      if (url.includes('favorites=true')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ generations: [], count: 0 }),
        });
        return;
      }
      // Avoid slow/real network calls after we navigate into Studio.
      if (url.includes('type=video') || url.includes('type=photo')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ generations: [], count: 0 }),
        });
        return;
      }
      await route.fallback();
    });

    await page.route('**/api/auth/session', async (route) => {
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

    await page.route('**/api/studio/threads', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ threads: [] }),
      });
    });

    await page.route('**/api/library?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'vid-regen-1',
              user_id: 'u1',
              type: 'video',
              status: 'success',
              created_at: new Date(Date.now() - 120_000).toISOString(),
              updated_at: null,
              prompt: 'Video prompt',
              model_name: 'kling-2.6',
              preview_status: 'ready',
              originalUrl: '/showcase/3.mp4',
              previewUrl: null,
              posterUrl: null,
              displayUrl: null,
              resultUrls: null,
            },
            {
              id: 'photo-regen-1',
              user_id: 'u1',
              type: 'photo',
              status: 'success',
              created_at: new Date(Date.now() - 60_000).toISOString(),
              updated_at: null,
              prompt: 'Photo prompt',
              model_name: 'nano-banana-pro',
              preview_status: 'ready',
              originalUrl: '/showcase/4.jpg',
              previewUrl: '/showcase/4.jpg',
              posterUrl: null,
              displayUrl: '/showcase/4.jpg',
              resultUrls: null,
            },
          ],
          count: 2,
          meta: { limit: 30, offset: 0, hasMore: false },
        }),
      });
    });

    // Video -> regenerate should keep section=video + generationId
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/library') && r.ok()),
      page.goto('/library', { waitUntil: 'domcontentloaded', timeout: 120_000 }),
    ]);
    await page.getByText('kling-2.6', { exact: true }).click();
    await expect(page.getByText('🎬 Видео', { exact: true })).toBeVisible();
    await page.getByLabel('Пересоздать', { exact: true }).click();
    await page.waitForURL('**/create/studio**', { waitUntil: 'commit', timeout: 120_000 });
    expect(page.url()).toContain('/create/studio');
    expect(page.url()).toContain('section=video');
    expect(page.url()).toContain('generationId=vid-regen-1');

    // Photo -> regenerate should pass prompt+model (section defaults to photo)
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/library') && r.ok()),
      page.goto('/library', { waitUntil: 'domcontentloaded', timeout: 120_000 }),
    ]);
    await page.getByText('nano-banana-pro', { exact: true }).click();
    await expect(page.getByText('🖼 Фото', { exact: true })).toBeVisible();
    await page.getByLabel('Пересоздать', { exact: true }).click();
    await page.waitForURL('**/create/studio**', { waitUntil: 'commit', timeout: 120_000 });
    expect(page.url()).toContain('/create/studio');
    expect(page.url()).toContain('model=nano-banana-pro');
    expect(page.url()).toContain('prompt=');
  });
});
