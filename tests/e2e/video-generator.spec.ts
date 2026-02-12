import { test, expect } from '@playwright/test';

test.describe('Video Generator UI', () => {
  test('Kling 2.6 shows only valid modes and audio toggle', async ({ page }) => {
    await page.goto('/create/studio?section=video&model=kling-2.6');
    await expect(page.getByRole('button', { name: 'Создать', exact: true })).toBeVisible();

    // Mode buttons
    await expect(page.getByRole('button', { name: 'Описание', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Изображение', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Кадры', exact: true })).toHaveCount(0);

    // Audio toggle should be available
    await expect(page.getByText('Генерация звука')).toBeVisible();
  });

  test('Grok Video hides audio toggle and limits durations to 6/10', async ({ page }) => {
    await page.goto('/create/studio?section=video&model=grok-video');
    await expect(page.getByRole('button', { name: 'Создать', exact: true })).toBeVisible();

    // Audio toggle should be hidden for always-on audio models
    await expect(page.getByText('Генерация звука', { exact: true })).toHaveCount(0);

    // Open duration dropdown and verify options
    const durationButton = page.locator('button', { hasText: 'Длина' });
    await durationButton.click();
    await expect(page.getByRole('button', { name: '6s', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '10s', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '12s', exact: true })).toHaveCount(0);
  });

  test('Motion Control shows only supported controls', async ({ page }) => {
    await page.goto('/create/studio?section=video&model=kling-motion-control');

    // Motion tab content
    await expect(page.getByText('Motion Video')).toBeVisible();
    await expect(page.getByText('Character Image')).toBeVisible();
    await expect(page.getByText('Character Orientation')).toBeVisible();
    await expect(page.getByRole('button', { name: 'image', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'video', exact: true })).toBeVisible();

    // Must not show unsupported controls
    await expect(page.getByText('Генерация звука', { exact: true })).toHaveCount(0);
    await expect(page.getByText('camera_control', { exact: false })).toHaveCount(0);
    await expect(page.locator('button', { hasText: 'Длина' })).toHaveCount(0);
    await expect(page.locator('button', { hasText: 'Формат' })).toHaveCount(0);
  });

  test('Kling 2.5 i2v requires start frame (UI)', async ({ page }) => {
    await page.goto('/create/studio?section=video&model=kling-2.5');
    await expect(page.getByRole('button', { name: 'Изображение', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Изображение', exact: true }).click();

    await expect(page.getByText('Первый кадр', { exact: true })).toBeVisible();
    await expect(page.getByText('Обязателен', { exact: false })).toBeVisible();
    await expect(page.getByText('Последний кадр', { exact: true })).toBeVisible();
    await expect(page.getByText('Опционально', { exact: false })).toBeVisible();
  });

  test('WAN 2.6 shows 5/10/15s and resolution options', async ({ page }) => {
    await page.goto('/create/studio?section=video&model=wan-2.6');

    // Open duration dropdown
    await page.locator('button', { hasText: 'Длина' }).click();
    await expect(page.getByRole('button', { name: '5s', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '10s', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '15s', exact: true })).toBeVisible();

    // Open quality dropdown (resolution)
    await page.locator('button', { hasText: 'Качество' }).click();
    await expect(page.getByRole('button', { name: '720P', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '1080P', exact: true })).toBeVisible();
  });

  test('Kling 2.6 does not show frames mode', async ({ page }) => {
    await page.goto('/create/studio?section=video&model=kling-2.6');
    await expect(page.getByRole('button', { name: 'Кадры', exact: true })).toHaveCount(0);
  });

  test('Grok Video shows styles normal/fun/spicy', async ({ page }) => {
    await page.goto('/create/studio?section=video&model=grok-video');
    const options = await page.locator('select').evaluate((el) =>
      Array.from(el.querySelectorAll('option')).map((o) => o.textContent?.trim() || '')
    );
    expect(options).toEqual(expect.arrayContaining(['normal', 'fun', 'spicy']));
  });

  test('Motion Control shows orientation limits text', async ({ page }) => {
    await page.goto('/create/studio?section=video&model=kling-motion-control');
    await expect(page.getByText('Limit: 10s')).toBeVisible();
    await expect(page.getByText('Длина берётся из референс-видео.')).toBeVisible();
    await page.getByRole('button', { name: 'video', exact: true }).click();
    await expect(page.getByText('Limit: 30s')).toBeVisible();
  });

  test('Grok Video duration selection updates to 10s', async ({ page }) => {
    await page.goto('/create/studio?section=video&model=grok-video');
    await page.locator('button', { hasText: 'Длина' }).click();
    await page.getByRole('button', { name: '10s', exact: true }).click();
    await expect(page.getByRole('button', { name: /Длина.*10s/ })).toBeVisible();
  });

  test('Generate request payload for Kling 2.6 is valid (mocked API)', async ({ page }) => {
    await page.route('**/api/generate/video', async (route) => {
      const body = route.request().postDataJSON() as any;
      // Basic contract checks
      expect(body.model).toBe('kling-2.6');
      expect(body.mode).toBe('t2v');
      expect(body.duration).toBe(5);
      expect(body.aspectRatio).toBeDefined();
      expect(typeof body.prompt).toBe('string');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, jobId: 'mock-job', status: 'queued', creditCost: 1 }),
      });
    });

    await page.goto('/create/studio?section=video&model=kling-2.6');
    await page.getByPlaceholder('Опишите сцену, которую хотите создать, с деталями...').fill('Test prompt');
    await page.locator('button', { hasText: 'Создать' }).last().click();
  });

  test('Switching away from Motion Control hides motion-specific controls', async ({ page }) => {
    await page.goto('/create/studio?section=video&model=kling-motion-control');
    await expect(page.getByText('Motion Video')).toBeVisible();

    // Simulate model switch via URL (same flow user gets from top model switcher)
    await page.goto('/create/studio?section=video&model=veo-3.1-fast');

    await expect(page.getByText('Motion Video')).toHaveCount(0);
    await expect(page.getByText('Character Image')).toHaveCount(0);
    await expect(page.getByText('Character Orientation')).toHaveCount(0);
  });

  test('Mobile: Motion Control stacks upload cards in one column', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto('/create/studio?section=video&model=kling-motion-control');

    const labels = page.locator('label').filter({ hasText: /Motion Video|Character Image/ });
    await expect(labels).toHaveCount(2);

    const first = await labels.nth(0).boundingBox();
    const second = await labels.nth(1).boundingBox();
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect((second?.y || 0) > (first?.y || 0)).toBeTruthy();

    await context.close();
  });

  test('Mobile: Motion Control sends uploaded URLs, not data URLs', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();

    await page.route('**/api/upload/voice-assets', async (route) => {
      const body = route.request().postData() || '';
      const isVideo = body.includes('name="type"\r\n\r\nvideo');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: isVideo
            ? 'https://cdn.example.com/motion.mp4'
            : 'https://cdn.example.com/character.jpg',
        }),
      });
    });

    await page.route('**/api/generate/video', async (route) => {
      const body = route.request().postDataJSON() as any;
      expect(body.model).toBe('kling-motion-control');
      expect(typeof body.referenceImage).toBe('string');
      expect(typeof body.referenceVideo).toBe('string');
      expect(body.referenceImage.startsWith('data:')).toBe(false);
      expect(body.referenceVideo.startsWith('data:')).toBe(false);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, jobId: 'motion-job', status: 'queued', creditCost: 1 }),
      });
    });

    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7n7WQAAAAASUVORK5CYII=',
      'base64'
    );
    const tinyMp4 = Buffer.from('AAAAIGZ0eXBpc29tAAAAAGlzb20', 'base64');

    await page.goto('/create/studio?section=video&model=kling-motion-control');
    await page.locator('input[type="file"][accept="video/*"]').setInputFiles({
      name: 'motion.mp4',
      mimeType: 'video/mp4',
      buffer: tinyMp4,
    });
    await page.locator('input[type="file"][accept="image/*"]').last().setInputFiles({
      name: 'character.png',
      mimeType: 'image/png',
      buffer: tinyPng,
    });
    await page.locator('button:has-text("Списать")').click();

    await context.close();
  });
});
