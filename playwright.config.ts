import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // run sequentially — tests depend on receipt state
  forbidOnly: true,
  retries: 1,
  workers: 1,
  reporter: [
    ["html", { outputFolder: "e2e/report", open: "never" }],
    ["json", { outputFile: "e2e/results.json" }],
    ["list"],
  ],
  timeout: 300_000, // 5 min per test — AI parsing can be slow + rate limit retries
  expect: { timeout: 30_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    { name: "setup", testMatch: /global-setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
