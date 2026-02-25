import { test, expect } from '@playwright/test';
import { setupMocks } from './support/mock-graphql';

test.describe('Contract Management', () => {
    test.beforeEach(async ({ page }) => {
        await setupMocks(page);
        await page.goto('/contracts');
    });

    test('should register a new contract', async ({ page }) => {
        // Wait for page load
        await expect(page.getByRole('heading', { name: '[CONTRACT_REGISTRY]' })).toBeVisible();

        await page.getByRole('button', { name: 'Register Contract' }).click();

        // Fill the registration modal using placeholders (since label-id link is missing)
        await page.getByPlaceholder('CA...').fill('CABC1234567890');
        await page.getByPlaceholder('My Contract').fill('Test Contract');

        // Exact match to avoid collision with "Register Contract" button
        await page.getByRole('button', { name: 'REGISTER', exact: true }).click();

        // Verify success (Table update)
        await expect(page.locator('text=Test Contract')).toBeVisible();
    });

    test('visual regression - contracts page', async ({ page }) => {
        await expect(page).toHaveScreenshot('contracts.png');
    });
});
