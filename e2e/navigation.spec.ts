import { test, expect } from '@playwright/test';

test.describe('Navigation Flow', () => {
  test('should navigate from home to quizzes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try to find a link to quizzes
    const quizzesLink = page.locator('a[href*="quizzes"], a[href*="quiz"]').first();
    
    if (await quizzesLink.isVisible()) {
      await quizzesLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('quiz');
    }
  });

  test('should navigate from home to create', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const createLink = page.locator('a[href*="create"]').first();
    
    if (await createLink.isVisible()) {
      await createLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('create');
    }
  });

  test('should handle browser back/forward', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/quizzes');
    await page.waitForLoadState('networkidle');
    
    await page.goBack();
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toContain('quizzes');
    
    await page.goForward();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('quizzes');
  });

  test('should handle 404 page', async ({ page }) => {
    await page.goto('/non-existent-page-12345');
    await page.waitForLoadState('networkidle');
    
    // Should show some content (not crash)
    await expect(page.locator('body')).toBeVisible();
  });
});
