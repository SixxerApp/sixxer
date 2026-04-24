import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Runs the idempotent seed script once before the Playwright suite starts.
// The seed wipes and recreates "Sixxer Test CC" so every run lands in the
// same state regardless of what previous runs (or manual clicking) did.
//
// Assumes SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in the environment
// (loaded by playwright.config.ts from .env.local/.env before this runs).
// Point these at a NON-production Supabase project — the seed deletes test
// users with emails matching the Sixxer test pattern.
//
// When iterating on a test, reseeding is expensive (~15s). Export
// SKIP_SEED=1 to skip the seed and reuse whatever state is already in the
// database. Handy with the UI runner, where the seed otherwise runs on
// every open and blocks the test list from populating.
export default async function globalSetup() {
  if (process.env.SKIP_SEED === "1") {
    console.log("[playwright] SKIP_SEED=1 set — skipping seed-dev.mjs");
    return;
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const seedPath = resolve(here, "../../scripts/seed-dev.mjs");

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
    throw new Error(
      [
        "Playwright requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to run the seed.",
        "Set them in .env.local and make sure they point at a test project,",
        "not production. Or export SKIP_SEED=1 to reuse existing state.",
      ].join(" "),
    );
  }

  console.log("[playwright] running seed-dev.mjs…");
  const started = Date.now();
  const result = spawnSync("node", [seedPath], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`seed-dev.mjs exited with status ${result.status}`);
  }
  console.log(`[playwright] seed complete in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}
