import { describe, it, expect } from 'vitest';
import { runningBalanceIsReliable, inferMultiTrackOpeningBalance } from '../supabase/functions/_shared/runningBalance';

// The imports pipeline NULLs running_balance when a file interleaves several sub-account
// balance tracks (Revolut mixing two pockets/accounts into one export), so Pocket falls back to
// the computed balance path. The reliability check must reconstruct the chain BY BALANCE so that
// a clean single-account statement with several same-day rows is NOT false-flagged — the previous
// (date, fingerprint)-sorted consecutive-pair check nulled valid Santander/Revolut balances.

describe('runningBalanceIsReliable', () => {
  it('keeps balances for a clean statement even when same-day rows are out of order', () => {
    // Mirrors the Santander demo statement: opening 0, three transactions on the same day, and
    // the check must survive them being listed in any order (date-only statements don't encode
    // intra-day order).
    const chronological = [
      { amount: 1349.0, running_balance: 1349.0 }, // 0 -> 1349
      { amount: -19.44, running_balance: 1329.56 },
      { amount: -7.0, running_balance: 1322.56 }, // same-day trio ↓
      { amount: -6.0, running_balance: 1316.56 },
      { amount: -10.0, running_balance: 1306.56 },
      { amount: -300.0, running_balance: 1006.56 },
      { amount: -1000.0, running_balance: 6.56 },
    ];
    const scrambled = [
      chronological[0],
      chronological[3],
      chronological[1],
      chronological[4],
      chronological[2],
      chronological[5],
      chronological[6],
    ];
    expect(runningBalanceIsReliable(scrambled)).toBe(true);
  });

  it('flags an interleaved two-track export as unreliable', () => {
    // Track A: 100→90→80→70 ; Track B: 5000→4900→4800→4700, interleaved in file order.
    const rows = [
      { amount: -10, running_balance: 90 }, // A
      { amount: -100, running_balance: 4900 }, // B
      { amount: -10, running_balance: 80 }, // A
      { amount: -100, running_balance: 4800 }, // B
      { amount: -10, running_balance: 70 }, // A
      { amount: -100, running_balance: 4700 }, // B
    ];
    expect(runningBalanceIsReliable(rows)).toBe(false);
  });

  it('keeps balances when there are too few rows to judge', () => {
    expect(
      runningBalanceIsReliable([
        { amount: -10, running_balance: 90 },
        { amount: -10, running_balance: 80 },
      ]),
    ).toBe(true);
  });

  it('ignores rows without a running_balance', () => {
    const rows = [
      { amount: 100, running_balance: 100 },
      { amount: -10, running_balance: 90 },
      { amount: -10, running_balance: null },
      { amount: -10, running_balance: 80 },
      { amount: -10, running_balance: 70 },
      { amount: -10, running_balance: 60 },
    ];
    expect(runningBalanceIsReliable(rows)).toBe(true);
  });

  it('accepts numeric strings (values arrive from JSON as strings sometimes)', () => {
    const rows = [
      { amount: '100', running_balance: '100' },
      { amount: '-10', running_balance: '90' },
      { amount: '-10', running_balance: '80' },
      { amount: '-10', running_balance: '70' },
      { amount: '-10', running_balance: '60' },
      { amount: '-10', running_balance: '50' },
    ];
    expect(runningBalanceIsReliable(rows)).toBe(true);
  });
});

describe('inferMultiTrackOpeningBalance', () => {
  it('decomposes two interleaved tracks and sums their opening balances', () => {
    // Track A: opening 100, rows -10 → 90, -10 → 80, -10 → 70
    // Track B: opening 5000, rows -100 → 4900, -100 → 4800, -100 → 4700
    // Total opening: 100 + 5000 = 5100
    const rows = [
      { amount: -10, running_balance: 90 },
      { amount: -100, running_balance: 4900 },
      { amount: -10, running_balance: 80 },
      { amount: -100, running_balance: 4800 },
      { amount: -10, running_balance: 70 },
      { amount: -100, running_balance: 4700 },
    ];
    expect(inferMultiTrackOpeningBalance(rows)).toBe(5100);
  });

  it('returns null for a single-track statement', () => {
    const rows = [
      { amount: 100, running_balance: 100 },
      { amount: -10, running_balance: 90 },
      { amount: -10, running_balance: 80 },
      { amount: -10, running_balance: 70 },
      { amount: -10, running_balance: 60 },
    ];
    // Only one chain → chainsFound < 2 → null
    expect(inferMultiTrackOpeningBalance(rows)).toBeNull();
  });

  it('returns null when there are too few rows', () => {
    expect(inferMultiTrackOpeningBalance([
      { amount: -10, running_balance: 90 },
    ])).toBeNull();
  });

  it('handles a realistic Revolut savings scenario (two pockets)', () => {
    // Pocket 1 (Instant Access): opening 1169.78
    //   +0.04 → 1169.82, +0.04 → 1169.86, +500 → 1669.86
    // Pocket 2 (Savings Challenge): opening 1403.15
    //   +0.03 → 1403.18, +0.03 → 1403.21, +200 → 1603.21
    // Interleaved chronologically, total opening = 1169.78 + 1403.15 = 2572.93
    const rows = [
      { amount: 0.04, running_balance: 1169.82 },
      { amount: 0.03, running_balance: 1403.18 },
      { amount: 0.04, running_balance: 1169.86 },
      { amount: 0.03, running_balance: 1403.21 },
      { amount: 500, running_balance: 1669.86 },
      { amount: 200, running_balance: 1603.21 },
    ];
    expect(inferMultiTrackOpeningBalance(rows)).toBe(2572.93);
  });
});
