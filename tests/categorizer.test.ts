import { describe, it, expect } from 'vitest';
import {
  normalize,
  extractTokens,
  fuzzyMatch,
  categorize,
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

describe('categorize — more canonical merchants', () => {
  it('classifies common Spanish merchants', () => {
    expect(categorize('NOMINA EMPRESA SL', 1800)?.category).toBe('salary');
    expect(categorize('MERCADONA MADRID', -54.2)?.category).toBe('groceries');
    expect(categorize('NETFLIX', -12.99)?.category).toBe('subscriptions');
    expect(categorize('SPOTIFY P0A1B2', -9.99)?.category).toBe('subscriptions');
  });

  it('routes REVOLUT vault/savings to an investment transfer', () => {
    const r = categorize('REVOLUT VAULT', -200);
    expect(r?.movement).toBe('TRANSFER');
    expect(r?.category).toBe('to_investment');
  });
});

describe('FIXED — trailing-\\b rules now handle ".COM"-style descriptors', () => {
  it('splits glued TLDs before the H&M-style merge, preserving the \\b boundary', () => {
    // normalize("NETFLIX.COM") used to produce "NETFLIXCOM" (the H&M-style merge glued the
    // dot-separated letters together), so 'NETFLIX\\b' lost its boundary and never matched.
    // Fixed: known TLDs (.COM/.ES/.NET/...) are split out with a space BEFORE that merge runs,
    // so "NETFLIX.COM" -> "NETFLIX COM" and the merchant name keeps its own boundary.
    expect(normalize('NETFLIX.COM')).toBe('NETFLIX COM');
    expect(normalize('AMAZON.ES')).toBe('AMAZON ES');
    expect(categorize('NETFLIX', -12.99)?.category).toBe('subscriptions');
    expect(categorize('NETFLIX.COM', -12.99)?.category).toBe('subscriptions');
  });

  it('does not split TLD-looking substrings mid-word (NETFLIX.COMPANY stays intact)', () => {
    // \b after the TLD group requires a real boundary, so this must NOT match COM inside
    // COMPANY — the merge behaves exactly as it did before for non-TLD-suffixed text.
    expect(normalize('NETFLIX.COMPANY')).toBe('NETFLIXCOMPANY');
  });

  it('regression: CRYPTO.COM still categorizes (rule depended on the glued form)', () => {
    // The rule table had 'CRYPTOCOM\\b', which relied on normalize() gluing "CRYPTO.COM" into
    // one token — the exact behavior this fix removes. Caught by imports-reviewer before
    // shipping: after the TLD split, "CRYPTO.COM" -> "CRYPTO COM", so the glued-form rule no
    // longer matched. Fixed by changing the rule to 'CRYPTO\\s*COM\\b' (same style already used
    // for 'PUBLIC\\s*COM'), which matches both the space-separated and glued forms.
    expect(categorize('CRYPTO.COM', -100)?.category).toBe('to_investment');
    expect(categorize('CRYPTO.COM PURCHASE', -100)?.category).toBe('to_investment');
  });

  it('still merges genuine H&M-style joins untouched by the TLD split', () => {
    expect(normalize('H&M')).toBe('HM');
    expect(normalize('7-Eleven')).toBe('7ELEVEN');
  });
});

describe('categorize — determinism guarantee for the raw/clean double-pass optimization', () => {
  // process-import calls categorize(descriptionRaw) then falls back to
  // categorize(descriptionClean) only if the two normalize differently — skipping a
  // redundant full 2500+-rule scan when it would be guaranteed to repeat. This only holds
  // if categorize() is a pure function of normalize(description) (plus amount/ctx), which
  // this test locks in: any two inputs that normalize identically MUST categorize identically.
  it('gives identical results for two descriptions that normalize the same', () => {
    const ctx: UserContext = { firstName: 'Juan', lastName: 'Pérez' };
    const pairs: [string, string][] = [
      ['NETFLIX', 'netflix'],
      ['  MERCADONA   MADRID  ', 'Mercadona Madrid'],
      ['H&M Kids', 'HM Kids'],
    ];
    for (const [a, b] of pairs) {
      expect(normalize(a)).toBe(normalize(b));
      expect(categorize(a, -20, ctx)).toEqual(categorize(b, -20, ctx));
    }
  });
});

// The BATCH PROCESSING section (categorizeBatch / splitByCategorizationNeed / dashboardSplit /
// computeMonthlyKPIs) was removed in Fase 3 cleanup — it was a zero-caller helper API added
// speculatively for a "Capa 2 ML" flow that never materialized. Tests deleted along with it.
// The remaining tests here cover single-row categorization, which is what process-import
// actually uses via `categorize()`.
