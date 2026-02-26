import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads successfully
    await expect(page).toHaveTitle(/SoroScan/i);
  });

  test('should navigate to contracts page', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to contracts
    await page.goto('/contracts');
    
    // Verify we're on the contracts page
    await expect(page.locator('text=CONTRACT_REGISTRY')).toBeVisible();
  });

  test('should navigate to dashboard', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Verify dashboard loads
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check for basic accessibility
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });
});
