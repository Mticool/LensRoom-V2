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

  test('Motion Control requires motion/character inputs and camera_control', async ({ page }) => {
    await page.goto('/create/studio?section=video&model=kling-motion-control');

    // Motion tab content
    await expect(page.getByText('Motion Video')).toBeVisible();
    await expect(page.getByText('Your Character', { exact: true })).toBeVisible();
    await page.getByText('Advanced Settings', { exact: true }).click();
    await expect(page.getByText('camera_control (JSON)', { exact: true })).toBeVisible();
    await expect(page.getByText('Image-driven')).toBeVisible();
    await expect(page.getByText('Video-driven')).toBeVisible();
  });

  test('Kling 2.5 i2v requires start frame (UI)', async ({ page }) => {
    await page.goto('/create/studio?section=video&model=kling-2.5');
    await expect(page.getByRole('button', { name: 'Изображение', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Изображение', exact: true }).click();

    await expect(page.getByText('Первый кадр', { exact: true })).toBeVisible();
    await expect(page.getByText('Обязателен', { exact: true })).toBeVisible();
    await expect(page.getByText('Последний кадр', { exact: true })).toBeVisible();
    await expect(page.getByText('Опционально', { exact: true })).toBeVisible();
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
    await expect(page.getByText('Лимит длительности: 10с')).toBeVisible();
    await page.getByRole('button', { name: 'Video-driven', exact: true }).click();
    await expect(page.getByText('Лимит длительности: 30с')).toBeVisible();
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

  test('Generate request payload for Motion Control includes required fields (mocked API)', async ({ page }) => {
    await page.route('**/api/generate/video', async (route) => {
      const body = route.request().postDataJSON() as any;
      expect(body.model).toBe('kling-motion-control');
      expect(body.mode).toBe('motion_control');
      expect(body.characterOrientation).toBeTruthy();
      expect(body.cameraControl).toBeTruthy();
      expect(body.referenceVideo).toBeTruthy();
      expect(body.referenceImage).toBeTruthy();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, jobId: 'mock-job', status: 'queued', creditCost: 1 }),
      });
    });

    await page.goto('/create/studio?section=video&model=kling-motion-control');

    // Upload fake files to satisfy UI checks
    const videoInput = page.locator('input[type="file"][accept="video/*"]').first();
    await videoInput.setInputFiles({
      name: 'motion.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('fake'),
    });

    const imageInput = page.locator('input[type="file"][accept="image/*"]').first();
    await imageInput.setInputFiles({
      name: 'character.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake'),
    });

    // Open advanced settings and set camera_control
    await page.getByText('Advanced Settings', { exact: true }).click();
    await page.getByPlaceholder('{"key":"value"}').fill('{"pan":"left"}');

    await page.locator('button', { hasText: 'Создать' }).last().click();
  });
});
