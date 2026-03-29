

## Findings: Rule Lifecycle Verification

### Issue 1: Settings rules don't reach the categorizer
Rules created via the "+" button in **Categorization & Rules** are saved to the `categorization_rules` table. But the `process-financial-file` edge function only reads from the `user_rules` table. **These rules are never evaluated by the categorizer.**

The `process-import` edge function does read `categorization_rules`, but `process-financial-file` (the main one) does not.

### Issue 2: Edit works but only for `categorization_rules`
When you edit a rule in Settings, `useCategorizationRules.updateRule` updates the `categorization_rules` table correctly. But since the categorizer doesn't read that table, the edit has no practical effect on future file processing.

### Issue 3: Delete works but same gap
Deleting a rule removes it from `categorization_rules`. Again, not read by the main categorizer.

### Issue 4: MonthReviewModal writes to BOTH tables (redundantly)
When creating a rule from the file preview, `MonthReviewModal` inserts into both `user_rules` AND `categorization_rules` (lines 420-458). This is redundant and can cause drift.

---

## Plan: Unify Rules on `user_rules` Table

### Approach
Make Settings rules also write to `user_rules` instead of (or in addition to) `categorization_rules`. This ensures all rules are evaluated by the categorizer.

### Changes

**1. Update `useCategorizationRules.tsx` — Write to `user_rules` table**
- `addRule`: Insert into `user_rules` with `source: 'manual'`, mapping `category_id` → category slug lookup, and storing the pattern/match_type. Also keep inserting into `categorization_rules` for backward compatibility.
- `updateRule`: Update the corresponding `user_rules` row (need to track the `user_rules` ID alongside the `categorization_rules` ID).
- `deleteRule`: When deleting from `categorization_rules`, also soft-delete (set `is_active = false`) or hard-delete the matching `user_rules` row.

**2. Alternative simpler approach — Make edge function also read `categorization_rules`**
- Add a second query in `process-financial-file/index.ts` to load `categorization_rules` and merge them into the rule evaluation pipeline (converting match types: `SMART`→`fuzzy`, `CONTAINS`→`contains`, etc.)
- This avoids changing any client code

**Recommended: Option 2** (less risk, fewer changes)

### Implementation details

**File: `supabase/functions/process-financial-file/index.ts`**
- After loading `user_rules`, also load `categorization_rules` for the user
- Convert each `categorization_rule` into the same shape as a `user_rule` (mapping `category_id` → slug via the categories lookup, `SMART`→`fuzzy`, etc.)
- Append them AFTER `user_rules` in the sorted array (so `user_rules` always win)
- The `applyUserRules` function already handles all match types

**File: `src/hooks/useCategorizationRules.tsx`**
- On `deleteRule`: also delete any matching `user_rules` row with same pattern (to clean up duplicates from MonthReviewModal dual-writes)

**File: `src/components/profile/MonthReviewModal.tsx`**
- Remove the redundant write to `categorization_rules` (lines 446-459) since the edge function will now read `user_rules` directly

### Files to modify
1. `supabase/functions/process-financial-file/index.ts` — also load + merge `categorization_rules`
2. `src/components/profile/MonthReviewModal.tsx` — remove dual-write to `categorization_rules`
3. `src/hooks/useCategorizationRules.tsx` — on delete, also clean up matching `user_rules` rows

