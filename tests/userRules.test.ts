import { describe, it, expect } from 'vitest';
import {
  normalize,
  extractTokens,
  extractKeyTokens,
  buildRuleFromCorrection,
  ruleMatchesDescription,
} from '../src/lib/userRules';

// Characterization tests for the client-side "learn a rule from a correction" logic.
// This drives retroactive rule application, so its behavior must stay stable through
// the imports pipeline cleanup. See docs/epics/uploads.md (Fase 0).

describe('normalize (userRules variant)', () => {
  it('strips accents and turns non-alphanumerics into spaces (does NOT join like categorizer)', () => {
    // Unlike categorizer.normalize, a "&" between letters becomes a space here.
    expect(normalize('H&M')).toBe('H M');
    expect(normalize('Café Peña-Nieto')).toBe('CAFE PENA NIETO');
  });
});

describe('extractTokens / extractKeyTokens', () => {
  it('extractTokens keeps tokens of length >= 2', () => {
    expect(extractTokens('Pago a Mercadona')).toEqual(['PAGO', 'MERCADONA']);
  });

  it('extractKeyTokens drops generic banking noise words', () => {
    // PAGO and COMPRA are generic; MERCADONA / MADRID survive.
    expect(extractKeyTokens('COMPRA Pago Mercadona Madrid')).toEqual(['MERCADONA', 'MADRID']);
  });
});

describe('buildRuleFromCorrection', () => {
  it('builds a fuzzy rule from the meaningful tokens', () => {
    const rule = buildRuleFromCorrection('Pago Mercadona Madrid', 'EXPENSE', 'groceries');
    expect(rule.match_type).toBe('fuzzy');
    expect(rule.pattern).toBe('MERCADONA MADRID');
    expect(rule.tokens).toEqual(['MERCADONA', 'MADRID']);
  });

  it('falls back to a contains rule when only generic tokens remain', () => {
    const rule = buildRuleFromCorrection('Pago Transferencia', 'EXPENSE', 'other_expense');
    expect(rule.match_type).toBe('contains');
    expect(rule.tokens).toEqual([]);
  });
});

describe('ruleMatchesDescription', () => {
  it('fuzzy: matches only when every token is present', () => {
    const tokens = ['MERCADONA', 'MADRID'];
    expect(ruleMatchesDescription('fuzzy', 'MERCADONA MADRID', tokens, 'COMPRA MERCADONA MADRID 55')).toBe(true);
    expect(ruleMatchesDescription('fuzzy', 'MERCADONA MADRID', tokens, 'MERCADONA BARCELONA')).toBe(false);
  });

  it('contains / starts_with / ends_with / exact honor normalization', () => {
    expect(ruleMatchesDescription('contains', 'mercadona', [], 'Compra MERCADONA Madrid')).toBe(true);
    expect(ruleMatchesDescription('starts_with', 'compra', [], 'Compra Mercadona')).toBe(true);
    expect(ruleMatchesDescription('ends_with', 'madrid', [], 'Compra Mercadona Madrid')).toBe(true);
    expect(ruleMatchesDescription('exact', 'mercadona', [], 'Mercadona')).toBe(true);
    expect(ruleMatchesDescription('exact', 'mercadona', [], 'Mercadona Madrid')).toBe(false);
  });

  it('regex: matches valid patterns and safely rejects invalid ones', () => {
    expect(ruleMatchesDescription('regex', 'merc\\w+', [], 'MERCADONA')).toBe(true);
    expect(ruleMatchesDescription('regex', '[unclosed(', [], 'anything')).toBe(false);
  });
});
