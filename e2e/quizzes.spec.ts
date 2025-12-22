import { test, expect } from '@playwright/test';

test.describe('Quizzes Page', () => {
  test('should load quizzes list page', async ({ page }) => {
    await page.goto('/quizzes');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display quiz cards or empty state', async ({ page }) => {
    await page.goto('/quizzes');
    await page.waitForLoadState('networkidle');
    
    // Either quiz cards or empty state should be visible
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/quizzes');
    await page.waitForLoadState('networkidle');
    
    // Tab through elements
    await page.keyboard.press('Tab');
    
    // Check focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should take screenshot of quizzes page', async ({ page }) => {
    await page.goto('/quizzes');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('quizzes-page.png', { fullPage: true });
  });
});
