---
description: Work on the imports pipeline (parsing + categorization) with extra safety checks
allowed-tools: Read, Edit, Write, Bash, Grep, Glob
---

## Epic state
!`cat docs/epics/uploads.md 2>/dev/null || echo "docs/epics/uploads.md not found"`

## Full pipeline
excelParser.ts (Excel) / pdfjs-dist (PDF) → process-import / process-financial-file /
process-investment-file → categorizer (shared module in
supabase/functions/_shared/categorizer.ts, uses rules from useCategorizationRules)

## Before touching any part of the pipeline
1. There are no automated tests on parsing — if you don't have a real sample file from
   the affected bank, ask me for one before changing anything
2. A change in the parser can silently break other already-supported bank formats —
   verify with at least 2 examples from different banks if you touch excelParser.ts
3. Changes to automatic categorization affect apply-rules-retroactive and
   fix-categorization — review those two before calling a rules change done
4. Changes to an edge function's data shape: verify that MonthReviewModal and
   MonthUploadSlot still consume the correct shape

## When done
Update docs/epics/uploads.md with what was done, decisions, and what's left.
