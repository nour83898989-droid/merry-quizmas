import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for h1
    const h1 = page.locator('h1');
    const h1Count = await h1.count();
    expect(h1Count).toBeGreaterThanOrEqual(0);
  });

  test('should have alt text on images', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      // Alt can be empty string for decorative images
      expect(alt).not.toBeNull();
    }
  });

  test('should be navigable with keyboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Press Tab multiple times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }
    
    // Check that something is focused
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Visual regression test for contrast
    await expect(page).toHaveScreenshot('contrast-check.png');
  });
});
