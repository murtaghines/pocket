import { describe, it, expect } from 'vitest';
import * as client from '../src/lib/userRules';
import * as edge from '../supabase/functions/_shared/userRules';

// _shared/userRules.ts (Deno-side, imported by process-import) is a byte-identical copy of
// src/lib/userRules.ts (browser-side, imported by RuleEditorDialog). This locks them in sync:
// if they diverge, a user_rule's "will match N transactions" preview could silently disagree
// with what actually matches on the next import. See docs/epics/uploads.md / categories.md.

const SAMPLE_DESCRIPTIONS = [
  'COMPRA MERCADONA MADRID 55',
  'Pago Transferencia',
  'H&M Kids Barcelona',
  'Café Peña-Nieto 123',
  'BIZUM A JUAN GARCIA',
  'NETFLIX.COM',
  '',
  'TRF A CTA PROPIA REVOLUT',
];

describe('client/edge userRules parity', () => {
  it('normalize produces identical output for the same input', () => {
    for (const d of SAMPLE_DESCRIPTIONS) {
      expect(edge.normalize(d)).toBe(client.normalize(d));
    }
  });

  it('extractTokens produces identical output for the same input', () => {
    for (const d of SAMPLE_DESCRIPTIONS) {
      expect(edge.extractTokens(d)).toEqual(client.extractTokens(d));
    }
  });

  it('extractKeyTokens produces identical output for the same input', () => {
    for (const d of SAMPLE_DESCRIPTIONS) {
      expect(edge.extractKeyTokens(d)).toEqual(client.extractKeyTokens(d));
    }
  });

  it('buildRuleFromCorrection produces identical output for the same input', () => {
    for (const d of SAMPLE_DESCRIPTIONS) {
      expect(edge.buildRuleFromCorrection(d, 'EXPENSE', 'groceries'))
        .toEqual(client.buildRuleFromCorrection(d, 'EXPENSE', 'groceries'));
    }
  });

  it('ruleMatchesDescription agrees across all match types', () => {
    const cases: Array<[client.MatchType, string, string[]]> = [
      ['fuzzy', 'MERCADONA MADRID', ['MERCADONA', 'MADRID']],
      ['contains', 'mercadona', []],
      ['starts_with', 'compra', []],
      ['ends_with', 'madrid', []],
      ['exact', 'mercadona madrid 55', []],
      ['regex', 'merc\\w+', []],
    ];
    for (const [matchType, pattern, tokens] of cases) {
      for (const d of SAMPLE_DESCRIPTIONS) {
        expect(edge.ruleMatchesDescription(matchType, pattern, tokens, d))
          .toBe(client.ruleMatchesDescription(matchType, pattern, tokens, d));
      }
    }
  });
});
