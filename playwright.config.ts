import { defineConfig, devices } from "@playwright/test";

const databaseUrl = process.env.E2E_DATABASE_URL;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 180000, // 180 seconds for complex multi-step tests
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
    actionTimeout: 10000, // 10 seconds per action
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: databaseUrl
    ? {
        command: "npm run dev",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
        env: {
          DATABASE_URL: databaseUrl,
          JWT_SECRET: "e2e-test-jwt-secret-that-is-never-used-in-production",
          CRON_SECRET: "e2e-test-cron-secret-that-is-never-used-in-production",
          NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
        },
      }
    : undefined,
});
