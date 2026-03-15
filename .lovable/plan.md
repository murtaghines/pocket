

## Plan: Fix Transfer Miscategorization & Date Parsing Bug

### Problem 1: "TRANSFERENCIA" → wrongly classified as TRANSFER movement

**Root cause** — Three layers all incorrectly assume any "transferencia" is an own-account transfer:

1. **`categorizer.ts` (lines ~710-735)**: Generic patterns like `TRANSFERENCIA\s*RECIBIDA`, `TRANSFERENCIA\s*EMITIDA`, `TRANSFERENCIA\s*INMEDIATA`, `BIZUM\s*RECIBIDO`, `BIZUM\s*ENVIADO` all map to `own_transfer` (TRANSFER). These fire for ALL transfers, even ones from/to third parties.

2. **`process-import/index.ts` (lines 345-354)**: `detectInternalTransfer()` auto-confirms any `movement === 'TRANSFER'` from AI as a real transfer without checking if it's actually between own accounts.

3. **AI prompts** (both edge functions): Tell the AI to mark "Transferencia a/de" as TRANSFER movement.

**Fix**: Remove generic transfer patterns from the categorizer's `own_transfer` bucket. Only keep patterns that explicitly indicate self-transfers (e.g., "traspaso entre cuentas", "transferencia a cuenta propia"). Generic "TRANSFERENCIA RECIBIDA/EMITIDA" and "BIZUM RECIBIDO/ENVIADO" should fall through to null (AI/ML) which will classify based on amount sign. Update `detectInternalTransfer` to not blindly trust AI's TRANSFER classification. Update AI prompts to be stricter.

### Problem 2: Jan 31 transactions → classified as February

**Root cause**: `extractMonthKey()` in `process-import/index.ts` (line 274) uses `new Date(dateStr)` then `getMonth()`. When `dateStr` is "2025-01-31", `new Date()` creates UTC midnight, but depending on runtime timezone, `getMonth()` could shift. 

**Fix**: Parse the YYYY-MM-DD string directly without `new Date()`.

### Problem 3: Fix existing data

**Fix**: Write a backend function to re-run categorization on all existing transactions, using the corrected categorizer. Transactions currently marked as TRANSFER that don't match the stricter rules get re-evaluated. Also fix dates for Jan 31 transactions wrongly assigned to February.

---

### Files to modify

1. **`supabase/functions/_shared/categorizer.ts`** — Remove generic transfer patterns from `own_transfer` bucket (lines ~707-735). Keep only explicit self-transfer phrases. Remove `BIZUM RECIBIDO/ENVIADO` from transfer bucket (Bizum to/from others is income/expense).

2. **`supabase/functions/process-import/index.ts`**:
   - Fix `extractMonthKey()` to parse date string directly
   - Fix `detectInternalTransfer()` to NOT auto-confirm `movement === 'TRANSFER'` from AI; instead require explicit signals
   - Update AI prompt to be stricter about TRANSFER classification (emphasize that generic "transferencia" to/from third parties is INCOME/EXPENSE)

3. **`supabase/functions/process-financial-file/index.ts`**:
   - Fix AI prompt transfer detection rules
   - Fix `normalizeMovement()` to not blindly trust TRANSFER from AI

4. **New edge function: `supabase/functions/fix-categorization/index.ts`** — One-time fix to:
   - Re-run the corrected categorizer on all existing transactions
   - Fix transactions wrongly marked TRANSFER that are actually INCOME/EXPENSE
   - Fix date assignments for transactions from the last day of each month that were shifted to the next month

