

## Plan: Integrate User Rules into Edge Function

### Summary
Load user rules from `user_rules` table before AI categorization runs. For each transaction, check user rules first — if matched, skip the AI's category entirely. After processing, update `applied_count` and `last_applied_at` for fired rules.

### Changes to `supabase/functions/process-financial-file/index.ts`

**1. Add `applyUserRules` function (after `containsUserName`, ~line 183)**
- Normalizes description (uppercase, strip accents, collapse special chars)
- Iterates rules in order (user_correction first, newest first)
- Supports all match types: fuzzy, contains, starts_with, exact, regex
- Returns `{ movement, category, confidence, ruleId }` or `null`

**2. Load user rules after profile fetch (~line 208)**
- Query `user_rules` where `user_id = userId`, `is_active = true`
- Order by `source DESC` (user_correction > manual), then `created_at DESC` (newest first)
- Store as `userRules` array, also create a `ruleHitCounts` map to track which rules fired

**3. Apply user rules in the transaction processing loop (~line 457)**
- Before `normalizeMovement` / `validateCategory`, call `applyUserRules(description, userRules)`
- If a rule matches: use its movement + category, set `rule_id_applied` on the transaction, skip self-transfer detection and AI category validation
- If no rule matches: proceed with existing AI categorization logic as-is
- Track hits in `ruleHitCounts` map

**4. Same logic in CONFIRM MODE (~line 245-278)**
- When confirming/inserting transactions, also apply user rules before `normalizeMovement`/`validateCategory`

**5. Update rule stats after processing (before returning response)**
- For each rule that fired, batch update `applied_count` and `last_applied_at`

### Files to modify
1. `supabase/functions/process-financial-file/index.ts` — all changes in this single file

