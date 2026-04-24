# Sixxer

Sixxer is a cricket team management app for clubs, teams, captains, and players.

It is designed to replace the usual mix of WhatsApp chats, scattered spreadsheets, missed RSVPs, and manual payment chasing with one place to run the day-to-day side of amateur cricket.

## What Sixxer is for

Running a cricket club usually means juggling the same problems every week:

- who is available for the next match
- who has not responded yet
- where the fixture is and when people need to arrive
- who has paid match fees and who still owes money
- how to share updates without losing them in group chat

Sixxer brings those workflows together into a single app.

## What you can do with it

### For clubs and admins

- create clubs and teams
- invite people into the right group
- create matches, training sessions, and other events
- track player availability and see who has not replied
- post updates for the team
- create payment requests and track who has paid

### For players

- join a club or team
- see upcoming fixtures and events across all their teams in one calendar view
- subscribe the personal calendar URL into Apple, Google, or Outlook Calendar
- RSVP as going, maybe, or unavailable
- view payment requests and mark them as paid
- read team updates and notifications

## Current product scope

The current app is focused on the core workflows for grassroots cricket:

- team and club structure
- fixtures and event management
- availability tracking
- payment tracking
- announcements and notifications

It is meant to be the operational hub for a club, not just a chat tool.

## Status

This repository is the active codebase for Sixxer. It started from a generated prototype, but it is now maintained directly as a normal app codebase.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

Required environment variables:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Optional mobile-app environment variables:

- `VITE_APP_URL`
- `VITE_NATIVE_AUTH_REDIRECT_URL`

Optional observability:

- `VITE_SENTRY_DSN` — when set, client-side errors are reported to Sentry. Leave blank to keep crash capture disabled.

Server-only secrets (never prefix with `VITE_`, never ship to the browser):

- `SUPABASE_SERVICE_ROLE_KEY` — needed by `scripts/seed-dev.mjs` and by the
  `/api/ical/:token` calendar-feed handler. Read from the Supabase project
  dashboard.

## Dev data

To populate your Supabase project with a disposable test club, two teams, an
admin, nine players, a recurring nets series, a match, and a payment request:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:dev
```

`SUPABASE_SERVICE_ROLE_KEY` must be the secret service-role key from your
Supabase project settings; it bypasses RLS so the script can provision users
and is required only for seeding. The script is idempotent — repeated runs
reset the same fixture data.

## End-to-end tests

Playwright smoke tests cover sign-in, the admin event-creation flow, player
RSVP, the payments loop, and the calendar tab. They rely on the seed above,
so point them at a **non-production** Supabase project.

One-time setup:

```bash
npx playwright install chromium
```

Then, with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and the usual
`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` vars in `.env.local`
(the publishable key is what the auth setup uses to sign in through the
Supabase REST API — it dodges the login form so tests stay stable against
SSR hydration timing):

```bash
npm run test:e2e            # headless run
npm run test:e2e:ui         # interactive runner
npm run test:e2e:report     # open the last HTML report
```

By default Playwright starts a **production** preview (`npm run build` and
the Nitro server) for stable, production-like runs. Set `PW_USE_DEV=1` to
target the Vite dev server instead (faster iteration, occasional chunk/HMR
flakes). To attach to a server you already started, use
`PW_REUSE_SERVER=1`. The seed runs once before the suite, wiping and
recreating `Sixxer Test CC`, so never aim this at production.

First run takes ~30–60s end-to-end (seed ~15s, Vite boot ~5s, two UI logins
to cache storage state). Subsequent runs reuse the saved storage state and
are much faster.

Useful flags:

- `SKIP_SEED=1 npm run test:e2e` — reuse existing DB state while iterating
  on a single test. In the UI runner this also lets the test list populate
  immediately instead of waiting on the seed.
- `npm run test:e2e -- --project=admin tests/e2e/home.admin.spec.ts` — run a
  single file against one role.
- `npm run test:e2e -- --headed --debug` — step through interactively when
  a spec is misbehaving.
- `npm run test:e2e:report` — after a failure, open the HTML report with
  trace, screenshots, and video for each failing test.

If the UI runner shows "Loading…" for a while on first open, that's the
seed running — it takes ~15s. Use `SKIP_SEED=1` to avoid it when you don't
need a clean slate.

## Contributor notes

- `src/routeTree.gen.ts` is generated by TanStack Router.
- `.env` must stay local and should never be committed.
- `npm run build` currently passes.
- `npm run lint` still reports a backlog of existing formatting issues in the repo.

## Mobile packaging

Sixxer now includes the initial Capacitor scaffolding for iOS and Android builds while keeping the web app as the primary product surface.

Useful commands:

```bash
npm run build:native
npm run cap:ios
npm run cap:android
```
