# Testing Guide for SoroScan Frontend

This document provides comprehensive information about testing the SoroScan frontend application.

## Table of Contents

1. [Overview](#overview)
2. [Test Types](#test-types)
3. [Setup](#setup)
4. [Running Tests](#running-tests)
5. [Writing Tests](#writing-tests)
6. [CI/CD](#cicd)
7. [Best Practices](#best-practices)

## Overview

The SoroScan frontend uses two testing frameworks:

- **Jest** for unit and component tests
- **Playwright** for end-to-end (E2E) tests

## Test Types

### Unit Tests (Jest)

Located in `__tests__/` directories, these test individual components and functions in isolation.

```bash
# Run unit tests
pnpm test

# Run in watch mode
pnpm test:watch

# Run with coverage
pnpm test:ci
```

### E2E Tests (Playwright)

Located in `tests/` directory, these test complete user flows across the application.

```bash
# Run E2E tests
pnpm run test:e2e

# Run in UI mode
pnpm run test:e2e:ui

# Run specific browser
pnpm run test:e2e:chromium
```

## Setup

### Initial Setup

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install

# Install system dependencies (Linux only)
pnpm exec playwright install-deps
```

### Environment Variables

Create a `.env.local` file for local testing:

```env
NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:8000/graphql
BASE_URL=http://localhost:3000
```

## Running Tests

### All Tests

```bash
# Run all unit tests
pnpm test

# Run all E2E tests
pnpm run test:e2e
```

### Specific Tests

```bash
# Run specific unit test file
pnpm test ComponentName.test.tsx

# Run specific E2E test file
pnpm exec playwright test tests/events.spec.ts

# Run tests matching a pattern
pnpm exec playwright test --grep "should load"
```

### Debug Mode

```bash
# Debug unit tests
pnpm test --watch

# Debug E2E tests
pnpm run test:e2e:debug

# Run E2E tests with UI
pnpm run test:e2e:ui
```

### Cross-Browser Testing

```bash
# Test on Chromium
pnpm run test:e2e:chromium

# Test on Firefox
pnpm run test:e2e:firefox

# Test on WebKit (Safari)
pnpm run test:e2e:webkit
```

## Writing Tests

### Unit Test Example

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    screen.getByText('Click me').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test.describe('Event Explorer', () => {
  test('should filter events by type', async ({ page }) => {
    // Navigate to page
    await page.goto('/contracts/CCAA.../events');
    
    // Select event type
    await page.selectOption('#event-type-select', 'Transfer');
    
    // Apply filter
    await page.click('button:has-text("Apply Filters")');
    
    // Verify results
    await expect(page.locator('tbody tr')).toHaveCount(10);
  });
});
```

### Using Custom Fixtures

```typescript
import { test, expect, mockData } from './fixtures';

test('should create contract', async ({ page, mockContractId }) => {
  await page.goto('/contracts');
  
  // Use the fixture
  await page.fill('[name="contractId"]', mockContractId);
  await page.fill('[name="name"]', mockData.contract.name);
  
  await page.click('button[type="submit"]');
  
  await expect(page.locator(`text=${mockContractId}`)).toBeVisible();
});
```

### Using Helper Functions

```typescript
import { test, expect } from '@playwright/test';
import { waitForTableData, clickButton } from './helpers';

test('should load contracts', async ({ page }) => {
  await page.goto('/contracts');
  
  // Use helper
  await waitForTableData(page, 1);
  
  // Use helper
  await clickButton(page, 'Register Contract');
  
  await expect(page.locator('[role="dialog"]')).toBeVisible();
});
```

## CI/CD

### GitHub Actions

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests

The workflow:
1. Installs dependencies
2. Builds the application
3. Runs unit tests
4. Runs E2E tests
5. Uploads test reports

### Viewing Test Results

After a CI run:
1. Go to the Actions tab
2. Click on the workflow run
3. Download artifacts:
   - `playwright-report` - HTML test report
   - `playwright-results` - Screenshots and videos

### Local CI Simulation

```bash
# Run tests as they would run in CI
CI=true pnpm run test:e2e
```

## Best Practices

### General

1. **Write tests for critical user flows first**
2. **Keep tests independent** - each test should work in isolation
3. **Use descriptive test names** - describe what the test does
4. **Avoid testing implementation details** - test behavior, not code
5. **Keep tests maintainable** - use helpers and fixtures

### Unit Tests

1. **Test one thing at a time**
2. **Mock external dependencies**
3. **Use meaningful assertions**
4. **Test edge cases and error states**
5. **Keep tests fast**

### E2E Tests

1. **Use data-testid for stable selectors**
2. **Wait for elements properly** - use Playwright's auto-waiting
3. **Test real user scenarios**
4. **Avoid hard-coded waits** - use `waitForSelector` instead
5. **Clean up test data** if needed

### Accessibility Testing

1. **Check keyboard navigation**
2. **Verify ARIA attributes**
3. **Test with screen readers** (manual)
4. **Ensure proper heading hierarchy**
5. **Check color contrast**

### Visual Regression Testing

1. **Update snapshots intentionally**
2. **Review snapshot diffs carefully**
3. **Use consistent viewport sizes**
4. **Disable animations** for stable screenshots
5. **Test across browsers**

## Troubleshooting

### Common Issues

#### Tests Timing Out

```typescript
// Increase timeout for specific test
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ... test code
});
```

#### Flaky Tests

```typescript
// Add explicit waits
await page.waitForLoadState('networkidle');
await page.waitForSelector('[data-testid="content"]');

// Or use retries
test('flaky test', async ({ page }) => {
  test.retries(2);
  // ... test code
});
```

#### Element Not Found

```typescript
// Wait for element to be visible
await page.waitForSelector('button:has-text("Submit")', {
  state: 'visible',
  timeout: 10000,
});
```

### Debug Commands

```bash
# Show Playwright trace
pnpm exec playwright show-trace trace.zip

# Show test report
pnpm run test:e2e:report

# Run with verbose logging
DEBUG=pw:api pnpm run test:e2e
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)

## Contributing

When adding new features:

1. Write unit tests for components
2. Write E2E tests for user flows
3. Add data-testid attributes to key elements
4. Update test documentation
5. Ensure all tests pass before submitting PR

## Test Coverage Goals

- **Unit Tests**: 80%+ code coverage
- **E2E Tests**: All critical user flows covered
- **Accessibility**: WCAG 2.1 AA compliance
- **Cross-Browser**: Chrome, Firefox, Safari

## Maintenance

### Updating Snapshots

```bash
# Update all snapshots
pnpm exec playwright test --update-snapshots

# Update specific test snapshots
pnpm exec playwright test tests/visual.spec.ts --update-snapshots
```

### Updating Dependencies

```bash
# Update Playwright
pnpm update @playwright/test

# Reinstall browsers
pnpm exec playwright install
```

### Cleaning Up

```bash
# Remove test artifacts
rm -rf test-results playwright-report

# Clear Playwright cache
rm -rf ~/.cache/ms-playwright
```
