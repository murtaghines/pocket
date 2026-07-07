import { describe, it, expect } from 'vitest';
import {
  sha256,
  normalizeDescription,
  calculateFingerprint,
  calculateInvestmentFingerprint,
  extractMonthKey,
} from '../supabase/functions/_shared/fingerprint';

// Characterization tests for the dedup/hashing primitives. Locking these down protects
// against silent duplicate misses when the Fase 1 fingerprint-NULL fix rewires
// process-import to import this module. See docs/epics/uploads.md.

describe('sha256', () => {
  it('produces a stable 64-char hex digest', async () => {
    const h = await sha256('hello');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    // Known SHA-256("hello")
    expect(h).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });
});

describe('normalizeDescription', () => {
  it('lowercases, strips accents, and collapses whitespace', () => {
    expect(normalizeDescription('  Café   CON   Leche ')).toBe('cafe con leche');
  });

  it('scrubs reference numbers, masked card digits and long digit runs', () => {
    expect(normalizeDescription('COMPRA ref 12345')).toBe('compra');
    expect(normalizeDescription('PAGO ****1234')).toBe('pago');
    expect(normalizeDescription('TX 01234567890 END')).toBe('tx  end');
  });

  it('truncates to 200 chars', () => {
    expect(normalizeDescription('a'.repeat(500)).length).toBe(200);
  });
});

describe('calculateFingerprint', () => {
  it('uses ONLY the source transaction id when present (ignores date/amount/desc)', async () => {
    const withDesc = await calculateFingerprint('u1', 'a1', 'TX123', '2024-01-01', -10, 'EUR', 'Something', 100);
    const differentEverythingElse = await calculateFingerprint('u1', 'a1', 'TX123', '2099-12-31', 999, 'USD', 'Totally other', null);
    expect(withDesc).toBe(differentEverythingElse);
  });

  it('falls back to account+date+amount+currency+desc when no source id', async () => {
    const a = await calculateFingerprint('u1', 'a1', null, '2024-01-01', -10, 'EUR', 'Mercadona', 100);
    const b = await calculateFingerprint('u1', 'a1', null, '2024-01-01', -10, 'EUR', 'Mercadona', 100);
    const cDifferentAmount = await calculateFingerprint('u1', 'a1', null, '2024-01-01', -11, 'EUR', 'Mercadona', 100);
    const dDifferentAccount = await calculateFingerprint('u1', 'a2', null, '2024-01-01', -10, 'EUR', 'Mercadona', 100);
    expect(a).toBe(b);
    expect(a).not.toBe(cDifferentAmount);
    expect(a).not.toBe(dDifferentAccount); // Different account = different fingerprint (fixed)
  });

  it('running_balance is excluded from the fingerprint (fixes dedup on reimport)', async () => {
    const withBalance = await calculateFingerprint('u1', 'a1', null, '2024-01-01', -10, 'EUR', 'Mercadona', 100);
    const noBalance = await calculateFingerprint('u1', 'a1', null, '2024-01-01', -10, 'EUR', 'Mercadona', null);
    const differentBalance = await calculateFingerprint('u1', 'a1', null, '2024-01-01', -10, 'EUR', 'Mercadona', 999);
    // Same transaction with different running_balance values → SAME fingerprint (dedup survives reimport).
    expect(withBalance).toBe(noBalance);
    expect(withBalance).toBe(differentBalance);
  });
});

describe('calculateInvestmentFingerprint', () => {
  // process-investment-file used to trust an AI-generated `hash_source` string, hashed with
  // a weak custom rolling hash — an LLM's formatting of the same input isn't guaranteed
  // byte-identical across two runs, which silently broke dedup on reimport (the same class
  // of bug running_balance caused in calculateFingerprint). This is now computed entirely
  // from validated fields with the same SHA-256 primitive used for transactions.
  it('is deterministic for identical inputs', async () => {
    const a = await calculateInvestmentFingerprint('Revolut', '2025-10-10', 500, 'ETF deposit');
    const b = await calculateInvestmentFingerprint('Revolut', '2025-10-10', 500, 'ETF deposit');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('differs when platform differs (same date/amount/desc on two platforms is NOT a dup)', async () => {
    const revolut = await calculateInvestmentFingerprint('Revolut', '2025-10-10', 500, 'Deposit');
    const myInvestor = await calculateInvestmentFingerprint('MyInvestor', '2025-10-10', 500, 'Deposit');
    expect(revolut).not.toBe(myInvestor);
  });

  it('differs when date or amount differs', async () => {
    const base = await calculateInvestmentFingerprint('Revolut', '2025-10-10', 500, 'Deposit');
    const otherDate = await calculateInvestmentFingerprint('Revolut', '2025-10-11', 500, 'Deposit');
    const otherAmount = await calculateInvestmentFingerprint('Revolut', '2025-10-10', 501, 'Deposit');
    expect(base).not.toBe(otherDate);
    expect(base).not.toBe(otherAmount);
  });

  it('ignores sign (deposit/withdrawal share the same amount magnitude convention)', async () => {
    const positive = await calculateInvestmentFingerprint('Revolut', '2025-10-10', 500, 'Deposit');
    const negative = await calculateInvestmentFingerprint('Revolut', '2025-10-10', -500, 'Deposit');
    expect(positive).toBe(negative);
  });

  it('platform matching is case/whitespace-insensitive (AI wording variance shouldn\'t fragment dedup)', async () => {
    const a = await calculateInvestmentFingerprint('Revolut Savings', '2025-10-10', 500, 'Deposit');
    const b = await calculateInvestmentFingerprint('  revolut savings  ', '2025-10-10', 500, 'Deposit');
    expect(a).toBe(b);
  });
});

describe('extractMonthKey', () => {
  it('reads YYYY-MM directly to avoid timezone drift', () => {
    expect(extractMonthKey('2024-01-15')).toBe('2024-01');
    expect(extractMonthKey('2024-12-31')).toBe('2024-12');
  });

  it('handles year-first slash/dot separators (Fase 1 fix)', () => {
    expect(extractMonthKey('2024/03/09')).toBe('2024-03');
    expect(extractMonthKey('2024.03.09')).toBe('2024-03');
  });

  it('returns "" (not "NaN-NaN") for unparseable dates so callers skip them cleanly', () => {
    expect(extractMonthKey('not-a-date')).toBe('');
    expect(extractMonthKey('')).toBe('');
  });
});
