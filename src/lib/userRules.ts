/**
 * userRules.ts — Client-side rule generation from transaction corrections.
 * 
 * When a user edits a transaction's movement/category in My Data,
 * this module generates a learned rule and provides matching logic
 * for retroactive application.
 */

export type MatchType = 'fuzzy' | 'contains' | 'starts_with' | 'exact' | 'regex';
export type RuleSource = 'user_correction' | 'manual';

export interface UserRule {
  id: string;
  user_id: string;
  source: RuleSource;
  match_type: MatchType;
  pattern: string;
  tokens: string[];
  movement: string;
  category: string;
  confidence: number;
  created_at: string;
  applied_count: number;
  last_applied_at: string | null;
  original_description: string | null;
  is_active: boolean;
}

// ─── Text normalization ───

export function normalize(raw: string): string {
  return raw
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // strip accents
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
