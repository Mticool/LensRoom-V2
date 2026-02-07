import { test, expect } from '@playwright/test';

test.describe('Inspiration Gallery', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  test('shows actions on touch and navigates to Studio with prefilled params', async ({ page }) => {
    test.setTimeout(120_000);

    // Stub API that the page uses
    await page.route('**/api/content?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          effects: [
            {
              id: '1',
              preset_id: 'p1',
              title: 'Test Photo Style',
              content_type: 'photo',
              model_key: 'nano-banana-pro',
              tile_ratio: '1:1',
              cost_stars: 1,
              mode: 't2i',
              preview_image: '/showcase/4.jpg',
              preview_url: '/showcase/4.jpg',
              poster_url: null,
              asset_url: '/showcase/4.jpg',
              template_prompt: 'A cinematic portrait, 85mm lens',
              featured: true,
              category: 'test',
              priority: 10,
              aspect: '1:1',
              short_description: '',
            },
          ],
        }),
      });
    });

    // Stub APIs that Studio may call after navigation.
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'u1', username: 'test', role: 'user' },
          balance: 0,
          subscriptionStars: 0,
          packageStars: 0,
        }),
      });
    });
    await page.route('**/api/studio/threads**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ threads: [] }),
      });
    });
    await page.route('**/api/generations?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ generations: [], count: 0 }),
      });
    });

    await page.goto('/inspiration', { waitUntil: 'domcontentloaded', timeout: 120_000 });

    await expect(page.getByText('Test Photo Style', { exact: true })).toBeVisible();

    // On touch devices, actions should be visible without hover.
    await expect(page.getByRole('button', { name: 'Промпт', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Создать', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Создать', exact: true }).click();
    // Avoid waiting for full page "load" in a large Next app; commit is enough to validate navigation.
    await page.waitForURL('**/create/studio**', { waitUntil: 'commit', timeout: 120_000 });

    expect(page.url()).toContain('/create/studio');
    expect(page.url()).toContain('section=photo');
    expect(page.url()).toContain('model=nano-banana-pro');
  });
});
