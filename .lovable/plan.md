

## Multi-Month File Upload — Smart Distribution

### The problem today

When a user uploads a file containing transactions from **multiple months** (e.g. Jan + Feb + Mar in one PDF), the current pipeline:

1. Forces the user to pick a target month before uploading.
2. Sends every row to the edge function tagged with that single month.
3. The function **discards** any transaction whose date doesn't match the target month (`stats.outsideMonthSkipped++` at line 1105).
4. Only auto-redirects when **100%** of rows belong to a single different month.

Result: a Jan+Feb+Mar file uploaded "into March" silently loses ~⅔ of the transactions.

### The proposed change

**Yes, it makes sense and is not complex.** The dedup logic is already date-based per fingerprint, and we already have a `periods` table keyed by `month_key`. We just need to stop filtering and start distributing.

#### 1. Global "Add File" button (UX)

- Move the upload trigger out of the per-month tab strip into a single, prominent **"Add bank statement"** button at the top-right of the Bank Statements view (next to Export).
- Remove the requirement to click a specific month tab before uploading.
- The Account selector dialog stays as-is (account is required, month is auto-detected).
- Keep an optional per-tab "+" affordance for users who *want* to force a month (advanced).

#### 2. Multi-month distribution (backend)

Refactor `supabase/functions/process-import/index.ts`:

- Make `targetMonth` **optional** ("auto") in the request payload.
- After AI extraction, group transactions by their actual `posted_date` month (`extractMonthKey`).
- For each detected month:
  - Auto-create the `period` row if missing (`status: OPEN`).
  - Reject the group if the period is `CLOSED` (return that month in a `skippedMonths[]` array, don't fail the whole upload).
  - Run the existing duplicate fingerprint check **scoped to that month**.
  - Insert surviving transactions with the correct `period_id`.
- Return enriched stats:
  ```json
  {
    "monthsDistribution": {
      "2025-01": { "new": 42, "duplicates": 3 },
      "2025-02": { "new": 51, "duplicates": 0 },
      "2025-03": { "new": 38, "duplicates": 1 }
    },
    "skippedMonths": []
  }
  ```

#### 3. Single-month uploads stay backward-compatible

When the user *does* click "Add file" inside a specific month tab, we keep current behaviour: pre-fill `targetMonth` and warn (toast) if the file contains other months — offering "Distribute anyway" or "Keep only this month".

#### 4. Frontend feedback

After processing, show a single toast:
> "Santander_Q1.pdf: 131 new transactions distributed across January (42), February (51), March (38). 4 duplicates ignored."

Invalidate `transactions`, `imports`, and `periods` queries so all affected month tabs refresh at once.

#### 5. Imports table

The `imports` row stores the **earliest** detected month as `period_id` (for the file list display) but the actual transactions are correctly distributed. The file chip in the footer shows "spans 3 months" badge when applicable.

### Files to modify

- `supabase/functions/process-import/index.ts` — distribution logic, optional targetMonth, multi-period handling
- `src/hooks/useMonthlyFileUpload.tsx` — new `addFile(file, accountId, targetMonth?)` overload, updated toast messages
- `src/components/profile/BankStatementsTabsView.tsx` — add global "Add bank statement" button, keep per-tab "+" as advanced
- `src/components/profile/AccountSelectDialog.tsx` — drop month label since it's auto-detected in global mode

### Why this is safe

- Fingerprints already include date → no risk of cross-month duplicates.
- Periods already exist per `(user, month, domain)` → just need to upsert per detected month.
- `imports` table doesn't have a hard FK to a single period, so multi-month spread is fine.

### Edge cases handled

- File with **one** month → behaves identically to today.
- File with **closed** periods mixed in → those months are skipped with a clear message, open months still process.
- File with dates from a **future** month → still distributed (period auto-created), user can review.
- Duplicate detection still works per-month, so re-uploading the same Q1 file is idempotent.

