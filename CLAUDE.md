# Pocket — Project context

## Stack
Vite + React + TypeScript + shadcn/ui + Tailwind + Supabase + TanStack Query + react-router-dom + i18next.

Commands:
- `npm run dev` — local dev server (port 8080)
- `npm run lint` — run before considering any task done
- `npm run build` — production build

## Folder structure
- `src/pages/` — one page per route: `Index` (=Dashboard, `/dashboard`), `History`,
  `Investments`, `Planning`, `Account` (user hub at `/account`), `MyData` (uploads hub),
  `Categories`, `Auth`, `Landing`, `ComingSoon`, `NotFound`. Routes in `App.tsx`. `/profile`
  redirects to `/account`.
- `src/components/{dashboard,investments,landing,layout,onboarding,settings}/` — components grouped by module
- `src/components/account/` — account hub tabs: `AccountHeader`, `AccountOverviewTab`,
  `AccountBankAccountsTab`, `AccountPreferencesTab`, `AccountSecurityTab`.
  `src/components/profile/` keeps `DeleteAccountDialog` (used by Security tab).
  Uploads live in `src/components/imports/`, not here.
- `src/components/imports/` — the uploads/imports pipeline UI (bank statements,
  investment files, month review, categorization rules)
- `src/components/brand/` — `AsteriskMark`/`Wordmark`/`Logo`, the single source of truth
  for Pocket's branding. Never hand-assemble the logo elsewhere (see design-system rule).
- `src/components/ui/` — shadcn primitives; don't modify base logic, only styles via tokens
- `src/hooks/` — ALL data logic lives here (one hook per entity: `useTransactions`,
  `useAccounts`, `useCategories`, `useImports`, `useInvestments`…). Components never fetch directly.
- `src/integrations/supabase/` — client and generated `types.ts`
- `src/lib/` — pure utilities (`excelParser`, `currencies`, `categoryTranslations`…)
- `src/i18n/locales/{en,es}/` — namespaces: account, auth, categories, common, dashboard, investments, profile, settings
- `supabase/functions/` — edge functions, kebab-case, one folder per function; shared logic in `_shared/`
- `supabase/migrations/` — SQL migrations

## Global conventions
- Forms: plain `useState` + manual validation (no form library in use)
- Data: TanStack Query on top of the custom hooks — no direct fetch/axios in components
- Never hardcode UI strings — always use `useTranslation()` with the right namespace,
  and **update both `en` and `es` in the same change**, never leave one out of date
- Design tokens, never hex — see the design-system rule for the full visual spec

## Context system (how the docs here work)
This repo splits work into per-module conversations. Context is layered so you don't
re-explain things each session:
- **`CLAUDE.md`** (this file) — always-loaded project overview
- **`.claude/rules/*.md`** — module rules; those with a `paths:` frontmatter auto-load
  when you touch matching files. `design-system.md` has no `paths:`, so it loads always.
  (Note: the field is `paths:`, the native Claude Code convention — not Cursor's `globs:`.)
- **`docs/epics/*.md`** — one state file per module (what's done, decisions, next step).
  Resume one with the `/epic <name>` skill; `/imports` adds extra pipeline safety checks.
- **`.claude/agents/`** — subagents (e.g. `imports-reviewer` for the parsing pipeline)
