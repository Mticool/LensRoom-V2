import { test, expect, type Page } from '@playwright/test';

function mockStudioBasics(page: Page) {
  // Keep Studio stable without hitting real backend.
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

async function waitForClientHydration(page: Page) {
  // Header sets --app-header-h from a useLayoutEffect; waiting for it reduces "click before hydration" flakes.
  await page.waitForFunction(() => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--app-header-h').trim();
    const px = Number.parseInt(raw.replace('px', ''), 10);
    return Number.isFinite(px) && px > 0;
  });
}

async function clickPrimaryUntilSection(page: Page, testId: string, section: string) {
  const btn = page.getByTestId(testId);
  await btn.scrollIntoViewIfNeeded();

  for (let i = 0; i < 3; i++) {
    await btn.click({ force: true });
    const current = new URL(page.url()).searchParams.get('section');
    if (current === section) return;
    // If hydration is slow, a synthetic click can be missed; retry shortly.
    await page.waitForTimeout(250);
  }

  // Final fallback: dispatch click from within the page context.
  await page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!el) return;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  }, testId);
}

test.describe('Mobile Primary Row', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('exists in Studio (mobile)', async ({ page }) => {
    mockStudioBasics(page);

    await page.goto('/create/studio?section=photo&model=nano-banana-pro', { waitUntil: 'domcontentloaded' });
    await waitForClientHydration(page);

    await expect(page.getByTestId('mobile-primary-row')).toBeVisible();
    await expect(page.getByTestId('mobile-primary-photo')).toBeVisible();
    await expect(page.getByTestId('mobile-primary-video')).toBeVisible();
    await expect(page.getByTestId('mobile-primary-motion')).toBeVisible();
    await expect(page.getByTestId('mobile-primary-music')).toBeVisible();
    await expect(page.getByTestId('mobile-primary-voice')).toBeVisible();
  });

  test('switching to Video updates URL and keeps project', async ({ page }) => {
    mockStudioBasics(page);

    await page.goto('/create/studio?section=photo&model=nano-banana-pro&project=p1', { waitUntil: 'domcontentloaded' });
    await waitForClientHydration(page);
    await expect(page.getByTestId('mobile-primary-row')).toBeVisible();

    await clickPrimaryUntilSection(page, 'mobile-primary-video', 'video');
    await expect
      .poll(() => new URL(page.url()).searchParams.get('section'), { timeout: 15_000 })
      .toBe('video');

    const url = new URL(page.url());
    expect(url.searchParams.get('section')).toBe('video');
    expect(url.searchParams.get('project')).toBe('p1');
  });

  test('Motion always sets kling-motion-control model', async ({ page }) => {
    mockStudioBasics(page);

    await page.goto('/create/studio?section=photo&model=nano-banana-pro&project=p1', { waitUntil: 'domcontentloaded' });
    await waitForClientHydration(page);
    await expect(page.getByTestId('mobile-primary-row')).toBeVisible();

    await clickPrimaryUntilSection(page, 'mobile-primary-motion', 'motion');
    await expect
      .poll(() => new URL(page.url()).searchParams.get('section'), { timeout: 15_000 })
      .toBe('motion');

    const url = new URL(page.url());
    expect(url.searchParams.get('section')).toBe('motion');
    expect(url.searchParams.get('model')).toBe('kling-motion-control');
    expect(url.searchParams.get('project')).toBe('p1');
    await expect(page.getByText('Референс видео не выбран')).toBeVisible();
  });
});
