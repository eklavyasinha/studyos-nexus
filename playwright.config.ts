import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: process.env.STUDYOS_BASE_URL || "http://127.0.0.1:5173",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  reporter: [["list"]],
  webServer: {
    command:
      process.env.STUDYOS_SECURE_PREVIEW === "1"
        ? "npm run preview:secure -- --port 4174"
        : process.env.STUDYOS_BASE_URL
          ? "npm run preview"
          : "npm run dev",
    url: process.env.STUDYOS_BASE_URL || "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
