// Rule generation + matching for learned corrections (user_rules table).
//
// Copied verbatim from src/lib/userRules.ts so it can run in Deno (mirrors the pattern
// already used by _shared/fingerprint.ts for the same reason). Keep the two implementations
// byte-identical — tests/userRules-parity.test.ts locks this.
//
// Consolidating this closed a real divergence: process-import used to have its own inline
// 'fuzzy' matcher that did a plain substring check (`norm.includes(token)`), while the
// RuleEditorDialog preview (src/lib/userRules.ts) required an exact whole-token match
// (`descTokens.has(token)`). A rule's preview count could silently disagree with what it
// actually matched on the next import. Both now call the same `ruleMatchesDescription`.

export type MatchType = 'fuzzy' | 'contains' | 'starts_with' | 'ends_with' | 'exact' | 'regex';
export type RuleSource = 'user_correction' | 'manual';

// ─── Text normalization ───

export function normalize(raw: string): string {
  return raw
    .toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // strip accents
    .replace(/[^A-Z0-9\s]/g, ' ')                       // non-alphanum → space
    .replace(/\s+/g, ' ')                                // collapse spaces
    .trim();
}

// ─── Stopwords / generic banking tokens ───

const GENERIC_TOKENS = new Set([
  'DE', 'LA', 'EL', 'LOS', 'LAS', 'THE', 'OF', 'IN', 'AND', 'OR', 'A', 'EN',
  'TRANSFERENCIA', 'INMEDIATA', 'PAGO', 'COMPRA', 'RECIBO',
  'CARGO', 'ABONO', 'INGRESO', 'COBRO', 'ENVIO', 'DESDE',
  'FAVOR', 'CONCEPTO', 'FACTURA', 'MOVIMIENTO', 'BIZUM',
  'PAYMENT', 'PURCHASE', 'TRANSFER', 'RECEIVED', 'SENT',
]);

// ─── Tokenization ───

export function extractTokens(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter(t => t.length >= 2);
}

export function extractKeyTokens(text: string): string[] {
  return extractTokens(text).filter(t => !GENERIC_TOKENS.has(t));
}

// ─── Rule generation ───

export function buildRuleFromCorrection(
  description: string,
  movement: string,
  category: string,
): { match_type: MatchType; pattern: string; tokens: string[] } {
  const keyTokens = extractKeyTokens(description);

  if (keyTokens.length >= 1) {
    return {
      match_type: 'fuzzy',
      pattern: keyTokens.join(' '),
      tokens: keyTokens,
    };
  }

  return {
    match_type: 'contains',
    pattern: normalize(description),
    tokens: [],
  };
}

// ─── Rule matching ───

export function ruleMatchesDescription(
  matchType: MatchType,
  pattern: string,
  tokens: string[],
  description: string,
): boolean {
  const norm = normalize(description);

  switch (matchType) {
    case 'fuzzy': {
      // All tokens must appear in the description
      const descTokens = new Set(extractTokens(description));
      return tokens.length > 0 && tokens.every(t => descTokens.has(t));
    }
    case 'contains':
      return norm.includes(normalize(pattern));
    case 'starts_with':
      return norm.startsWith(normalize(pattern));
    case 'ends_with':
      return norm.endsWith(normalize(pattern));
    case 'exact':
      return norm === normalize(pattern);
    case 'regex':
      try {
        return new RegExp(pattern, 'i').test(description);
      } catch {
        return false;
      }
    default:
      return false;
  }
}
