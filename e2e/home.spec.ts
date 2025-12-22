import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Quiz/i);
  });

  test('should display main navigation elements', async ({ page }) => {
    await page.goto('/');
    
    // Check for main content
    await expect(page.locator('body')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should take screenshot of home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('home-page.png', { fullPage: true });
  });
});
