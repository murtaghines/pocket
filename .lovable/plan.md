

## Plan: Fix Opening Balance Calculation

### Problem
The opening balance for each month is calculated incorrectly because when multiple transactions share the same date (e.g., Feb 1), the code picks an arbitrary one to compute `running_balance - amount`. This gives different results depending on which transaction is selected. For February, the correct opening is **940.66** but the code may return 915.96 or another wrong value.

### Root Cause
In `useTransactions.tsx` (line 191), transactions are sorted by date string only. When multiple transactions fall on the same date, their relative order is undefined. The code then picks whichever appears first, leading to non-deterministic opening balance values.

### Fix (1 file: `src/hooks/useTransactions.tsx`)

Replace the opening balance computation (lines 172-205) with a deterministic algorithm:

1. For each bank on the earliest date of a month, collect all transactions that have a `running_balance`.
2. Build a set of all `running_balance` values on that date.
3. Find the **first chronological transaction** by identifying the one whose `running_balance - amount` is NOT in the set of running_balances. This value is the balance before any transaction occurred — the true opening balance.
4. Sum across all banks to get the total opening balance for the month.

**Why this works:** Each transaction's running_balance equals the previous transaction's running_balance plus its amount. So for every transaction except the first, `running_balance - amount` equals another transaction's running_balance. For the first transaction, `running_balance - amount` equals the opening balance, which is not any transaction's running_balance.

**Fallback:** If the algorithm can't find the first transaction (e.g., due to floating-point coincidence), fall back to selecting the transaction with the maximum `running_balance - amount` on the earliest date — this is correct when net daily flow is negative (the most common case).

### Verification
With the user's Feb 1 data:
- 7 transactions, running_balances: {927.26, 917.46, 916.96, 926.76, 919.76, 915.96, 910.28}
- Transaction with rb=927.26, amount=-13.40: candidate opening = 940.66
- 940.66 is NOT in the running_balance set → confirmed as the true opening ✓

