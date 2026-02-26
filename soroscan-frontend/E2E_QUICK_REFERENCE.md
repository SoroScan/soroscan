# E2E Testing Quick Reference

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install

# Run tests with UI (recommended)
pnpm run test:e2e:ui
```

## 📝 Common Commands

```bash
# Run all tests
pnpm run test:e2e

# Run with interactive UI
pnpm run test:e2e:ui

# Run with visible browser
pnpm run test:e2e:headed

# Debug tests
pnpm run test:e2e:debug

# Run specific browser
pnpm run test:e2e:chromium
pnpm run test:e2e:firefox
pnpm run test:e2e:webkit

# View test report
pnpm run test:e2e:report

# Run specific test file
pnpm exec playwright test tests/events.spec.ts

# Run tests matching pattern
pnpm exec playwright test --grep "should load"

# Update visual snapshots
pnpm exec playwright test --update-snapshots
```

## 📁 File Structure

```
soroscan-frontend/
├── tests/
│   ├── auth.spec.ts              # Authentication & navigation
│   ├── events.spec.ts            # Event Explorer
│   ├── contracts.spec.ts         # Contract Management
│   ├── webhooks.spec.ts          # Webhook Manager
│   ├── admin.spec.ts             # Admin Dashboard
│   ├── accessibility.spec.ts     # Accessibility checks
│   ├── visual.spec.ts            # Visual regression
│   ├── helpers.ts                # Helper functions
│   ├── fixtures.ts               # Test fixtures
│   └── README.md                 # Detailed docs
├── playwright.config.ts          # Playwright config
├── E2E_SETUP.md                 # Setup guide
├── TESTING.md                   # Testing guide
└── package.json                 # Test scripts
```

## 🧪 Test Coverage

### Critical Flows ✅
- Authentication & Navigation
- Event Explorer (filter, paginate, export)
- Contract Management (create, delete)
- Webhook Manager (create, test, delete)
- Admin Dashboard (metrics, stats)

### Browsers ✅
- Chromium (Chrome, Edge)
- Firefox
- WebKit (Safari)

### Accessibility ✅
- Keyboard navigation
- Screen reader support
- WCAG 2.1 compliance

### Visual Regression ✅
- Desktop, mobile, tablet
- Dark mode
- Component states

## 🔍 Debugging

```bash
# Run in debug mode
pnpm run test:e2e:debug

# View trace file
pnpm exec playwright show-trace trace.zip

# Run with verbose logging
DEBUG=pw:api pnpm run test:e2e

# Take screenshot
await page.screenshot({ path: 'debug.png' });
```

## 📊 CI/CD

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests

View results in GitHub Actions:
- Test reports
- Screenshots
- Videos
- Traces

## 💡 Writing Tests

### Basic Test
```typescript
import { test, expect } from '@playwright/test';

test('should do something', async ({ page }) => {
  await page.goto('/page');
  await page.click('button:has-text("Click")');
  await expect(page.locator('text=Success')).toBeVisible();
});
```

### Using Helpers
```typescript
import { waitForTableData, clickButton } from './helpers';

test('should load data', async ({ page }) => {
  await page.goto('/page');
  await waitForTableData(page, 1);
  await clickButton(page, 'Submit');
});
```

### Using Fixtures
```typescript
import { test, expect, mockData } from './fixtures';

test('should use fixture', async ({ page, mockContractId }) => {
  await page.goto(`/contracts/${mockContractId}`);
  // Test with mock data
});
```

## 🎯 Best Practices

1. Use `data-testid` for stable selectors
2. Wait for elements before interacting
3. Use meaningful test names
4. Group related tests with `describe`
5. Avoid hard-coded waits
6. Test user flows, not implementation

## 🔧 Troubleshooting

### Tests Failing
- Ensure backend is running
- Check BASE_URL in config
- Reinstall browsers: `pnpm exec playwright install --force`

### Tests Timing Out
- Increase timeout in playwright.config.ts
- Add explicit waits: `await page.waitForLoadState('networkidle')`

### Flaky Tests
- Use `waitForSelector` instead of `setTimeout`
- Add retries: `test.retries(2)`

## 📚 Documentation

- [E2E Setup Guide](./E2E_SETUP.md)
- [Testing Guide](./TESTING.md)
- [Test README](./tests/README.md)
- [Implementation Summary](./E2E_IMPLEMENTATION_SUMMARY.md)
- [Data-TestID Guide](./DATA_TESTID_RECOMMENDATIONS.md)

## 🎉 Success Criteria

✅ All test files pass
✅ Critical flows covered
✅ Cross-browser testing
✅ CI/CD integration
✅ Visual regression
✅ Accessibility checks

## 🚦 Next Steps

1. Run tests: `pnpm run test:e2e:ui`
2. Add data-testid attributes to components
3. Update tests to use data-testid selectors
4. Add tests for new features
5. Monitor CI results

## 📞 Resources

- [Playwright Docs](https://playwright.dev)
- [Playwright Discord](https://discord.gg/playwright)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)

---

**Ready to test?** Run `pnpm run test:e2e:ui` to get started! 🎉
