import { defineConfig, devices } from "@playwright/test";

const port = 3210;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "off",
  },
  webServer: {
    command: `npm run dev -- --port ${port} --hostname 127.0.0.1`,
    url: `http://127.0.0.1:${port}/login`,
    timeout: 120_000,
    reuseExistingServer: false,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
