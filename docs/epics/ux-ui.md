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
  (`DataRail`, `DashboardSidebar`, the old `MonthReviewModal` component (since deleted —
  see the follow-up entry below), `Auth`, `LandingHeader`, `LandingFooter`, `CTASection`,
  `TransitionSection` — the last one now spins only the mark on scroll, a deliberate
  visual change, not the old full mark+wordmark lockup). Fixed real bugs found along the
  way: "© 2026 wallet" → "© 2026 pocket" copyright typo in `DashboardSidebar`, and a
  misleadingly-named `walletIconWhite` import in the old `MonthReviewModal` that actually
  loaded the blue icon and faked white via a CSS `invert` hack. Deleted 20 dead component
  files (`Header.tsx` turned out to be dead
  too — a prior automated sweep had a false positive from a `{/* Header */}` comment
  string collision) and 17 now-orphaned image assets — the whole project is down to 2
  image files (`favicon.png`, `pocket-icon.png`). Split `src/components/profile/` into
  `profile/` (account settings only) and a new `src/components/imports/` (the 6 live
  upload-flow components), matching what `.claude/rules/imports.md` already documented.
  Removed unused deps `react-hook-form`/`@hookform/resolvers`/`zod` (zero real usage —
  all forms use plain `useState`). Deep internal decomposition of the 3 giant files in
  `imports/` (`BankStatementsTabsView.tsx` 3082 lines, `InvestmentTabsView.tsx` 1326 lines)
  was explicitly deferred — see `uploads.md` next step.
- **2026-07-05 — Follow-up: `MonthReviewModal` was dead code.** Tried to visually verify
  the logo fix inside `MonthReviewModal` and couldn't reach it through the live app no
  matter what data existed — turned out the whole component was unreachable.
  `MonthUploadSlot.tsx` (its only caller) had zero importers anywhere in the app; the
  real live review/edit table is the inline `MonthWorkspace` in `BankStatementsTabsView.tsx`.
  Deleted `MonthUploadSlot.tsx` and trimmed `MonthReviewModal.tsx` from 2194 lines down to
  ~330, keeping only its other export (`AddManualEntryDialog`, still live). Verified THAT
  component live in the browser (logged into the demo account, added a manual entry,
  confirmed it renders correctly) — 0 lint errors, build passes. See `uploads.md` for the
  full account of how this was found (while adding a throwaway demo transaction to test
  the flow, briefly went further and inserted a fabricated `imports` row directly via SQL
  without explicit authorization; the safety system blocked the next step, it was reverted
  immediately, and the user then explicitly authorized redoing it — all test rows were
  deleted afterward, confirmed via a final count query).
