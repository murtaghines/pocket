# Epic: Investments

## Main files
- src/pages/Investments.tsx
- src/components/investments/: InvestmentAccountsManager, InvestmentsByAssetType,
  InvestmentsByPlatform, InvestmentsHistory, InvestmentsTable
- src/components/imports/InvestmentTabsView.tsx + src/components/imports/investments/:
  InlineInvestmentsEditor, RowEditIndicator, RevertToOriginalButton, helpers, types,
  MonthWorkspace, MonthTabStrip, UploadedFiles, InvestmentPreviewDialog, ProcessingPanel
- Hooks: useInvestments, useMonthlyInvestmentUpload
- Edge function: process-investment-file (upload → AI parse → preview → confirm → persist)
- Shared: supabase/functions/_shared/fingerprint.ts (calculateInvestmentFingerprint)

## Current state (2026-07-08/11)

Brought to parity with the bank-statement pipeline (see docs/epics/uploads.md "Modelo de
integridad") — same real-data-vs-shaped-view model, adapted for investments' different data
shape (platform/asset_type/deposit-withdrawal instead of account/movement/category). Full
audit found the pipeline had real gaps; all fixed and verified live against the production DB
(`ertwmshiupmickhfbaue`) and the deployed edge function.

**P0 — confirming an investment upload never persisted anything.** The upload flow is two
calls: preview (`fileContent`, `previewOnly:true`, parses via AI, doesn't save) then confirm
(`previewOnly:false`). The confirm call sent no `fileContent` — but `process-investment-file`
required it unconditionally, so confirm always 400'd before reaching the AI or the insert.
Every real upload attempt failed at "Confirm & Save"; the 4 demo investment rows were seeded
directly via SQL because this path had never worked. Fixed by having the confirm call resend
the exact array the preview already returned (`investments: previewInvestments`) — the edge
function skips the AI entirely on that path and goes straight to dedup+insert, so what gets
saved is guaranteed to match what was previewed, with no second AI round-trip.

**P0 — auto-process-after-add silently no-op'd.** `InvestmentTabsView.tsx`'s
`handleFilesPicked` called `addFilesForMonth(files, monthDate)` then
`setTimeout(() => processFilesForMonth(monthDate), 50)`. The `setTimeout` callback closed
over the `processFilesForMonth` from the render *before* `addFilesForMonth`'s state update
committed, so it read a stale (pre-add) `pendingFilesByMonth`, found zero pending files, and
returned before any network call — no error, no toast, the file just sat there. Comment said
"mirrors bank flow" but the bank flow doesn't use this pattern at all (it opens an account-
picker dialog first, giving React a full render cycle before processing starts). Fixed by
having `addFilesForMonth` return the created entries and `processFilesForMonth` accept them
directly (`filesOverride`) instead of reading state back out of its own closure. Found live
while testing the P0 fix above — the preview dialog never even opened until this was fixed
too.

**Dedup was weaker than bank statements' — closed the gaps:**
- `transaction_hash` computed server-side only (`calculateInvestmentFingerprint`, SHA-256 of
  `platform|date|amount|normalizedDescription`; `type` deliberately excluded, mirroring how
  transactions excludes movement/category — a classification, not an immutable fact). Frozen
  at import, never recomputed on edit (no DB trigger exists; `InlineInvestmentsEditor`'s save
  never touches it). Enforced by a total unique index `(user_id, transaction_hash)` — this
  part was already fixed pre-session (`20260707190000_investments_strong_dedup.sql`).
- Insert was a plain `.insert()` — a single hash collision (e.g. a race between two uploads)
  would fail the *entire batch*, not just the colliding row. Changed to
  `.upsert(..., {onConflict:'user_id,transaction_hash', ignoreDuplicates:true})`, matching
  `process-import`'s transactions upsert. Verified live: re-submitting an already-saved pair
  reports "2 duplicates ignored", 0 errors.
- No file-level short-circuit — re-uploading the exact same file hit `imports`'
  `UNIQUE(user_id, file_hash_sha256)` as a raw Postgres error surfaced as a generic toast.
  Added the same client-side pre-check `useMonthlyFileUpload.tsx` already does: hash the file
  before upload, look up an existing `NORMALIZED` import with that hash, and show a clean
  "Duplicate file" message instead.
- No durable raw staging — `investments.original_text` existed but was always written `null`;
  nothing survived past the AI call for later audit/reprocessing. Now writes each parsed row
  to `import_rows` (`raw_json`, `row_hash_sha256`), same table bank statements already use
  (`investments.upload_id` → `imports(id)`, shared header table). Verified live: `import_rows`
  populated correctly for a real upload.

**No soft-hide, no audit trail, real hard-delete exposed in the UI.** `investments` had no
`is_hidden` column at all — the only way to remove a row from view was a hard DELETE (trash
icon + confirm dialog in `InlineInvestmentsEditor`), with zero audit record and the same
re-import-resurrects-it risk that `transactions`' hard-delete was removed for. `log_audit_event`
didn't even accept `entity_type='investment'` — calling it would raise `invalid entity_type`.
Fixed:
- Migration `20260708125714_investments_soft_hide_and_audit_parity.sql`: added
  `investments.is_hidden` (mirrors `transactions`, same partial index), and extended
  `log_audit_event`'s allow-list + ownership check to `'investment'`.
- `InlineInvestmentsEditor.tsx`: removed the hard-delete entirely; hide/show is now the only
  way to exclude a row, immediate + audited (mirrors `handleToggleHidden` on transactions).
  Every tracked-field edit (`platform, asset_type, description, amount, date, type,
  is_hidden` — see `investments/helpers.tsx` `USER_TRACKED_FIELDS`) now logs a before/after
  diff via `log_audit_event`.
- New `investments/RowEditIndicator.tsx` + `RevertToOriginalButton.tsx` + `helpers.tsx`
  (`buildOriginalSnapshot`, `isBackToOriginal`, `formatAuditValue`) — deliberately **not**
  imported from `cashflow/`, kept as investments' own copies per the existing module-boundary
  decision (no cross-imports between the two import pipelines). Same UX as transactions: blue
  dot + popover history, per-change Undo, "Restore original" for the whole row.
- `useInvestments.tsx` (the dashboard-facing hook) now filters `.eq('is_hidden', false)` at
  the query level — every derived aggregate (this-month/all-time totals, by-platform,
  by-asset-type, monthly history) automatically excludes hidden rows, same pattern as
  `useTransactions.tsx`.

**Verified live end-to-end** (real upload through the deployed edge function, real REST calls
against the demo account, cleaned up after):
1. Uploaded a real CSV → preview showed 2 correctly-detected investment rows (3rd row,
   a grocery purchase, correctly excluded) → clicked Confirm & Save → import reached
   `NORMALIZED`, both rows persisted with correct hashes, `is_hidden:false`, and
   `import_rows` populated.
2. Re-submitted the same 2 rows → `duplicatesIgnored: 2`, `newInvestments: 0`, no error.
3. Hid a row → `audit_log` got an `edit` entry (`is_hidden: false→true`) → dashboard-style
   query (`is_hidden=false`) count dropped by 1.
4. Reverted it (`action:'revert'`, `is_hidden: true→false`) → row visible again, full
   before/after trail intact in `audit_log`.
5. `npm test` — 70/70 passing, including `tests/integrity-invariants.test.ts` extended to
   cover `investments.transaction_hash` (no UPDATE trigger, no `.update()` payload ever
   includes it) alongside `transactions.fingerprint`.

Not live-tested (browser tooling was unavailable for the last leg of this session): the
client-side duplicate-file short-circuit's UI toast. Logic mirrors the already-proven bank
flow exactly and passed typecheck; low risk, but flagging since it wasn't clicked through.

## Decisions made
- Investments keeps its own `RowEditIndicator`/`RevertToOriginalButton`/`helpers.tsx` rather
  than importing from `cashflow/` — the two import pipelines are deliberately independent
  (see `.claude/rules/investments.md`, docs/epics/uploads.md "module boundary"). The tracked
  fields differ enough (platform/asset_type/date/type vs movement/category) that sharing
  would mean threading investment-shaped data through cashflow-specific formatting anyway.
- No manual-entry ("Add entry") flow exists for investments — only file upload. If one is
  ever added, mint a synthetic unique hash like `ManualEntryFooter.tsx` does for transactions
  (`manual-${user}-${ts}-${rand}`) to satisfy the `NOT NULL UNIQUE(user_id, transaction_hash)`
  constraint without colliding with imported rows.

## Next step
- None open from this pass. If gaps resurface, start from `useInvestments.tsx` (dashboard
  read) and `InlineInvestmentsEditor.tsx` (edit/hide/audit) — both now mirror
  `useTransactions.tsx` / `InlineTransactionsEditor.tsx` closely enough to diff against.
