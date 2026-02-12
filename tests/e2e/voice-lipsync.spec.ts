import { expect, test } from '@playwright/test';

test.describe('Voice Lipsync Models', () => {
  test('shows standard/pro/infinitalk models', async ({ page }) => {
    await page.goto('/create/studio?section=voice');

    await expect(page.getByText('Kling AI Avatar Standard')).toBeVisible();
    await expect(page.getByText('Kling AI Avatar Pro')).toBeVisible();
    await expect(page.getByText('InfiniteTalk 480p')).toBeVisible();
    await expect(page.getByText('InfiniteTalk 720p')).toBeVisible();
  });

  test('seed input is shown only for infinitalk models', async ({ page }) => {
    await page.goto('/create/studio?section=voice');

    await page.getByRole('button', { name: /Kling AI Avatar Standard/i }).click();
    await expect(page.getByText('Seed', { exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: /InfiniteTalk 720p/i }).click();
    await expect(page.getByText('Seed', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('10000-1000000')).toBeVisible();
  });
});
