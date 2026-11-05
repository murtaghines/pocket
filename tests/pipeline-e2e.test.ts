import { describe, it, expect } from 'vitest';
import { tryDeterministicParse } from '../supabase/functions/_shared/csvParser';
import { categorize, normalize } from '../supabase/functions/_shared/categorizer';
import {
  calculateFingerprint,
  normalizeDescription,
  extractMonthKey,
} from '../supabase/functions/_shared/fingerprint';

/**
 * End-to-end pipeline tests: CSV → deterministic parse → categorize → fingerprint.
 *
 * These exercise the full local pipeline (no AI mock needed) and verify that the
 * same input always produces the same fingerprint — the core dedup invariant.
 */

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const SANTANDER_ES_CSV = [
  'Fecha;Concepto;Importe;Saldo',
  '15/10/2026;COMPRA EN MERCADONA;-42,50;1.234,56',
  '14/10/2026;TRANSFERENCIA A LOPEZ GARCIA MARIA;-500,00;1.277,06',
  '13/10/2026;NOMINA OCTUBRE 2026;2.150,00;1.777,06',
  '12/10/2026;RECIBO NETFLIX.COM;-15,99;-372,94',
  '11/10/2026;BIZUM RECIBIDO;25,00;-356,95',
].join('\n');

const REVOLUT_CSV = [
  'Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance',
  'CARD_PAYMENT,Current,2026-10-15 10:30:00,2026-10-15 12:00:00,Lidl,-23.45,0.00,EUR,COMPLETED,1500.00',
  'CARD_PAYMENT,Current,2026-10-14 08:00:00,2026-10-14 09:00:00,Spotify,-9.99,0.00,EUR,COMPLETED,1523.45',
  'TOPUP,Current,2026-10-13 18:00:00,2026-10-13 18:01:00,Top-Up by *1234,1000.00,0.00,EUR,COMPLETED,1533.44',
].join('\n');

const CHASE_US_CSV = [
  'Transaction Date,Post Date,Description,Category,Type,Amount,Memo',
  '10/15/2026,10/16/2026,KROGER #1234,Groceries,Sale,-85.32,',
  '10/14/2026,10/15/2026,UBER *TRIP,Travel,Sale,-22.50,',
  '10/13/2026,10/14/2026,DIRECT DEP ADP PAYROLL,Income,Credit,3200.00,',
].join('\n');

// ─── E2E: Parse → Categorize → Fingerprint ─────────────────────────────────

describe('e2e pipeline: CSV → parse → categorize → fingerprint', () => {
  it('processes a Spanish bank CSV end-to-end', () => {
    const result = tryDeterministicParse(SANTANDER_ES_CSV);
    expect(result).not.toBeNull();
    expect(result!.transactions).toHaveLength(5);

    const [mercadona, transfer, nomina, netflix, bizum] = result!.transactions;

    // Verify parsed values
    expect(mercadona.posted_date).toBe('2026-10-15');
    expect(mercadona.amount_signed).toBeCloseTo(-42.50);
    expect(mercadona.running_balance).toBeCloseTo(1234.56);

    expect(nomina.posted_date).toBe('2026-10-13');
    expect(nomina.amount_signed).toBeCloseTo(2150.00);

    // Categorize each row
    const catMercadona = categorize(mercadona.description_raw, mercadona.amount_signed);
    expect(catMercadona).not.toBeNull();
    expect(catMercadona!.category).toBe('groceries');
    expect(catMercadona!.movement).toBe('EXPENSE');

    const catNomina = categorize(nomina.description_raw, nomina.amount_signed);
    expect(catNomina).not.toBeNull();
    expect(catNomina!.category).toBe('salary');
    expect(catNomina!.movement).toBe('INCOME');

    const catNetflix = categorize(netflix.description_raw, netflix.amount_signed);
    expect(catNetflix).not.toBeNull();
    expect(catNetflix!.category).toBe('subscriptions');
  });

  it('processes a Revolut CSV end-to-end', () => {
    const result = tryDeterministicParse(REVOLUT_CSV);
    expect(result).not.toBeNull();
    expect(result!.transactions).toHaveLength(3);

    const [lidl, spotify] = result!.transactions;

    expect(lidl.posted_date).toBe('2026-10-15');
    expect(lidl.amount_signed).toBeCloseTo(-23.45);

    const catLidl = categorize(lidl.description_raw, lidl.amount_signed);
    expect(catLidl).not.toBeNull();
    expect(catLidl!.category).toBe('groceries');

    const catSpotify = categorize(spotify.description_raw, spotify.amount_signed);
    expect(catSpotify).not.toBeNull();
    expect(catSpotify!.category).toBe('subscriptions');
  });

  it('processes a Chase US CSV end-to-end', () => {
    const result = tryDeterministicParse(CHASE_US_CSV);
    expect(result).not.toBeNull();
    expect(result!.transactions).toHaveLength(3);

    const [kroger, uber, payroll] = result!.transactions;

    expect(kroger.amount_signed).toBeCloseTo(-85.32);
    expect(uber.amount_signed).toBeCloseTo(-22.50);
    expect(payroll.amount_signed).toBeCloseTo(3200.00);

    const catKroger = categorize(kroger.description_raw, kroger.amount_signed);
    expect(catKroger).not.toBeNull();
    expect(catKroger!.category).toBe('groceries');

    const catUber = categorize(uber.description_raw, uber.amount_signed);
    expect(catUber).not.toBeNull();
    expect(catUber!.movement).toBe('EXPENSE');
    expect(catUber!.category).toBe('transport');

    const catPayroll = categorize(payroll.description_raw, payroll.amount_signed);
    expect(catPayroll).not.toBeNull();
    expect(catPayroll!.category).toBe('salary');
  });
});

// ─── Fingerprint stability: same input → same hash ──────────────────────────

describe('fingerprint stability across reimports', () => {
  it('produces identical fingerprints for the same CSV parsed twice', async () => {
    const parse1 = tryDeterministicParse(SANTANDER_ES_CSV)!;
    const parse2 = tryDeterministicParse(SANTANDER_ES_CSV)!;

    expect(parse1.transactions).toHaveLength(parse2.transactions.length);

    for (let i = 0; i < parse1.transactions.length; i++) {
      const r1 = parse1.transactions[i];
      const r2 = parse2.transactions[i];

      const fp1 = await calculateFingerprint(
        'import', r1.posted_date, r1.amount_signed, r1.currency || 'EUR', r1.description_raw, 0,
      );
      const fp2 = await calculateFingerprint(
        'import', r2.posted_date, r2.amount_signed, r2.currency || 'EUR', r2.description_raw, 0,
      );

      expect(fp1).toBe(fp2);
      expect(fp1).toHaveLength(64); // SHA-256 hex
    }
  });

  it('produces different fingerprints for different transactions', async () => {
    const result = tryDeterministicParse(SANTANDER_ES_CSV)!;
    const fingerprints = new Set<string>();

    for (const row of result.transactions) {
      const fp = await calculateFingerprint(
        'import', row.posted_date, row.amount_signed, row.currency || 'EUR', row.description_raw, 0,
      );
      fingerprints.add(fp);
    }

    expect(fingerprints.size).toBe(result.transactions.length);
  });

  it('sequence tiebreaker differentiates otherwise-identical rows', async () => {
    const fp0 = await calculateFingerprint('import', '2026-10-15', -42.50, 'EUR', 'COMPRA EN MERCADONA', 0);
    const fp1 = await calculateFingerprint('import', '2026-10-15', -42.50, 'EUR', 'COMPRA EN MERCADONA', 1);
    const fp2 = await calculateFingerprint('import', '2026-10-15', -42.50, 'EUR', 'COMPRA EN MERCADONA', 2);

    expect(fp0).not.toBe(fp1);
    expect(fp1).not.toBe(fp2);
    expect(fp0).not.toBe(fp2);
  });
});

// ─── Month-key extraction from parsed dates ─────────────────────────────────

describe('month-key extraction from parsed CSV rows', () => {
  it('extracts correct month keys from deterministic parse output', () => {
    const result = tryDeterministicParse(SANTANDER_ES_CSV)!;

    for (const row of result.transactions) {
      const monthKey = extractMonthKey(row.posted_date);
      expect(monthKey).toBe('2026-10');
    }
  });

  it('handles multiple months in one CSV', () => {
    const multiMonthCSV = [
      'Date,Description,Amount',
      '2026-11-01,November rent,-900.00',
      '2026-10-28,Grocery store,-45.00',
      '2026-10-15,Salary,3000.00',
    ].join('\n');

    const result = tryDeterministicParse(multiMonthCSV)!;
    expect(result.transactions).toHaveLength(3);

    const months = result.transactions.map(r => extractMonthKey(r.posted_date));
    expect(months).toEqual(['2026-11', '2026-10', '2026-10']);
  });
});

// ─── Normalization consistency ──────────────────────────────────────────────

describe('normalization consistency between modules', () => {
  it('categorizer normalize and fingerprint normalizeDescription are deterministic', () => {
    const descriptions = [
      'COMPRA EN MERCADONA Ref.123456',
      'TRANSFERENCIA A LOPEZ GARCIA MARIA',
      'Café & Bar Peña-Nieto',
      'NETFLIX.COM',
      'uber *trip help.uber.com',
    ];

    for (const desc of descriptions) {
      expect(normalize(desc)).toBe(normalize(desc));
      expect(normalizeDescription(desc)).toBe(normalizeDescription(desc));
    }
  });
});

// ─── Categorizer movement assignment matches sign ───────────────────────────

describe('categorizer movement matches amount sign', () => {
  const cases: [string, number, string][] = [
    ['MERCADONA', -42.50, 'EXPENSE'],
    ['NOMINA', 2150, 'INCOME'],
    ['NETFLIX.COM', -15.99, 'EXPENSE'],
    ['LIDL', -23.45, 'EXPENSE'],
    ['SALARY PAYMENT', 3200, 'INCOME'],
  ];

  it.each(cases)('"%s" with amount %d → movement %s', (desc, amount, expectedMovement) => {
    const result = categorize(desc, amount);
    expect(result).not.toBeNull();
    expect(result!.movement).toBe(expectedMovement);
  });
});
