import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { test as setup } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { SEED } from "./fixtures";
import { ADMIN_STATE, PLAYER_STATE } from "../../playwright.config";

// Authenticate via the Supabase REST API from Node, then inject the session
// into the browser's localStorage directly. This dodges the TanStack Start
// SSR hydration race — going through the login form is unreliable because
// Playwright can click the submit button before React has attached its
// onSubmit handler, which falls back to a native form POST and reloads the
// page without ever talking to Supabase. The API route is also an order of
// magnitude faster.
//
// Storage state files live outside the watched workspace (see
// playwright.config.ts) so writing them during auth-setup doesn't trigger a
// Vite dev-server restart mid-suite.

// Auth setup has a longer budget than a normal test because the first load
// after the session is injected still has to warm the dev server for /home.
setup.describe.configure({ timeout: 90_000 });

function readSupabaseEnv() {
  const url =
    process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? process.env.TEST_SUPABASE_URL;
  const anonKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      [
        "Playwright auth setup needs a Supabase URL and anon/publishable key",
        "to run the API-based login. Set VITE_SUPABASE_URL and",
        "VITE_SUPABASE_PUBLISHABLE_KEY (or SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY)",
        "in .env.local so both the app and the tests talk to the same project.",
      ].join(" "),
    );
  }

  return { url, anonKey };
}

// Mirror @supabase/supabase-js's default storage key so the session we inject
// lines up with what the browser-side client will read on load.
function authStorageKey(url: string): string {
  try {
    const host = new URL(url).hostname;
    const projectRef = host.split(".")[0];
    return `sb-${projectRef}-auth-token`;
  } catch {
    throw new Error(`Could not parse Supabase URL "${url}"`);
  }
}

async function signInViaApi(email: string) {
  const { url, anonKey } = readSupabaseEnv();
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: SEED.password,
  });

  if (error) {
    throw new Error(
      `Supabase rejected sign-in for ${email}: ${error.message}. ` +
        `If this is the first test run, drop SKIP_SEED=1 so scripts/seed-dev.mjs ` +
        `provisions the test users first.`,
    );
  }
  if (!data.session) {
    throw new Error(`Supabase returned no session for ${email}`);
  }

  return { session: data.session, storageKey: authStorageKey(url) };
}

async function persistSession(
  page: import("@playwright/test").Page,
  session: import("@supabase/supabase-js").Session,
  storageKey: string,
  statePath: string,
) {
  // Navigate to the origin first so window.localStorage is scoped correctly,
  // then write the same JSON shape that supabase-js itself would persist.
  await page.goto("/login");
  await page.evaluate(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    { key: storageKey, value: session },
  );
  await mkdir(dirname(statePath), { recursive: true });
  await page.context().storageState({ path: statePath });
}

setup("authenticate admin", async ({ page }) => {
  const { session, storageKey } = await signInViaApi(SEED.admin.email);
  await persistSession(page, session, storageKey, ADMIN_STATE);
});

setup("authenticate player", async ({ page }) => {
  const { session, storageKey } = await signInViaApi(SEED.teamA.player.email);
  await persistSession(page, session, storageKey, PLAYER_STATE);
});
