import { defineConfig, devices } from "@playwright/test"
import path from "path"

/**
 * Playwright config for tests/e2e/ test suite.
 *
 * Run with: npx playwright test --config=tests/e2e/playwright.config.ts
 *
 * Uses the same auth state as the main e2e/ suite (e2e/.auth/user.json).
 * Make sure to run the global setup first if auth state doesn't exist:
 *   npx playwright test --config=playwright.config.ts --grep="authenticate"
 */
export default defineConfig({
  testDir: ".",
  fullyParallel: false, // sequential — some tests depend on created data
  forbidOnly: true,
  retries: 1,
  workers: 1,
  reporter: [
    ["html", { outputFolder: path.join(__dirname, "report"), open: "never" }],
    ["json", { outputFile: path.join(__dirname, "results.json") }],
    ["list"],
  ],
  timeout: 300_000, // 5 min per test
  expect: { timeout: 30_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    // Reuse auth from main e2e/ global setup
    storageState: path.join(__dirname, "../../e2e/.auth/user.json"),
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
    cwd: path.join(__dirname, "../.."),
  },
})
