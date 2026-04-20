

## Plan: Warning System for Sign-Category Mismatches

### What this solves
When a transaction has a positive amount but is categorized as EXPENSE (or negative amount categorized as INCOME), the system currently silently overrides the movement in the frontend. Instead, we want to:
1. Show a visible warning banner in the Month Review modal when inconsistencies exist
2. Highlight the specific mismatched rows
3. Keep the current frontend fix (override to `other_income`/`other_expense`) but make it visible to the user

### Changes

#### 1. Add mismatch detection in `MonthReviewModal.tsx`
- After fetching transactions, compute a list of "mismatched" transaction IDs: positive amount + `movement=EXPENSE`, or negative amount + `movement=INCOME`
- Display a warning banner (amber/yellow) at the top of the modal when mismatches exist, e.g.: **"⚠ N transactions have sign-movement mismatches (positive amount marked as Expense or vice versa). Review highlighted rows."**
- Highlight mismatched rows with a subtle amber background (`bg-amber-50` / `border-l-2 border-amber-400`)
- Show a small warning icon (AlertTriangle) next to the movement badge on mismatched rows

#### 2. Auto-correct movement on mismatched rows
- When the modal opens and detects mismatches, pre-populate the `edits` state for those transactions: flip movement to match the sign, and reset category to `other_income` or `other_expense`
- The user sees these as "pending edits" (highlighted in the existing edit style) and can adjust the category before saving
- This makes the frontend fix from `useTransactions.tsx` into an actionable, user-visible correction

#### 3. Add mismatch warning in `UnifiedUploadsTable.tsx`
- After imports are loaded, cross-reference with transaction data to show a small amber badge next to the file row if that import contains mismatched transactions
- Add a tooltip: "This file contains N transactions with sign-category mismatches. Open Edit to review."

### Files to modify
- `src/components/profile/MonthReviewModal.tsx` — mismatch detection, warning banner, row highlighting, auto-edit pre-population
- `src/components/profile/UnifiedUploadsTable.tsx` — per-file mismatch badge indicator
- `src/hooks/useTransactions.tsx` — export mismatch count alongside existing data (minor addition to return object)

### Technical details
- Mismatch detection logic: `(amount > 0 && movement === 'EXPENSE') || (amount < 0 && movement === 'INCOME')`
- Category validation: if the assigned category belongs to the wrong movement group (e.g., "sports" is in `EXPENSE_CATEGORIES` but movement is flipped to INCOME), override to `other_income`/`other_expense`
- The warning does NOT auto-save; the user must click Save to persist corrections
- Existing `useTransactions.tsx` frontend override remains as a safety net for dashboard display

