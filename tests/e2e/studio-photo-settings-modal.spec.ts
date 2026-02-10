import { test, expect } from '@playwright/test';

test.describe('Studio Photo Settings Panel (Desktop)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('opens via gear and closes on Escape', async ({ page }) => {
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

    await page.goto('/create/studio?section=photo&model=nano-banana-pro', { waitUntil: 'domcontentloaded', timeout: 120_000 });

    const gear = page.getByTestId('studio-settings-button');
    await expect(gear).toBeVisible();
    await gear.click();

    const panel = page.getByTestId('studio-settings-panel');
    await expect(panel).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
  });
});
