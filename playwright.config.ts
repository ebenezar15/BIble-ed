import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";

// Use a pre-installed Chromium when the bundled revision is not present (CI containers, offline machines).
const SYSTEM_CHROMIUM = "/opt/pw-browsers/chromium";
const executablePath = process.env.PW_CHROMIUM ?? (fs.existsSync(SYSTEM_CHROMIUM) ? SYSTEM_CHROMIUM : undefined);
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Pixel 7"],
    launchOptions: { executablePath },
  },
  // Serves the static build in out/ (run `npm run build` first) under the same base path as GitHub Pages.
  webServer: {
    command: `node scripts/serve.mjs ${PORT}`,
    url: `http://localhost:${PORT}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
