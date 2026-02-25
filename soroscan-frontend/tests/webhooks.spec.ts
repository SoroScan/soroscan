import { test, expect } from '@playwright/test';
import { setupMocks } from './support/mock-graphql';

test.describe('Webhook Manager', () => {
    test.beforeEach(async ({ page }) => {
        await setupMocks(page);
        await page.goto('/webhooks');
    });

    test('should create and test a webhook', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'SUBSCRIPTIONS' })).toBeVisible();

        await page.getByRole('button', { name: 'NEW_WEBHOOK' }).click();

        // Fill the webhook modal using placeholder
        await page.getByPlaceholder('https://yourapp.io/webhook').fill('https://example.com/webhook');
        await page.getByRole('button', { name: 'CREATE_WEBHOOK' }).click();

        // Verify in table
        await expect(page.locator('text=https://example.com/webhook')).toBeVisible();

        // Test the webhook (simulated)
        await page.locator('tr').filter({ hasText: 'https://example.com/webhook' }).getByRole('button', { name: 'TEST' }).click();

        // Wait for test result (UI shows "OK" after simulation)
        await expect(page.locator('text=OK')).toBeVisible({ timeout: 5000 });
    });

    test('visual regression - webhooks page', async ({ page }) => {
        await expect(page).toHaveScreenshot('webhooks.png');
    });
});
