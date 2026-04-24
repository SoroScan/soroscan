# E2E Testing Setup Guide

Quick start guide for setting up and running E2E tests with Playwright.

## Prerequisites

- Node.js 20+
- pnpm 8+
- SoroScan backend running (for integration tests)

## Installation

### 1. Install Dependencies

```bash
cd soroscan-frontend
pnpm install
```

### 2. Install Playwright Browsers

```bash
pnpm exec playwright install
```

This will download Chromium, Firefox, and WebKit browsers.

### 3. Install System Dependencies (Linux only)

```bash
pnpm exec playwright install-deps
```

## Quick Start

### Run All Tests

```bash
pnpm run test:e2e
```

### Run Tests in UI Mode (Recommended for Development)

```bash
pnpm run test:e2e:ui
```

This opens an interactive UI where you can:
- See all tests
- Run individual tests
- Watch tests run in real-time
- Debug failures
- View traces

### Run Tests in Headed Mode

```bash
pnpm run test:e2e:headed
```

This runs tests with the browser visible.

## Test Structure

```
tests/
├── auth.spec.ts           # Authentication flows
├── events.spec.ts         # Event Explorer
├── contracts.spec.ts      # Contract Management
├── webhooks.spec.ts       # Webhook Manager
├── admin.spec.ts          # Admin Dashboard
├── accessibility.spec.ts  # Accessibility checks
├── visual.spec.ts         # Visual regression
├── helpers.ts             # Helper functions
├── fixtures.ts            # Test fixtures
└── README.md             # Detailed documentation
```

## Running Specific Tests

### By File

```bash
pnpm exec playwright test tests/events.spec.ts
```

### By Test Name

```bash
pnpm exec playwright test --grep "should load events"
```

### By Browser

```bash
pnpm run test:e2e:chromium
pnpm run test:e2e:firefox
pnpm run test:e2e:webkit
```

## Debugging Tests

### Debug Mode

```bash
pnpm run test:e2e:debug
```

This opens the Playwright Inspector where you can:
- Step through tests
- Inspect elements
- View console logs
- Edit selectors

### View Test Report

```bash
pnpm run test:e2e:report
```

This opens an HTML report with:
- Test results
- Screenshots
- Videos
- Traces

## Configuration

### Environment Variables

Create `.env.local`:

```env
BASE_URL=http://localhost:3000
NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:8000/graphql
```

### Playwright Config

Edit `playwright.config.ts` to customize:
- Base URL
- Timeout values
- Browser settings
- Screenshot/video options
- Retry logic

## Common Commands

```bash
# Run all tests
pnpm run test:e2e

# Run with UI
pnpm run test:e2e:ui

# Run in headed mode
pnpm run test:e2e:headed

# Debug tests
pnpm run test:e2e:debug

# Run specific browser
pnpm run test:e2e:chromium

# View report
pnpm run test:e2e:report

# Update snapshots
pnpm exec playwright test --update-snapshots
```

## Writing Your First Test

Create a new file in `tests/`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    // Navigate to page
    await page.goto('/my-page');
    
    // Interact with elements
    await page.click('button:has-text("Click Me")');
    
    // Assert results
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

Run your test:

```bash
pnpm exec playwright test tests/my-feature.spec.ts
```

## Best Practices

1. **Use data-testid attributes** for stable selectors
2. **Wait for elements** before interacting
3. **Use meaningful test names**
4. **Group related tests** with describe blocks
5. **Avoid hard-coded waits** - use Playwright's auto-waiting

## Troubleshooting

### Tests Failing Locally

1. Ensure backend is running
2. Check BASE_URL in config
3. Clear browser cache: `rm -rf ~/.cache/ms-playwright`
4. Reinstall browsers: `pnpm exec playwright install --force`

### Tests Timing Out

1. Increase timeout in `playwright.config.ts`
2. Check network connectivity
3. Verify backend is responding

### Flaky Tests

1. Add explicit waits: `await page.waitForLoadState('networkidle')`
2. Use `waitForSelector` instead of `setTimeout`
3. Increase retries for specific tests

## CI/CD

Tests run automatically on:
- Push to main/develop
- Pull requests

View results in GitHub Actions:
1. Go to Actions tab
2. Click on workflow run
3. Download artifacts for reports

## Next Steps

1. Read the [detailed testing guide](./tests/README.md)
2. Review [existing tests](./tests/) for examples
3. Check [Playwright documentation](https://playwright.dev)
4. Add tests for your features

## Getting Help

- [Playwright Discord](https://discord.gg/playwright)
- [Playwright GitHub](https://github.com/microsoft/playwright)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/playwright)

## Checklist

- [ ] Dependencies installed
- [ ] Playwright browsers installed
- [ ] Backend running (if needed)
- [ ] Environment variables configured
- [ ] Tests run successfully
- [ ] Test report viewed
- [ ] UI mode explored

You're ready to start testing! 🎉
