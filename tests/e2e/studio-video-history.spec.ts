import { test, expect } from '@playwright/test';

test.describe('Studio Video (/create/studio?section=video) History', () => {
  test('uses stable download proxy for expirable URLs and can select from history', async ({ page }) => {
    test.setTimeout(120_000);

    // Mock auth (VideoGeneratorLight doesn't require it for rendering, but safe to keep consistent).
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

    // Mock generations history: return expirable signed URL so extractVideoUrl should convert to /download proxy.
    await page.route('**/api/generations?type=video&**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          generations: [
            {
              id: '11111111-1111-1111-1111-111111111111',
              status: 'success',
              type: 'video',
              // Supabase signed URL (expirable)
              asset_url:
                'https://example.supabase.co/storage/v1/object/sign/generations/u1/v1.mp4?token=abc',
            },
            {
              id: '22222222-2222-2222-2222-222222222222',
              status: 'success',
              type: 'video',
              asset_url:
                'https://example.supabase.co/storage/v1/object/sign/generations/u1/v2.mp4?token=def',
            },
          ],
          count: 2,
        }),
      });
    });

    await page.goto('/create/studio?section=video&model=kling-2.6', { waitUntil: 'domcontentloaded', timeout: 120_000 });

    // History grid should render (2 items).
    const historyTile = page.locator('div:has-text("Мои работы")').locator('video').first();
    await expect(historyTile).toBeVisible();

    // It should use our /download proxy instead of the signed URL.
    const src = await historyTile.getAttribute('src');
    expect(src || '').toContain('/api/generations/');
    expect(src || '').toContain('/download');
    expect(src || '').toContain('proxy=1');

    // Selecting from history should update main player src.
    await historyTile.click();
    const player = page.locator('video[controls]').first();
    await expect(player).toBeVisible();
    await expect(player).toHaveAttribute('src', new RegExp('/api/generations/.*?/download'));
  });
});
