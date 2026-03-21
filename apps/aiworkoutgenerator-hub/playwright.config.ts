import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for AI Workout Generator hub smoke tests.
 * Default base URL: production (app.aiworkoutgenerator.com).
 * For local: PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL:
      process.env.PLAYWRIGHT_BASE_URL || "https://app.aiworkoutgenerator.com",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  timeout: 45_000,
});
