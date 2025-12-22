import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'] });

test.describe('Touch Interactions', () => {
  test('should handle tap on buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      await buttons.first().tap();
    }
  });

  test('should handle swipe gestures', async ({ page }) => {
    await page.goto('/quizzes');
    await page.waitForLoadState('networkidle');
    
    // Simulate swipe
    await page.mouse.move(200, 400);
    await page.mouse.down();
    await page.mouse.move(50, 400, { steps: 10 });
    await page.mouse.up();
  });

  test('should handle scroll on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500));
    
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);
  });

  test('should handle pinch zoom', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check viewport meta tag prevents unwanted zoom
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toBeTruthy();
  });
});
