

## Plan: Defer saves to Confirm + Auto-create categorization rules

### Problem
1. Currently, changing movement/category in the MonthReviewModal immediately saves to the database via `updateTransaction.mutate()`. Changes persist even without clicking Confirm.
2. There's no learning mechanism — when a user manually re-categorizes a transaction, that knowledge isn't stored as a rule for future automatic categorization.

### Solution

#### 1. Defer all saves until Confirm
- **Remove** the `updateTransaction.mutate()` calls from `handleMovementChange` and `handleCategoryChange`. These handlers should only update the local `edits` state.
- **Move** the batch save logic into `handleConfirm`:
  - Iterate over all entries in `edits`, build update payloads, and execute them (can use `Promise.all` for parallel updates).
  - Mark saved transactions with `categorized_by: 'user'` and `category_source: 'MANUAL'`.
- **Cancel discards edits**: When the user clicks Cancel or closes the dialog, clear `edits` state — no DB writes happen.
- Show a visual indicator (e.g., the existing `summary.edited` badge + row highlight) so users know which rows have pending changes.

#### 2. Auto-create categorization rules on Confirm
For each edited transaction in the `edits` map, after successfully saving:
- Extract the transaction's `description_norm` (or `description` as fallback) as the pattern.
- Insert a new row into `categorization_rules` with:
  - `user_id`, `domain: 'CASHFLOW'`
  - `pattern`: the normalized description
  - `match_type: 'contains'`
  - `match_field: 'description'`
  - `category_id`: the new category's UUID
  - `priority`: timestamp-based (e.g., `Date.now()` modulo a safe int) so newer rules always have higher priority than older ones for the same pattern.
- This leverages the existing `categorization_rules` table and the categorizer's rule-matching logic in `process-import`, which already checks user rules first (`user_rule` source).
- The existing Settings > Categories UI already displays and allows deletion of these rules — no changes needed there.

#### 3. Priority handling for conflicting rules
- Use `priority: Math.floor(Date.now() / 1000)` so each new rule naturally has a higher priority than previous ones.
- The categorizer in `process-import` already orders by `priority DESC`, so the most recent rule wins.
- If a user later deletes a rule from Settings, the next-highest-priority rule (or default categorization) takes over.

### Files to modify
- **`src/components/profile/MonthReviewModal.tsx`**: Refactor `handleMovementChange`/`handleCategoryChange` to be local-only; move DB writes + rule creation into `handleConfirm`.

### Technical details

```text
User changes dropdown → local edits state only (no DB call)
User clicks Cancel    → edits cleared, dialog closes
User clicks Confirm   → for each edit:
  1. UPDATE transactions SET movement, category, category_id, 
     categorized_by='user', category_source='MANUAL'
  2. INSERT INTO categorization_rules (user_id, domain, pattern, 
     match_type, match_field, category_id, priority)
     VALUES (uid, 'CASHFLOW', description_norm, 'contains', 
     'description', new_category_id, unix_timestamp)
```

