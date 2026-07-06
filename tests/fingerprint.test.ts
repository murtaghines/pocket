import { describe, it, expect } from 'vitest';
import {
  sha256,
  normalizeDescription,
  calculateFingerprint,
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

  it('falls back to date+amount+desc(+balance) when no source id', async () => {
    const a = await calculateFingerprint('u1', 'a1', null, '2024-01-01', -10, 'EUR', 'Mercadona', 100);
    const b = await calculateFingerprint('u1', 'a1', null, '2024-01-01', -10, 'EUR', 'Mercadona', 100);
    const cDifferentAmount = await calculateFingerprint('u1', 'a1', null, '2024-01-01', -11, 'EUR', 'Mercadona', 100);
    expect(a).toBe(b);
    expect(a).not.toBe(cDifferentAmount);
  });

  it('running balance participates in the fingerprint (documented dedup weakness)', async () => {
    const withBalance = await calculateFingerprint('u1', 'a1', null, '2024-01-01', -10, 'EUR', 'Mercadona', 100);
    const noBalance = await calculateFingerprint('u1', 'a1', null, '2024-01-01', -10, 'EUR', 'Mercadona', null);
    // Same transaction, different balance → different fingerprint (a known false-negative source).
    expect(withBalance).not.toBe(noBalance);
  });
});

describe('extractMonthKey', () => {
  it('reads YYYY-MM directly to avoid timezone drift', () => {
    expect(extractMonthKey('2024-01-15')).toBe('2024-01');
    expect(extractMonthKey('2024-12-31')).toBe('2024-12');
  });

  it('KNOWN BUG (Fase 1): the non-ISO fallback yields "NaN-NaN"', () => {
    // The fallback does `new Date('2024/03/09' + 'T12:00:00Z')`, which is an invalid date,
    // so any date that is not already strict YYYY-MM-DD produces "NaN-NaN". This test locks
    // in today's broken behavior; fix it in Fase 1 (parse slash/other formats properly) and
    // update this expectation deliberately.
    expect(extractMonthKey('2024/03/09')).toBe('NaN-NaN');
  });
});
