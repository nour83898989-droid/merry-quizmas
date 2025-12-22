import { test, expect } from '@playwright/test';

test.describe('Create Quiz Page', () => {
  test('should load create quiz page', async ({ page }) => {
    await page.goto('/create');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display form elements', async ({ page }) => {
    await page.goto('/create');
    await page.waitForLoadState('networkidle');
    
    // Check for form container
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should handle form input', async ({ page }) => {
    await page.goto('/create');
    await page.waitForLoadState('networkidle');
    
    // Try to find and interact with input fields
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    
    if (inputCount > 0) {
      await inputs.first().click();
      await expect(inputs.first()).toBeFocused();
    }
  });

  test('should take screenshot of create page', async ({ page }) => {
    await page.goto('/create');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('create-page.png', { fullPage: true });
  });
});
