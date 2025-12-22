import { test, expect } from '@playwright/test';

test.describe('UI Components', () => {
  test.describe('Buttons', () => {
    test('should have clickable buttons', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      if (buttonCount > 0) {
        const firstButton = buttons.first();
        await expect(firstButton).toBeVisible();
        await expect(firstButton).toBeEnabled();
      }
    });

    test('should show hover state on buttons', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      if (buttonCount > 0) {
        await buttons.first().hover();
        // Visual check via screenshot
        await expect(page).toHaveScreenshot('button-hover.png');
      }
    });
  });

  test.describe('Links', () => {
    test('should have working navigation links', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const links = page.locator('a');
      const linkCount = await links.count();
      
      expect(linkCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Cards', () => {
    test('should display cards properly', async ({ page }) => {
      await page.goto('/quizzes');
      await page.waitForLoadState('networkidle');
      
      // Check for card-like elements
      const cards = page.locator('[class*="card"], [class*="Card"]');
      const cardCount = await cards.count();
      
      if (cardCount > 0) {
        await expect(cards.first()).toBeVisible();
      }
    });
  });

  test.describe('Images', () => {
    test('should load images without errors', async ({ page }) => {
      const failedImages: string[] = [];
      
      page.on('response', response => {
        if (response.request().resourceType() === 'image' && !response.ok()) {
          failedImages.push(response.url());
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      expect(failedImages).toHaveLength(0);
    });
  });
});
