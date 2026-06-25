import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,js}"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/__mocks__/**",
        "src/**/index.ts", // barrel files
        "dist/**",
        "node_modules/**",
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
      all: true,
    },
  },
});