

## Plan: Multi-Bank Opening Balance Aggregation

### Problem
The current `openingBalanceByMonth` calculation takes the first transaction of the month (regardless of bank) and computes `runningBalance - amount`. This only reflects ONE bank's starting balance, not the combined starting position across all accounts.

With data from Revolut and Santander, the opening balance should be the SUM of each bank's starting balance for that month.

### Current Data (from network requests, Nov 2025)
- Santander first tx: running_balance varies per transaction
- Revolut first tx: running_balance varies per transaction
- These are independent per-bank balances

### Fix

**File: `src/hooks/useTransactions.tsx` (lines 161-188)**

Change the `openingBalanceByMonth` calculation to:
1. Group transactions by month AND bank
2. For each month+bank pair, find the earliest transaction and compute `runningBalance - amount` (the balance before that first transaction)
3. Sum across all banks for that month to get the total opening balance

```typescript
const openingBalanceByMonth: Record<string, number> = (() => {
  if (!transactions.length) return {};
  
  // Group by month -> bank -> transactions
  const byMonthBank: Record<string, Record<string, Transaction[]>> = {};
  for (const tx of transactions) {
    const monthKey = tx.date.substring(0, 7);
    if (!byMonthBank[monthKey]) byMonthBank[monthKey] = {};
    if (!byMonthBank[monthKey][tx.bank]) byMonthBank[monthKey][tx.bank] = [];
    byMonthBank[monthKey][tx.bank].push(tx);
  }
  
  const result: Record<string, number> = {};
  
  for (const [monthKey, banks] of Object.entries(byMonthBank)) {
    let totalOpening = 0;
    let hasAnyBalance = false;
    
    for (const [, txs] of Object.entries(banks)) {
      const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
      const firstWithBalance = sorted.find(t => t.runningBalance != null);
      if (firstWithBalance && firstWithBalance.runningBalance != null) {
        totalOpening += firstWithBalance.runningBalance - firstWithBalance.amount;
        hasAnyBalance = true;
      }
    }
    
    if (hasAnyBalance) {
      result[monthKey] = Math.round(totalOpening * 100) / 100;
    }
  }
  
  return result;
})();
```

No other files need changes. The table already shows transactions sorted by date (integrated, not separated by bank) with the bank column visible. The Balance column correctly shows per-bank running balance from the statement.

### What stays the same
- Transaction table: already sorted by date across all banks, bank column visible
- Per-row Balance column: shows the per-bank running_balance (correct, it's what the statement says)
- The opening balance text under the month title in Index.tsx: already wired to `openingBalanceByMonth`

