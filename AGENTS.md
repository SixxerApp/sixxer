# AGENTS.md

This is the canonical AI contributor guide for this repository.

## Project summary

- Product: Sixxer
- Domain: cricket team management
- Stack: TanStack Start, React, Tailwind CSS, shadcn/ui, Supabase
- Deployment target: Cloudflare-compatible runtime

## Working rules

- Keep changes small and task-focused.
- Do not hand-edit `src/routeTree.gen.ts`.
- Do not commit `.env` or secrets.
- Prefer existing patterns over introducing new abstractions.
- Avoid broad formatting-only churn unless the task is explicitly formatting cleanup.

## Useful commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm run format
```

## Important files

- `src/routes`
- `src/router.tsx`
- `src/routes/__root.tsx`
- `src/lib/auth.tsx`
- `src/lib/theme.tsx`
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/client.server.ts`
- `src/integrations/supabase/auth-middleware.ts`
- `supabase/migrations`

## Validation

- Prefer `npm run build` after meaningful changes.
- Treat `npm run lint` as noisy for now because the repo already contains pre-existing formatting debt.
