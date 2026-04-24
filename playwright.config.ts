import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

// Load .env.local (developer overrides) first, then .env (committed defaults)
// so tests always resolve the same env vars the dev server does.
loadEnv({ path: ".env.local" });
loadEnv();

// Storage state files live outside the tests directory so writing them during
// auth-setup never triggers the Vite watcher (historically this caused the
// dev server to restart mid-run).
const AUTH_DIR = resolve(process.cwd(), "node_modules/.cache/sixxer-e2e-auth");
export const ADMIN_STATE = resolve(AUTH_DIR, "admin.json");
export const PLAYER_STATE = resolve(AUTH_DIR, "player.json");

// Default to port 3000 (Nitro preview default / TanStack Start dev default).
// Override with PLAYWRIGHT_PORT / PLAYWRIGHT_BASE_URL when targeting a
// different host, e.g. a deployed preview environment.
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

// Tests run against the *production* build by default: `npm run build` +
// `node .output/server/index.mjs`. The Vite/TanStack Start dev server has
// well-known chunk-404 races under Playwright (`?tsr-split=component` chunks
// temporarily disappear from the module graph during client-side navigation,
// leaving detail pages rendered as a blank body). The preview build has no
// HMR and no lazy chunk regeneration, so it's dramatically more reliable and
// also much closer to what real users hit.
//
// Set PW_USE_DEV=1 to run against the dev server instead — useful when
// iterating on tests with `test:e2e:ui`, at the cost of occasional flakes.
const USE_DEV = process.env.PW_USE_DEV === "1";
const webServerCommand = USE_DEV
  ? "npm run dev"
  : `npm run build && PORT=${PORT} node .output/server/index.mjs`;

export default defineConfig({
  testDir: "./tests/e2e",
  // Single-tenant seed data — parallel tests would stomp on each other's
  // RSVPs and payment assignments. Keep it serial for correctness.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "admin",
      testMatch: /.*\.admin\.spec\.ts$/,
      dependencies: ["auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: ADMIN_STATE,
      },
    },
    {
      name: "player",
      testMatch: /.*\.player\.spec\.ts$/,
      dependencies: ["auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: PLAYER_STATE,
      },
    },
  ],
  webServer: {
    command: webServerCommand,
    url: BASE_URL,
    // Prod build takes ~30s; dev boot is ~15s. Give both plenty of headroom.
    timeout: 180_000,
    // Reuse an already-running server only when explicitly requested
    // (PW_REUSE_SERVER=1). Reusing a stale process is the most common
    // source of confusing failures when someone forgets it's still running.
    reuseExistingServer: process.env.PW_REUSE_SERVER === "1",
    stdout: "pipe",
    stderr: "pipe",
  },
});
