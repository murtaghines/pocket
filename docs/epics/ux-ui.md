# Epic: Cross-cutting UX / UI

## Main files
- .claude/rules/design-system.md (design system — source of truth, always loaded)
- src/components/ui/* (shadcn primitives)
- src/components/brand/* (AsteriskMark, Wordmark, Logo — never hand-assemble the logo)
- src/components/layout/* (DashboardSidebar, DataRail, DashboardLayout, MobileBottomNav, ThemeToggle)

## Current state
Design system documented and applied. This epic never "finishes": it's used for
cross-cutting visual-consistency reviews across the other modules.

## Decisions made
- The design system lives in `.claude/rules/design-system.md` (a rule with no `paths:`
  field, so it loads on every task), not inline in CLAUDE.md — keeps CLAUDE.md lean.

## Next step


---

## Changelog
- **2026-07-05 — Context-system audit.** Audited the 4-layer context system against the
  real code. Fixed: broken path in the `imports` skill (`uploads-imports.md` → `uploads.md`)
  and the same cross-refs in `categories`/`investments` epics; uploads rule + epic now
  point to `MyData.tsx` (real uploads hub) instead of `Profile.tsx`; `categorizer`
  re-described as a shared module, not an edge function. Translated all rules, epics and
  skills to English (CLAUDE.md was already English). Moved the design system out of
  CLAUDE.md into `.claude/rules/design-system.md` (CLAUDE.md now < 60 lines). Removed the
  `lovable-tagger` plugin from `vite.config.ts`/`package.json`; unified the dev port to
  8080 across `vite.config.ts` and `.claude/launch.json`. Added: `settings` epic + rule
  for `Profile.tsx`, a `Stop` lint hook in `.claude/settings.json`, and the
  `imports-reviewer` subagent. Confirmed `.claude/rules/` uses the native `paths:` field
  (not Cursor's `globs:`) — no format migration needed.
- **2026-07-05 — Codebase reorg + brand system.** Built `src/components/brand/`
  (`AsteriskMark`/`Wordmark`/`Logo`) as the single source of truth for Pocket's
  branding — no logo image files exist anymore anywhere in the repo (checksums showed
  the ~19 logo-related PNGs were mostly duplicate copies of 2-3 images under different
  names). Migrated all 8 hand-assembled `<img>+<span>` logo sites to the new components
  (`DataRail`, `DashboardSidebar`, `MonthReviewModal`, `Auth`, `LandingHeader`,
  `LandingFooter`, `CTASection`, `TransitionSection` — the last one now spins only the
  mark on scroll, a deliberate visual change, not the old full mark+wordmark lockup).
  Fixed real bugs found along the way: "© 2026 wallet" → "© 2026 pocket" copyright typo
  in `DashboardSidebar`, and a misleadingly-named `walletIconWhite` import in
  `MonthReviewModal` that actually loaded the blue icon and faked white via a CSS
  `invert` hack. Deleted 20 dead component files (`Header.tsx` turned out to be dead
  too — a prior automated sweep had a false positive from a `{/* Header */}` comment
  string collision) and 17 now-orphaned image assets — the whole project is down to 2
  image files (`favicon.png`, `pocket-icon.png`). Split `src/components/profile/` into
  `profile/` (account settings only) and a new `src/components/imports/` (the 6 live
  upload-flow components), matching what `.claude/rules/imports.md` already documented.
  Removed unused deps `react-hook-form`/`@hookform/resolvers`/`zod` (zero real usage —
  all forms use plain `useState`). Deep internal decomposition of the 3 giant files in
  `imports/` (`BankStatementsTabsView.tsx` 3082 lines, `MonthReviewModal.tsx` 2194 lines,
  `InvestmentTabsView.tsx` 1326 lines) was explicitly deferred — see `uploads.md` next
  step. Note: `MonthReviewModal`'s logo fix was verified by source-code reading + a
  clean module load (no syntax/build errors) but not with a live screenshot — the demo
  account's login appears to have hit Supabase's auth rate limit after repeated test
  logins in the same session; worth a quick manual check next session.
