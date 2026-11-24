import { defineConfig, devices } from "@playwright/test";

const PORT = 4331;
// Effects and the WebGL world are tuned and measured in Chromium. The other
// engines prove that the site itself works and stays accessible.
const CROSS_BROWSER = /(site|a11y)\.spec\.ts/;
const PHONE_MOTION = /mobile-motion\.spec\.ts/;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: true,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
  },
  projects: [
    {
      name: "chromium",
      testIgnore: PHONE_MOTION,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-webkit",
      testMatch: PHONE_MOTION,
      use: { ...devices["iPhone 14"] },
    },
    {
      name: "mobile-chromium",
      testMatch: PHONE_MOTION,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "firefox",
      testMatch: CROSS_BROWSER,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      testMatch: CROSS_BROWSER,
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command: `node scripts/serve-dist.ts ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
  },
});
