import { test, expect } from '@playwright/test';

test.describe('Studio Photo Gallery (/create/studio?section=photo)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('renders history grid, loads older items, and opens viewer on click', async ({ page }) => {
    test.setTimeout(120_000);

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
      // StudioWorkspaces calls GET/POST/PATCH; for this test GET is enough.
      if (route.request().method() !== 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ threads: [] }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ threads: [] }),
      });
    });

    await page.route('**/api/generations?**', async (route) => {
      const url = new URL(route.request().url());
      const favorites = url.searchParams.get('favorites') === 'true';
      if (favorites) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ generations: [], count: 0 }),
        });
        return;
      }

      const type = String(url.searchParams.get('type') || '').toLowerCase();
      const offset = Number(url.searchParams.get('offset') || '0');
      const limit = Number(url.searchParams.get('limit') || '20');

      // Studio can pass different "type" values depending on client version.
      // Treat "photo" and "image" as the same for this test; avoid falling back to real API.
      const isPhotoLike = type === 'photo' || type === 'image' || !type;
      if (!isPhotoLike) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ generations: [], count: 0 }),
        });
        return;
      }

      const makeGen = (i: number, prompt: string) => ({
        id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
        user_id: 'u1',
        type: 'photo',
        status: 'success',
        model_id: 'nano-banana-pro',
        model_name: 'nano-banana-pro',
        prompt,
        aspect_ratio: '1:1',
        params: { quality: '1k_2k', outputFormat: 'png' },
        asset_url: '/showcase/2.jpg',
        preview_url: '/showcase/2.jpg',
        created_at: new Date(Date.now() - (offset + i) * 60_000).toISOString(),
      });

      if (offset === 0) {
        // Return exactly `limit` items so the UI reliably treats it as "has more" (and renders "load previous").
        const pageSize = Number.isFinite(limit) && limit > 0 ? limit : 20;
        const generations = Array.from({ length: pageSize }, (_, idx) =>
          makeGen(idx + 1, idx === 0 ? 'Test prompt' : `Prompt ${idx + 1}`)
        );
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ generations, count: generations.length + 100 }),
        });
        return;
      }

      // loadMore(): return one older item.
      const generations = [makeGen(999, 'Older prompt')];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ generations, count: generations.length }),
      });
    });

    await page.goto('/create/studio?section=photo&model=nano-banana-pro', { waitUntil: 'domcontentloaded', timeout: 120_000 });

    // Wait for the gallery "load previous" control, then verify at least one history image rendered.
    // Do not rely on specific layout classes (grid/masonry can change).
    // There can be multiple "load previous" buttons (e.g. hidden/mobile variants).
    const loadPrevBtn = page.locator('button:visible').filter({ hasText: 'Загрузить предыдущие' }).first();
    await expect(loadPrevBtn).toBeVisible();

    const firstImg = page.locator('img:visible[alt="Test prompt"]').first();
    const olderImgs = page.locator('img[alt="Older prompt"]');

    // At least one item from history should render.
    await expect(firstImg).toBeVisible();

    // Since we return PAGE_SIZE items, the "load previous" control should appear.
    await loadPrevBtn.click();
    // There may be multiple gallery instances (hidden/mobile). Ensure at least one appears.
    await expect(page.locator('img:visible[alt="Older prompt"]')).toHaveCount(1);

    // Click the tile to open viewer (Dialog content).
    await firstImg.click();
    await expect(page.getByText('Характеристики', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Скачать' })).toBeVisible();
  });
});
