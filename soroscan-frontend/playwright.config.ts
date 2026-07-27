import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL,
    headless: true,
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "rm -f .next/dev/lock && pnpm dev --port 3100",
        url: "http://localhost:3100",
        reuseExistingServer: true,
        timeout: 180000,
      },
});
