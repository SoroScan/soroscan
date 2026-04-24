import { Page, expect } from '@playwright/test';

/**
 * Helper functions for E2E tests
 */

/**
 * Wait for the page to finish loading
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
}

/**
 * Fill a form field by label text
 */
export async function fillFormField(page: Page, labelText: string, value: string) {
  const label = page.locator(`label:has-text("${labelText}")`);
  const input = await label.locator('input, textarea, select').first();
  await input.fill(value);
}

/**
 * Click a button by text
 */
export async function clickButton(page: Page, buttonText: string) {
  await page.locator(`button:has-text("${buttonText}")`).click();
}

/**
 * Wait for a modal to appear
 */
export async function waitForModal(page: Page) {
  await page.waitForSelector('[role="dialog"]', { state: 'visible' });
}

/**
 * Close a modal by clicking the close button or overlay
 */
export async function closeModal(page: Page) {
  const closeButton = page.locator('[role="dialog"] button[aria-label*="close"]').first();
  
  if (await closeButton.isVisible()) {
    await closeButton.click();
  } else {
    // Try clicking overlay
    await page.keyboard.press('Escape');
  }
}

/**
 * Check if an element is visible with timeout
 */
export async function isVisible(page: Page, selector: string, timeout = 5000): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for table to load data
 */
export async function waitForTableData(page: Page, minRows = 1) {
  await page.waitForFunction(
    (min) => {
      const rows = document.querySelectorAll('tbody tr');
      return rows.length >= min;
    },
    minRows,
    { timeout: 10000 }
  );
}

/**
 * Get table row count
 */
export async function getTableRowCount(page: Page): Promise<number> {
  return await page.locator('tbody tr').count();
}

/**
 * Select option from dropdown by text
 */
export async function selectOption(page: Page, selectSelector: string, optionText: string) {
  await page.locator(selectSelector).selectOption({ label: optionText });
}

/**
 * Wait for API response
 */
export async function waitForGraphQLResponse(page: Page, operationName: string) {
  return await page.waitForResponse(
    (response) =>
      response.url().includes('/graphql') &&
      response.request().postDataJSON()?.operationName === operationName
  );
}

/**
 * Mock GraphQL response
 */
export async function mockGraphQLResponse(
  page: Page,
  operationName: string,
  data: any
) {
  await page.route('**/graphql', async (route) => {
    const request = route.request();
    const postData = request.postDataJSON();
    
    if (postData?.operationName === operationName) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Take a screenshot with a custom name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/${name}.png`, fullPage: true });
}

/**
 * Check for console errors
 */
export async function checkForConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  return errors;
}

/**
 * Wait for loading to complete
 */
export async function waitForLoadingToComplete(page: Page) {
  // Wait for loading indicators to disappear
  await page.waitForSelector('text=Loading, text=LOADING', { state: 'hidden', timeout: 10000 }).catch(() => {});
  await page.waitForSelector('[class*="loading"]', { state: 'hidden', timeout: 10000 }).catch(() => {});
  await page.waitForSelector('[class*="spinner"]', { state: 'hidden', timeout: 10000 }).catch(() => {});
}

/**
 * Scroll to element
 */
export async function scrollToElement(page: Page, selector: string) {
  await page.locator(selector).scrollIntoViewIfNeeded();
}

/**
 * Check accessibility of a page
 */
export async function checkBasicAccessibility(page: Page) {
  // Check for h1
  const h1Count = await page.locator('h1').count();
  expect(h1Count).toBeGreaterThanOrEqual(1);
  
  // Check for main landmark
  const mainCount = await page.locator('main, [role="main"]').count();
  expect(mainCount).toBeGreaterThanOrEqual(1);
  
  // Check that all images have alt text
  const images = await page.locator('img').all();
  for (const img of images) {
    const alt = await img.getAttribute('alt');
    expect(alt).not.toBeNull();
  }
}

/**
 * Generate a random contract ID for testing
 */
export function generateMockContractId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'C';
  for (let i = 0; i < 55; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Format date for datetime-local input
 */
export function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Wait for navigation to complete
 */
export async function waitForNavigation(page: Page, urlPattern: string | RegExp) {
  await page.waitForURL(urlPattern);
  await waitForPageLoad(page);
}

/**
 * Retry an action until it succeeds or times out
 */
export async function retryAction<T>(
  action: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await action();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Retry action failed');
}

/**
 * Check if element has focus
 */
export async function hasFocus(page: Page, selector: string): Promise<boolean> {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    return element === document.activeElement;
  }, selector);
}

/**
 * Get computed style of an element
 */
export async function getComputedStyle(page: Page, selector: string, property: string): Promise<string> {
  return await page.evaluate(
    ({ sel, prop }) => {
      const element = document.querySelector(sel);
      if (!element) return '';
      return window.getComputedStyle(element).getPropertyValue(prop);
    },
    { sel: selector, prop: property }
  );
}
