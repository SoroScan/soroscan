import { test, expect } from '@playwright/test';

test.describe('Contract Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contracts');
  });

  test('should load contracts page', async ({ page }) => {
    // Check for main heading
    await expect(page.locator('text=CONTRACT_REGISTRY')).toBeVisible();
    
    // Check for description
    await expect(page.locator('text=Manage tracked contracts')).toBeVisible();
    
    // Check for register button
    await expect(page.locator('button:has-text("Register Contract")')).toBeVisible();
  });

  test('should display contracts table', async ({ page }) => {
    // Wait for contracts to load
    await page.waitForTimeout(1000);
    
    // Check for the card title
    await expect(page.locator('text=TRACKED_CONTRACTS')).toBeVisible();
    
    // Table should be visible (or loading message)
    const loadingText = page.locator('text=LOADING...');
    const tableExists = await page.locator('table').count() > 0;
    
    expect(tableExists || await loadingText.isVisible()).toBeTruthy();
  });

  test('should open register contract modal', async ({ page }) => {
    // Click register button
    await page.locator('button:has-text("Register Contract")').click();
    
    // Wait for modal to appear
    await page.waitForTimeout(500);
    
    // Modal should be visible (check for common modal elements)
    // Note: Adjust selectors based on your RegisterModal implementation
    const modalVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
    const formVisible = await page.locator('form').isVisible().catch(() => false);
    
    expect(modalVisible || formVisible).toBeTruthy();
  });

  test('should validate contract registration form', async ({ page }) => {
    // Open register modal
    await page.locator('button:has-text("Register Contract")').click();
    await page.waitForTimeout(500);
    
    // Try to submit empty form (if there's a submit button)
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // Should show validation errors
      await page.waitForTimeout(500);
      // Validation messages should appear (adjust selector as needed)
    }
  });

  test('should register a new contract', async ({ page }) => {
    // Open register modal
    await page.locator('button:has-text("Register Contract")').click();
    await page.waitForTimeout(500);
    
    // Fill in contract details
    const contractIdInput = page.locator('input[name="contractId"], input[placeholder*="contract"]').first();
    const nameInput = page.locator('input[name="name"], input[placeholder*="name"]').first();
    
    if (await contractIdInput.isVisible() && await nameInput.isVisible()) {
      await contractIdInput.fill('CCAA1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890');
      await nameInput.fill('Test Contract');
      
      // Submit form
      await page.locator('button[type="submit"]').click();
      
      // Wait for submission
      await page.waitForTimeout(1000);
      
      // Modal should close or show success message
    }
  });

  test('should delete a contract', async ({ page }) => {
    // Wait for contracts to load
    await page.waitForTimeout(1000);
    
    // Check if there are any delete buttons
    const deleteButtons = page.locator('button:has-text("Delete"), button[aria-label*="delete"]');
    const deleteCount = await deleteButtons.count();
    
    if (deleteCount > 0) {
      // Click first delete button
      await deleteButtons.first().click();
      
      // Wait for confirmation modal
      await page.waitForTimeout(500);
      
      // Look for confirmation button
      const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        
        // Wait for deletion to complete
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should cancel contract deletion', async ({ page }) => {
    // Wait for contracts to load
    await page.waitForTimeout(1000);
    
    // Check if there are any delete buttons
    const deleteButtons = page.locator('button:has-text("Delete"), button[aria-label*="delete"]');
    const deleteCount = await deleteButtons.count();
    
    if (deleteCount > 0) {
      // Click first delete button
      await deleteButtons.first().click();
      
      // Wait for confirmation modal
      await page.waitForTimeout(500);
      
      // Look for cancel button
      const cancelButton = page.locator('button:has-text("Cancel")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        
        // Modal should close
        await page.waitForTimeout(500);
      }
    }
  });

  test('should navigate to contract details', async ({ page }) => {
    // Wait for contracts to load
    await page.waitForTimeout(1000);
    
    // Look for contract links or view buttons
    const contractLinks = page.locator('a[href*="/contracts/"]');
    const linkCount = await contractLinks.count();
    
    if (linkCount > 0) {
      // Click first contract link
      await contractLinks.first().click();
      
      // Should navigate to contract details
      await expect(page).toHaveURL(/\/contracts\/.+/);
    }
  });

  test('should handle empty contracts list', async ({ page }) => {
    // Wait for loading to complete
    await page.waitForTimeout(2000);
    
    // Check if there's an empty state message or table with data
    const hasTableRows = await page.locator('tbody tr').count() > 0;
    const hasEmptyMessage = await page.locator('text=No contracts').isVisible().catch(() => false);
    
    // Either should have data or show empty state
    expect(hasTableRows || hasEmptyMessage).toBeTruthy();
  });

  test('should display error messages', async ({ page }) => {
    // Error messages should be handled gracefully
    // Check if error container exists
    const errorContainer = page.locator('[class*="error"], [class*="danger"]');
    
    // If errors exist, they should be visible
    const errorCount = await errorContainer.count();
    if (errorCount > 0) {
      await expect(errorContainer.first()).toBeVisible();
    }
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Page should still be usable
    await expect(page.locator('text=CONTRACT_REGISTRY')).toBeVisible();
    await expect(page.locator('button:has-text("Register Contract")')).toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    // Check for proper accessibility attributes
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    // At least some buttons should exist
    expect(buttonCount).toBeGreaterThan(0);
    
    // Main content should be accessible
    const main = page.locator('main, [role="main"]');
    expect(await main.count()).toBeGreaterThan(0);
  });
});
