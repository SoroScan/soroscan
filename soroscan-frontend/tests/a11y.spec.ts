import type { Page } from "@playwright/test";
import { test, expect, installGraphqlMocks } from "./helpers/fixtures";
import AxeBuilder from "@axe-core/playwright";

const PUBLIC_PAGES = [
  "/",
  "/login",
  "/features",
  "/docs",
  "/developer-portal",
  "/webhooks/testing",
  "/developer/api-explorer",
  "/search/advanced",
];

const AUTHENTICATED_PAGES = [
  "/dashboard",
  "/contracts",
  "/webhooks",
  "/settings",
  "/admin",
  "/live",
];

async function gotoWithRetry(page: Page, path: string) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: "commit", timeout: 60000 });
      await page.waitForSelector("#main-content", { timeout: 60000 });
      return;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }
    }
  }
}

async function scanForSeriousViolations(page: Page, path: string) {
  await gotoWithRetry(page, path);

  const accessibilityScanResults = await new AxeBuilder({ page })
    .include("#main-content")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  // Only serious/critical violations block the smoke check. Lower-impact
  // findings are tracked separately so they do not make the scan flaky.
  const seriousOrCritical = accessibilityScanResults.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );

  expect(seriousOrCritical).toEqual([]);
}

test.describe("WCAG smoke checks", () => {
  test.setTimeout(180000);

  for (const path of PUBLIC_PAGES) {
    test(`has no serious or critical axe violations on ${path}`, async ({ page }) => {
      // GraphQL mocks keep scans deterministic and independent of a backend.
      await installGraphqlMocks(page);
      await scanForSeriousViolations(page, path);
    });
  }

  for (const path of AUTHENTICATED_PAGES) {
    test(`has no serious or critical axe violations on ${path}`, async ({ authenticatedPage }) => {
      // The fixture seeds a session and installs the GraphQL mocks so these
      // pages render real content instead of the auth-loading placeholder.
      await scanForSeriousViolations(authenticatedPage, path);
    });
  }
});
