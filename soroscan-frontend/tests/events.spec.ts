import { test, expect } from '@playwright/test';

test.describe('Event Explorer', () => {
  const mockContractId = 'CCAA1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890';

  test.beforeEach(async ({ page }) => {
    // Navigate to a contract's event explorer
    await page.goto(`/contracts/${mockContractId}/events`);
  });

  test('should load event explorer page', async ({ page }) => {
    // Check for the main heading
    await expect(page.locator('text=SoroScan Event Explorer')).toBeVisible();
    
    // Check for contract ID display
    await expect(page.locator(`text=${mockContractId}`)).toBeVisible();
  });

  test('should display filters section', async ({ page }) => {
    // Check for filters heading
    await expect(page.locator('text=Filters')).toBeVisible();
    
    // Check for event type dropdown
    const eventTypeSelect = page.locator('#event-type-select');
    await expect(eventTypeSelect).toBeVisible();
    
    // Check for date inputs
    await expect(page.locator('#date-since')).toBeVisible();
    await expect(page.locator('#date-until')).toBeVisible();
  });

  test('should apply event type filter', async ({ page }) => {
    // Wait for event types to load
    await page.waitForTimeout(1000);
    
    // Select an event type if available
    const eventTypeSelect = page.locator('#event-type-select');
    const options = await eventTypeSelect.locator('option').count();
    
    if (options > 1) {
      // Select the first non-empty option
      await eventTypeSelect.selectOption({ index: 1 });
      
      // Click apply filters
      await page.locator('button:has-text("Apply Filters")').click();
      
      // Wait for the table to update
      await page.waitForTimeout(500);
      
      // Verify status message updates
      await expect(page.locator('[aria-live="polite"]')).toBeVisible();
    }
  });

  test('should apply date range filter', async ({ page }) => {
    // Set date range
    const fromDate = '2024-01-01T00:00';
    const toDate = '2024-12-31T23:59';
    
    await page.locator('#date-since').fill(fromDate);
    await page.locator('#date-until').fill(toDate);
    
    // Apply filters
    await page.locator('button:has-text("Apply Filters")').click();
    
    // Wait for results
    await page.waitForTimeout(500);
    
    // Verify the filter was applied (status should update)
    await expect(page.locator('[aria-live="polite"]')).toBeVisible();
  });

  test('should clear filters', async ({ page }) => {
    // Set some filters
    await page.locator('#date-since').fill('2024-01-01T00:00');
    await page.locator('button:has-text("Apply Filters")').click();
    await page.waitForTimeout(500);
    
    // Clear filters
    await page.locator('button:has-text("Clear Filters")').click();
    
    // Verify inputs are cleared
    await expect(page.locator('#date-since')).toHaveValue('');
    await expect(page.locator('#date-until')).toHaveValue('');
  });

  test('should display events table', async ({ page }) => {
    // Check for table headers
    await expect(page.locator('th:has-text("Timestamp")')).toBeVisible();
    await expect(page.locator('th:has-text("Type")')).toBeVisible();
    await expect(page.locator('th:has-text("Ledger")')).toBeVisible();
    await expect(page.locator('th:has-text("Event Index")')).toBeVisible();
    await expect(page.locator('th:has-text("Transaction")')).toBeVisible();
    await expect(page.locator('th:has-text("Payload")')).toBeVisible();
  });

  test('should paginate through events', async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(1000);
    
    // Check if Next button exists
    const nextButton = page.locator('button:has-text("Next")');
    const isNextEnabled = await nextButton.isEnabled();
    
    if (isNextEnabled) {
      // Click next page
      await nextButton.click();
      
      // Verify page number updates
      await expect(page.locator('text=Page 2')).toBeVisible();
      
      // Previous button should now be enabled
      await expect(page.locator('button:has-text("Previous")')).toBeEnabled();
    }
  });

  test('should open export modal', async ({ page }) => {
    // Click export button
    await page.locator('button:has-text("Export Events")').click();
    
    // Wait for modal to appear
    await page.waitForTimeout(500);
    
    // Check if modal content is visible (this depends on your modal implementation)
    // You may need to adjust the selector based on your ExportEventsModal component
  });

  test('should navigate to timeline view', async ({ page }) => {
    // Click timeline link
    await page.locator('a:has-text("Open Timeline")').click();
    
    // Verify navigation to timeline
    await expect(page).toHaveURL(new RegExp(`/contracts/${mockContractId}/timeline`));
  });

  test('should handle contract not found', async ({ page }) => {
    const invalidContractId = 'INVALID_CONTRACT_ID';
    await page.goto(`/contracts/${invalidContractId}/events`);
    
    // Wait for error message
    await page.waitForTimeout(1000);
    
    // Should show contract not found message
    await expect(page.locator('text=Contract not found')).toBeVisible();
  });

  test('should be keyboard accessible', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Verify focus is visible on interactive elements
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'SELECT', 'INPUT']).toContain(focusedElement);
  });
});
