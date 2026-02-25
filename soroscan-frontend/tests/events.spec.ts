import { test, expect } from '@playwright/test';
import { setupMocks } from './support/mock-graphql';

test.describe('Event Explorer', () => {
    test.beforeEach(async ({ page }) => {
        await setupMocks(page);
        await page.goto('/dashboard');
    });

    test('should load events and apply filters', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Event Explorer Dashboard' })).toBeVisible();

        const contractDropdown = page.locator('#contract-select');

        // Wait for mock data to populate (should have 2 mock contracts + "All Contracts" = 3 options)
        await expect(contractDropdown.locator('option')).toHaveCount(3, { timeout: 5000 });

        await contractDropdown.selectOption({ index: 1 });

        // Apply filters
        await page.getByRole('button', { name: 'Apply Filters' }).click();

        // Verify events load (summary text)
        await expect(page.locator('text=/Showing/')).toBeVisible({ timeout: 10000 });

        // Test filtering
        const filterInput = page.getByPlaceholder('Search events...');
        await filterInput.fill('SWAP');

        // Results should filter client-side
        const rows = page.locator('tbody tr');
        await expect(rows).toHaveCount(1); // Mock data has one SWAP event
    });

    test('should export events as CSV', async ({ page }) => {
        const contractDropdown = page.locator('#contract-select');
        await expect(contractDropdown.locator('option')).toHaveCount(3, { timeout: 5000 });
        await contractDropdown.selectOption({ index: 1 });

        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Export CSV' }).click();

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('.csv');
    });

    test('visual regression - dashboard', async ({ page }) => {
        await expect(page).toHaveScreenshot('dashboard.png');
    });
});
