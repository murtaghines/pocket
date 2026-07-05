# Epic: Cross-cutting UX / UI

## Main files
- .claude/rules/design-system.md (design system — source of truth, always loaded)
- src/components/ui/* (shadcn primitives)
- src/components/layout/* (AppSidebar, DashboardLayout, Header, MobileBottomNav, ThemeToggle)

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
