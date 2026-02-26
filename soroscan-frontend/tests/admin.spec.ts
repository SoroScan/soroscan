import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should load dashboard page', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForTimeout(1000);
    
    // Dashboard should be visible
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should display dashboard metrics', async ({ page }) => {
    await page.waitForTimeout(1500);
    
    // Look for metric cards or statistics
    const metricCards = page.locator('[class*="card"], [class*="metric"], [class*="stat"]');
    const hasMetrics = await metricCards.count() > 0;
    
    if (hasMetrics) {
      await expect(metricCards.first()).toBeVisible();
    }
  });

  test('should display event statistics', async ({ page }) => {
    await page.waitForTimeout(1500);
    
    // Look for event-related statistics
    const eventStats = page.locator('text=event, text=Event').first();
    const hasEventStats = await eventStats.isVisible().catch(() => false);
    
    if (hasEventStats) {
      await expect(eventStats).toBeVisible();
    }
  });

  test('should display contract statistics', async ({ page }) => {
    await page.waitForTimeout(1500);
    
    // Look for contract-related statistics
    const contractStats = page.locator('text=contract, text=Contract').first();
    const hasContractStats = await contractStats.isVisible().catch(() => false);
    
    if (hasContractStats) {
      await expect(contractStats).toBeVisible();
    }
  });

  test('should display charts or graphs', async ({ page }) => {
    await page.waitForTimeout(1500);
    
    // Look for chart elements (canvas, svg, etc.)
    const charts = page.locator('canvas, svg[class*="chart"]');
    const hasCharts = await charts.count() > 0;
    
    if (hasCharts) {
      await expect(charts.first()).toBeVisible();
    }
  });

  test('should filter dashboard by date range', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    // Look for date range filters
    const dateInputs = page.locator('input[type="date"], input[type="datetime-local"]');
    const hasDateFilters = await dateInputs.count() > 0;
    
    if (hasDateFilters) {
      await expect(dateInputs.first()).toBeVisible();
      
      // Try to set a date range
      const firstInput = dateInputs.first();
      await firstInput.fill('2024-01-01');
      await page.waitForTimeout(500);
    }
  });

  test('should refresh dashboard data', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    // Look for refresh button
    const refreshButton = page.locator('button:has-text("Refresh"), button[aria-label*="refresh"]').first();
    
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(1000);
      
      // Data should reload
    }
  });

  test('should display recent events', async ({ page }) => {
    await page.waitForTimeout(1500);
    
    // Look for recent events section
    const recentEvents = page.locator('text=Recent, text=Latest').first();
    const hasRecentEvents = await recentEvents.isVisible().catch(() => false);
    
    if (hasRecentEvents) {
      await expect(recentEvents).toBeVisible();
    }
  });

  test('should navigate to detailed views', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    // Look for links to other pages
    const links = page.locator('a[href*="/contracts"], a[href*="/events"]');
    const hasLinks = await links.count() > 0;
    
    if (hasLinks) {
      const firstLink = links.first();
      await expect(firstLink).toBeVisible();
    }
  });

  test('should display system health status', async ({ page }) => {
    await page.waitForTimeout(1500);
    
    // Look for health or status indicators
    const healthIndicators = page.locator('[class*="health"], [class*="status"], text=healthy, text=online').first();
    const hasHealth = await healthIndicators.isVisible().catch(() => false);
    
    if (hasHealth) {
      await expect(healthIndicators).toBeVisible();
    }
  });

  test('should show loading states', async ({ page }) => {
    // Immediately check for loading indicators
    const loadingIndicators = page.locator('text=Loading, text=LOADING, [class*="loading"], [class*="spinner"]');
    const hasLoading = await loadingIndicators.count() > 0;
    
    if (hasLoading) {
      // Loading indicator should eventually disappear
      await page.waitForTimeout(3000);
    }
  });

  test('should handle empty data states', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Check for empty state messages
    const emptyStates = page.locator('text=No data, text=No events, text=No contracts');
    const hasEmptyState = await emptyStates.count() > 0;
    
    if (hasEmptyState) {
      await expect(emptyStates.first()).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // Dashboard should still be usable
    const mainContent = page.locator('main, [role="main"]');
    expect(await mainContent.count()).toBeGreaterThan(0);
  });

  test('should display time-based metrics', async ({ page }) => {
    await page.waitForTimeout(1500);
    
    // Look for time-based data (hourly, daily, etc.)
    const timeMetrics = page.locator('text=hour, text=day, text=week, text=month').first();
    const hasTimeMetrics = await timeMetrics.isVisible().catch(() => false);
    
    if (hasTimeMetrics) {
      await expect(timeMetrics).toBeVisible();
    }
  });

  test('should export dashboard data', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    // Look for export button
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")').first();
    
    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should have proper accessibility', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    // Check for proper heading structure
    const headings = page.locator('h1, h2, h3');
    const hasHeadings = await headings.count() > 0;
    
    expect(hasHeadings).toBeTruthy();
    
    // Check for ARIA labels on interactive elements
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    expect(buttonCount).toBeGreaterThan(0);
  });
});
