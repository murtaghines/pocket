// Running-balance reliability check for the imports pipeline.
//
// Bank exports sometimes interleave several sub-account balance tracks into one file (e.g.
// Revolut mixing a current account and a savings pocket, or two pockets, under one export).
// When that happens the `running_balance` column jumps between tracks and is meaningless for a
// single Pocket account, so the pipeline NULLs it and falls back to the computed path
// (initial_balance + Σamount). This module decides whether the running_balance is trustworthy.
//
// The previous heuristic sorted rows by (date, fingerprint) and checked consecutive pairs
// `prevRb + amount === rb`. That produced FALSE POSITIVES on clean single-account statements
// whenever several transactions shared a date: date-only statements don't encode intra-day
// order, so the fingerprint sort scrambled same-day rows and broke the cascade artificially,
// nulling perfectly good bank balances (observed on Santander and Revolut savings statements).
//
// Instead we reconstruct the chain BY BALANCE, which is order-independent: a clean single
// account forms exactly one chain rb = prevRb + amount using each row once; interleaved
// multi-track exports cannot be arranged into a single chain.

const r2 = (n: number) => Math.round(n * 100) / 100;

export function runningBalanceIsReliable(
  rows: Array<{ amount: number | string; running_balance: number | string | null }>,
): boolean {
  const chain = rows
    .filter((t) => t.running_balance != null)
    .map((t) => ({ amt: r2(Number(t.amount)), rb: r2(Number(t.running_balance)) }))
    .filter((r) => Number.isFinite(r.amt) && Number.isFinite(r.rb));

  // Too few balances to judge — trust the bank data rather than guess.
  if (chain.length < 5) return true;

  // Index every row by the balance it would follow (rb - amount), and record which balances
  // exist as a row's post-transaction balance.
  const byPred = new Map<number, number[]>();
  const rbValues = new Set<number>();
  chain.forEach((row, i) => {
    const pred = r2(row.rb - row.amt);
    if (!byPred.has(pred)) byPred.set(pred, []);
    byPred.get(pred)!.push(i);
    rbValues.add(row.rb);
  });

  // The chain's first row is the one whose predecessor balance (the opening balance) is not
  // produced by any row. If none exists (e.g. the balance revisits its opening value), we
  // can't identify a start — keep the bank data rather than risk a false null-out.
  const start = chain.find((row) => !rbValues.has(r2(row.rb - row.amt)));
  if (!start) return true;

  // Walk the single chain greedily from the opening balance, consuming one row per step.
  const used = new Array(chain.length).fill(false);
  let cur = r2(start.rb - start.amt);
  let consumed = 0;
  while (consumed < chain.length) {
    const candidates = (byPred.get(cur) ?? []).filter((i) => !used[i]);
    if (candidates.length === 0) break; // chain broke — leftover rows belong to another track
    const i = candidates[0];
    used[i] = true;
    consumed++;
    cur = chain[i].rb;
  }

  // A clean single-account statement consumes every row in one chain. Allow a 1-row slack for a
  // duplicate-balance tie that the greedy walk might mis-step on.
  return consumed >= chain.length - 1;
}

// When runningBalanceIsReliable returns false, the pipeline NULLs running_balance and the
// standard initial_balance inference (earliest tx with running_balance) finds nothing. This
// function decomposes the rows into multiple balance chains (one per sub-account/pocket) and
// sums each chain's opening balance to produce the account's total initial_balance.
export function inferMultiTrackOpeningBalance(
  rows: Array<{ amount: number | string; running_balance: number | string | null }>,
): number | null {
  const data = rows
    .filter((t) => t.running_balance != null)
    .map((t) => ({ amt: r2(Number(t.amount)), rb: r2(Number(t.running_balance)) }))
    .filter((r) => Number.isFinite(r.amt) && Number.isFinite(r.rb));

  if (data.length < 2) return null;

  const used = new Array(data.length).fill(false);
  let totalOpening = 0;
  let chainsFound = 0;
  let totalConsumed = 0;

  for (let pass = 0; pass < 10; pass++) {
    // Build index for remaining rows
    const byPred = new Map<number, number[]>();
    const rbSet = new Set<number>();
    data.forEach((row, i) => {
      if (used[i]) return;
      const pred = r2(row.rb - row.amt);
      if (!byPred.has(pred)) byPred.set(pred, []);
      byPred.get(pred)!.push(i);
      rbSet.add(row.rb);
    });

    // Find start: unused row whose predecessor is not any unused row's rb
    const startIdx = data.findIndex((row, i) => !used[i] && !rbSet.has(r2(row.rb - row.amt)));
    if (startIdx < 0) break;

    const opening = r2(data[startIdx].rb - data[startIdx].amt);

    // Walk this chain greedily
    let cur = opening;
    let consumed = 0;
    while (true) {
      const candidates = (byPred.get(cur) ?? []).filter((i) => !used[i]);
      if (candidates.length === 0) break;
      used[candidates[0]] = true;
      consumed++;
      cur = data[candidates[0]].rb;
    }

    if (consumed === 0) break;
    totalOpening += opening;
    totalConsumed += consumed;
    chainsFound++;
  }

  if (chainsFound >= 2 && totalConsumed >= data.length * 0.8) {
    return r2(totalOpening);
  }

  return null;
}
