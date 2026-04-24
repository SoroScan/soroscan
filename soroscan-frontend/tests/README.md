# E2E Testing with Playwright

This directory contains end-to-end tests for the SoroScan frontend application using Playwright.

## Test Structure

```
tests/
├── auth.spec.ts           # Authentication and navigation tests
├── events.spec.ts         # Event Explorer functionality tests
├── contracts.spec.ts      # Contract Management tests
├── webhooks.spec.ts       # Webhook Manager tests
├── admin.spec.ts          # Admin Dashboard tests
├── accessibility.spec.ts  # Accessibility compliance tests
├── visual.spec.ts         # Visual regression tests
└── README.md             # This file
```

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install
```

### Running Tests

```bash
# Run all tests
pnpm run test:e2e

# Run tests in UI mode (interactive)
pnpm run test:e2e:ui

# Run tests in headed mode (see browser)
pnpm run test:e2e:headed

# Run tests in debug mode
pnpm run test:e2e:debug

# Run specific browser tests
pnpm run test:e2e:chromium
pnpm run test:e2e:firefox
pnpm run test:e2e:webkit

# View test report
pnpm run test:e2e:report
```

### Running Specific Tests

```bash
# Run a specific test file
pnpm exec playwright test tests/events.spec.ts

# Run tests matching a pattern
pnpm exec playwright test --grep "should load"

# Run a specific test by line number
pnpm exec playwright test tests/events.spec.ts:10
```

## Test Coverage

### Authentication Tests (`auth.spec.ts`)
- Homepage loading
- Navigation between pages
- Basic accessibility checks

### Event Explorer Tests (`events.spec.ts`)
- Page loading and display
- Filter functionality (event type, date range)
- Pagination
- Export functionality
- Timeline navigation
- Error handling
- Keyboard accessibility

### Contract Management Tests (`contracts.spec.ts`)
- Contracts page loading
- Contract registration
- Form validation
- Contract deletion
- Contract editing
- Responsive design
- ARIA labels

### Webhook Tests (`webhooks.spec.ts`)
- Webhook creation
- Webhook testing
- Webhook deletion
- Webhook editing
- Status display
- Delivery logs

### Admin Dashboard Tests (`admin.spec.ts`)
- Dashboard metrics display
- Statistics visualization
- Date range filtering
- Data refresh
- Recent events display
- System health status

### Accessibility Tests (`accessibility.spec.ts`)
- Keyboard navigation
- Heading hierarchy
- Button accessibility
- Form labels
- Image alt text
- Link descriptions
- Focus visibility
- Color contrast
- Modal focus trapping
- Table structure
- ARIA landmarks
- Error announcements
- Touch target sizes

### Visual Regression Tests (`visual.spec.ts`)
- Homepage snapshots
- Contracts page snapshots
- Dashboard snapshots
- Event explorer snapshots
- Mobile responsive snapshots
- Tablet responsive snapshots
- Dark mode consistency
- Modal snapshots
- Error state snapshots
- Loading state snapshots

## Configuration

The Playwright configuration is in `playwright.config.ts`. Key settings:

- **Base URL**: `http://localhost:3000` (configurable via `BASE_URL` env var)
- **Browsers**: Chromium, Firefox, WebKit
- **Retries**: 2 on CI, 0 locally
- **Reporters**: GitHub Actions reporter on CI, HTML locally
- **Screenshots**: On failure
- **Videos**: On failure
- **Traces**: On first retry

## CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

The CI workflow:
1. Installs dependencies
2. Builds the application
3. Runs E2E tests
4. Uploads test reports and results as artifacts

Cross-browser tests run on PRs to ensure compatibility.

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/your-page');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const button = page.locator('button:has-text("Click Me")');
    
    // Act
    await button.click();
    
    // Assert
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Best Practices

1. **Use data-testid attributes** for stable selectors
2. **Wait for elements** before interacting
3. **Use meaningful test names** that describe the behavior
4. **Group related tests** in describe blocks
5. **Clean up after tests** if needed
6. **Use page object models** for complex pages
7. **Avoid hard-coded waits** - use Playwright's auto-waiting
8. **Test user flows**, not implementation details

### Selectors Priority

1. `data-testid` attributes (most stable)
2. ARIA roles and labels
3. Text content
4. CSS selectors (least stable)

Example:
```typescript
// Best
await page.locator('[data-testid="submit-button"]').click();

// Good
await page.locator('button[aria-label="Submit form"]').click();

// Acceptable
await page.locator('button:has-text("Submit")').click();

// Avoid
await page.locator('.btn-primary.submit').click();
```

## Debugging Tests

### Visual Debugging

```bash
# Run with UI mode
pnpm run test:e2e:ui

# Run in headed mode
pnpm run test:e2e:headed

# Run in debug mode
pnpm run test:e2e:debug
```

### Trace Viewer

When tests fail on CI, download the trace artifacts and view them:

```bash
pnpm exec playwright show-trace trace.zip
```

### Screenshots and Videos

Failed tests automatically capture:
- Screenshots (in `test-results/`)
- Videos (in `test-results/`)
- Traces (in `test-results/`)

## Visual Regression Testing

Visual tests compare screenshots against baseline images:

```bash
# Update baseline images
pnpm exec playwright test --update-snapshots

# Run only visual tests
pnpm exec playwright test tests/visual.spec.ts
```

Baseline images are stored in `tests/__screenshots__/`.

## Accessibility Testing

Accessibility tests check for:
- Keyboard navigation
- Screen reader compatibility
- WCAG compliance
- Proper semantic HTML
- ARIA attributes

For comprehensive accessibility testing, consider integrating:
- `@axe-core/playwright` for automated checks
- Manual testing with screen readers

## Performance Testing

While not included in this suite, you can add performance tests:

```typescript
test('should load page quickly', async ({ page }) => {
  const start = Date.now();
  await page.goto('/');
  const loadTime = Date.now() - start;
  
  expect(loadTime).toBeLessThan(3000); // 3 seconds
});
```

## Troubleshooting

### Tests Timing Out

- Increase timeout in `playwright.config.ts`
- Check if the dev server is running
- Verify network connectivity

### Flaky Tests

- Add explicit waits for dynamic content
- Use `waitForLoadState('networkidle')`
- Increase retries for specific tests

### Browser Installation Issues

```bash
# Reinstall browsers
pnpm exec playwright install --force

# Install system dependencies
pnpm exec playwright install-deps
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Debugging Guide](https://playwright.dev/docs/debug)

## Contributing

When adding new features:
1. Write E2E tests for critical user flows
2. Add data-testid attributes to key elements
3. Update this README if adding new test categories
4. Ensure tests pass locally before pushing
5. Check CI results on your PR
