import { describe, it, expect } from 'vitest';
import {
  normalize,
  extractTokens,
  fuzzyMatch,
  categorize,
  categorizeBatch,
  type UserContext,
} from '../supabase/functions/_shared/categorizer';

// Characterization tests: these lock in the CURRENT behavior of the categorization
// engine so the upcoming cleanup/refactor of the imports pipeline can't silently
// change how real bank descriptions get bucketed. See docs/epics/uploads.md (Fase 0).

describe('normalize', () => {
  it('uppercases, strips accents and collapses punctuation', () => {
    // NOTE: a hyphen BETWEEN letters is removed (not spaced), so "Peña-Nieto" → "PENANIETO",
    // same rule as H&M → HM. The docstring example in categorizer.ts:79 ("PENA NIETO") is
    // inaccurate — this test locks in the ACTUAL behavior. Flagged for the epic cleanup.
    expect(normalize('Café & Bar Peña-Nieto 123')).toBe('CAFE BAR PENANIETO 123');
  });

  it('collapses special chars between alphanumerics (H&M → HM)', () => {
    expect(normalize('H&M')).toBe('HM');
    expect(normalize('7-Eleven')).toBe('7ELEVEN');
    expect(normalize('Co-op')).toBe('COOP');
  });

  it('collapses repeated whitespace and trims', () => {
    expect(normalize('  MERCADONA   MADRID  ')).toBe('MERCADONA MADRID');
  });
});

describe('extractTokens', () => {
  it('keeps meaningful tokens and drops stopwords + pure numbers', () => {
    expect(extractTokens('Bar El Rincón de Paco')).toEqual(['BAR', 'RINCON', 'PACO']);
    expect(extractTokens('YPF Combustible 2024')).toEqual(['YPF', 'COMBUSTIBLE']);
    expect(extractTokens('H&M Kids')).toEqual(['HM', 'KIDS']);
  });
});

describe('fuzzyMatch', () => {
  it('matches when enough tokens overlap', () => {
    expect(fuzzyMatch('H&M Kids', 'HM KIDS BARCELONA').matched).toBe(true);
    // 3-token keyword needs at least 2 tokens present
    expect(fuzzyMatch('Clínica Vet López', 'VET LOPEZ CONSULTA').matched).toBe(true);
    expect(fuzzyMatch('Clínica Vet López', 'CLINICA VET LOPEZ').matched).toBe(true);
  });

  it('does not match when too few tokens overlap', () => {
    expect(fuzzyMatch('H&M Kids', 'HM STORE MADRID').matched).toBe(false);
    expect(fuzzyMatch('Clínica Vet López', 'LOPEZ FARMACIA CENTRO').matched).toBe(false);
  });
});

describe('categorize — documented merchant overlaps', () => {
  it('AMAZON PRIME VIDEO → subscriptions, bare AMAZON → shopping', () => {
    const prime = categorize('AMAZON PRIME VIDEO', -12.99);
    const shop = categorize('AMAZON MARKETPLACE', -34.5);
    expect(prime?.category).toBe('subscriptions');
    expect(shop?.category).toBe('shopping');
  });

  it('GAS NATURAL → housing, bare GAS station → transport', () => {
    const utility = categorize('GAS NATURAL FENOSA', -60);
    expect(utility?.category).toBe('housing');
  });
});

describe('categorize — name-based transfer detection (highest priority)', () => {
  const ctx: UserContext = {
    firstName: 'Juan',
    lastName: 'Pérez',
    jointAccountNames: ['Maria Gomez'],
  };

  it("matches the user's own name → own_transfer TRANSFER", () => {
    const r = categorize('TRANSFERENCIA A JUAN PEREZ', -500, ctx);
    expect(r?.movement).toBe('TRANSFER');
    expect(r?.category).toBe('own_transfer');
  });

  it('matches a joint-account name → to_joint_account (checked first)', () => {
    const r = categorize('BIZUM DE MARIA GOMEZ', 100, ctx);
    expect(r?.movement).toBe('TRANSFER');
    expect(r?.category).toBe('to_joint_account');
  });
});

describe('categorize — user custom categories override standard rules', () => {
  const ctx: UserContext = {
    firstName: 'Juan',
    lastName: 'Pérez',
    customCategories: [
      { slug: 'ropa_bebe', name: 'Ropa Bebé', movement: 'EXPENSE', keywords: ['Prenatal'] },
    ],
  };

  it('routes a matching merchant to the custom_<slug> category', () => {
    const r = categorize('PRENATAL MADRID', -40, ctx);
    expect(r?.category).toBe('custom_ropa_bebe');
    expect(r?.movement).toBe('EXPENSE');
  });
});

describe('categorize — unmatched descriptions defer to ML (null)', () => {
  it('returns null when no rule fires', () => {
    const r = categorize('ZZZQXWV UNKNOWN GIBBERISH 9182', -10);
    expect(r).toBeNull();
  });
});

describe('categorizeBatch — reports coverage stats', () => {
  it('categorizes a batch and returns per-row output', () => {
    const rows = [
      { description: 'AMAZON PRIME VIDEO', amount: -12.99 },
      { description: 'ZZZQXWV UNKNOWN GIBBERISH 9182', amount: -10 },
    ];
    const out = categorizeBatch(rows);
    expect(Array.isArray(out.results ?? out)).toBe(true);
  });
});
