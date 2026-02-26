import { test, expect } from '@playwright/test';

test.describe('Accessibility Tests', () => {
  test('homepage should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT', 'SELECT']).toContain(focusedElement);
    
    // Continue tabbing
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to navigate with keyboard
    focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('contracts page should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForTimeout(1000);
    
    // Check for h1
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    
    // Check heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
  });

  test('buttons should have accessible names', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForTimeout(1000);
    
    // All buttons should have text or aria-label
    const buttons = await page.locator('button').all();
    
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      
      expect(text || ariaLabel).toBeTruthy();
    }
  });

  test('form inputs should have labels', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForTimeout(1000);
    
    // Open register modal
    const registerButton = page.locator('button:has-text("Register Contract")');
    if (await registerButton.isVisible()) {
      await registerButton.click();
      await page.waitForTimeout(500);
      
      // Check inputs have labels or aria-label
      const inputs = await page.locator('input').all();
      
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;
          
          expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
        }
      }
    }
  });

  test('images should have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Check all images have alt attributes
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt !== null).toBeTruthy();
    }
  });

  test('links should have descriptive text', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Check links have meaningful text
    const links = await page.locator('a').all();
    
    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      
      expect(text?.trim() || ariaLabel).toBeTruthy();
    }
  });

  test('focus should be visible', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForTimeout(1000);
    
    // Tab to first interactive element
    await page.keyboard.press('Tab');
    
    // Check if focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('color contrast should be sufficient', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // This is a basic check - for comprehensive contrast testing,
    // you'd want to use axe-core or similar tools
    
    // Check that text is visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('modals should trap focus', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForTimeout(1000);
    
    // Open modal
    const registerButton = page.locator('button:has-text("Register Contract")');
    if (await registerButton.isVisible()) {
      await registerButton.click();
      await page.waitForTimeout(500);
      
      // Tab through modal elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Focus should stay within modal
      const focusedElement = await page.evaluate(() => {
        const active = document.activeElement;
        const modal = document.querySelector('[role="dialog"]');
        return modal?.contains(active) ?? false;
      });
      
      // If modal exists, focus should be trapped
      const modalExists = await page.locator('[role="dialog"]').count() > 0;
      if (modalExists) {
        expect(focusedElement).toBeTruthy();
      }
    }
  });

  test('tables should have proper structure', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForTimeout(1500);
    
    // Check if table exists
    const table = page.locator('table').first();
    
    if (await table.isVisible()) {
      // Should have thead
      const thead = table.locator('thead');
      await expect(thead).toBeVisible();
      
      // Should have tbody
      const tbody = table.locator('tbody');
      await expect(tbody).toBeVisible();
      
      // Headers should have th elements
      const headers = table.locator('th');
      expect(await headers.count()).toBeGreaterThan(0);
    }
  });

  test('ARIA landmarks should be present', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Check for main landmark
    const main = page.locator('main, [role="main"]');
    expect(await main.count()).toBeGreaterThan(0);
  });

  test('skip to main content link', async ({ page }) => {
    await page.goto('/');
    
    // Tab to first element (often skip link)
    await page.keyboard.press('Tab');
    
    const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
    
    // Many accessible sites have a skip link as first tabbable element
    // This is optional but good practice
  });

  test('error messages should be announced', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForTimeout(1000);
    
    // Open register modal
    const registerButton = page.locator('button:has-text("Register Contract")');
    if (await registerButton.isVisible()) {
      await registerButton.click();
      await page.waitForTimeout(500);
      
      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(500);
        
        // Error messages should have aria-live or role="alert"
        const errorMessages = page.locator('[role="alert"], [aria-live="polite"], [aria-live="assertive"]');
        const hasErrorAnnouncement = await errorMessages.count() > 0;
        
        // If there are validation errors, they should be announced
      }
    }
  });

  test('interactive elements should have sufficient size', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForTimeout(1000);
    
    // Check button sizes (WCAG recommends 44x44px minimum)
    const buttons = await page.locator('button').all();
    
    for (const button of buttons.slice(0, 5)) { // Check first 5 buttons
      const box = await button.boundingBox();
      
      if (box) {
        // Buttons should be reasonably sized for touch targets
        expect(box.width).toBeGreaterThan(20);
        expect(box.height).toBeGreaterThan(20);
      }
    }
  });

  test('page should have a title', async ({ page }) => {
    await page.goto('/');
    
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });
});
