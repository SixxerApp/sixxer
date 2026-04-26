# Sixxer AI Context

This is the fast briefing for AI coding sessions. It is intentionally compact so
new agents can orient without re-reading the whole repository.

## Product in one paragraph

Sixxer is the match-week command center for amateur cricket clubs. It replaces
WhatsApp sprawl, spreadsheets, missed RSVPs, manual payment chasing, and
scattered calendar invites with one mobile-first app for captains, admins,
treasurers, and players.

## Current source of truth

- Canonical AI guide: `AGENTS.md`.
- Product vision: `docs/product/vision.md`.
- Live implementation tracker: Linear project `Sixxer Product Roadmap`.
- Linear roadmap index and original task seed: `docs/product/backlog.md`.
- Design system: `Design.md`.
- Human-facing project overview: `README.md`.

## Product principles agents should preserve

- Mobile-first and glanceable.
- Admin clarity over feature breadth.
- Cricket-specific language and workflows.
- One operational source of truth for match-week facts.
- Fast defaults instead of heavy configuration.
- Clear role boundaries.

## Design principles agents should preserve

- Dark athletic minimalist interface.
- Primary teal is for primary actions, positive availability, and key active
  states.
- Warm terracotta/coral accents are for specialized or negative statuses.
- Use Public Sans and compact, readable hierarchy.
- Prefer dense, operational screens over marketing-style sections.
- Keep controls thumb-friendly and direct.

## Linear workflow

Linear is the live source of truth for implementation status, issue ownership,
and current task scope. Repo product docs provide intent and context, not issue
state. When a session starts from a Linear issue:

- Use the Linear issue as the active scope.
- Cross-check `docs/product/backlog.md` only for the original task seed,
  acceptance criteria, or product intent.
- Do not silently include adjacent backlog items.
- If the issue is too broad, propose a smaller implementation slice.

When no Linear issue is provided:

- Use the user request as the active scope.
- Use `docs/product/vision.md` for intent and language.
- Use `docs/product/backlog.md` only when the request maps clearly to a backlog
  item.

## Common implementation patterns

- Routes are file-based under `src/routes`.
- Most data loading lives in feature hooks under `src/features`.
- Shared visual primitives come from `src/components/ui`.
- Shared app-level components live in `src/components`.
- Supabase browser/server clients are split under `src/integrations/supabase`.
- Database behavior belongs in migrations under `supabase/migrations`.

## Useful validation choices

- Docs-only or rule-only change: read the changed files and inspect `git diff`.
- UI or route behavior change: run `npm run build`; add focused manual or
  Playwright validation where practical.
- Supabase/data visibility change: validate admin and player behavior
  separately.
- E2E tests require a non-production Supabase project and seeded data.

## Known caution areas

- `src/routeTree.gen.ts` is generated.
- Lint can report unrelated formatting debt.
- Direct route loading states have been a known product gap.
- Admin versus player visibility is a trust-sensitive area.
- Payment and RSVP workflows are core product loops; avoid regressions.
