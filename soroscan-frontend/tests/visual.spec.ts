import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('homepage visual snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('contracts page visual snapshot', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForTimeout(1500);
    
    await expect(page).toHaveScreenshot('contracts-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('dashboard visual snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('event explorer visual snapshot', async ({ page }) => {
    const mockContractId = 'CCAA1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890';
    await page.goto(`/contracts/${mockContractId}/events`);
    await page.waitForTimeout(1500);
    
    await expect(page).toHaveScreenshot('event-explorer.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('mobile homepage visual snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('mobile contracts page visual snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/contracts');
    await page.waitForTimeout(1500);
    
    await expect(page).toHaveScreenshot('contracts-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('tablet dashboard visual snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('dark mode consistency', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Check if dark mode toggle exists
    const darkModeToggle = page.locator('button[aria-label*="dark"], button[aria-label*="theme"]').first();
    
    if (await darkModeToggle.isVisible()) {
      await darkModeToggle.click();
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('homepage-dark.png', {
        fullPage: true,
        animations: 'disabled',
      });
    }
  });

  test('modal visual snapshot', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForTimeout(1000);
    
    // Open register modal
    const registerButton = page.locator('button:has-text("Register Contract")');
    if (await registerButton.isVisible()) {
      await registerButton.click();
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('register-modal.png', {
        animations: 'disabled',
      });
    }
  });

  test('table with data visual snapshot', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForTimeout(1500);
    
    // Take screenshot of just the table area
    const table = page.locator('table').first();
    if (await table.isVisible()) {
      await expect(table).toHaveScreenshot('contracts-table.png', {
        animations: 'disabled',
      });
    }
  });

  test('error state visual snapshot', async ({ page }) => {
    // Navigate to a page that might show an error
    const invalidContractId = 'INVALID_CONTRACT_ID';
    await page.goto(`/contracts/${invalidContractId}/events`);
    await page.waitForTimeout(1500);
    
    await expect(page).toHaveScreenshot('error-state.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('loading state visual snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Capture loading state quickly
    await page.waitForTimeout(100);
    
    const loadingIndicator = page.locator('[class*="loading"], text=Loading').first();
    if (await loadingIndicator.isVisible()) {
      await expect(page).toHaveScreenshot('loading-state.png', {
        animations: 'disabled',
      });
    }
  });
});
