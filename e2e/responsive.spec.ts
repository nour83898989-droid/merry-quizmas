import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'wide', width: 1920, height: 1080 },
];

test.describe('Responsive Design', () => {
  for (const viewport of viewports) {
    test(`should render correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('body')).toBeVisible();
      await expect(page).toHaveScreenshot(`home-${viewport.name}.png`, { fullPage: true });
    });

    test(`quizzes page on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/quizzes');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('body')).toBeVisible();
      await expect(page).toHaveScreenshot(`quizzes-${viewport.name}.png`, { fullPage: true });
    });
  }

  test('should handle orientation change', async ({ page }) => {
    // Portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('portrait.png');
    
    // Landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('landscape.png');
  });
});
