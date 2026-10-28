const SAVINGS_RE = /\b(savings?|ahorro|ahorros)\b/i;
const INVESTMENT_RE = /\b(invest(?:ment|ments)?|rendimiento|rendimientos|fondo|fondos)\b/i;

const SAVINGS_SLUGS = new Set(['to_savings', 'from_savings']);
const INVESTMENT_SLUGS = new Set(['to_investment', 'from_investment', 'investment']);

export function getRuleCategoryWarning(
  pattern: string,
  categorySlug: string,
): 'savings' | 'investment' | null {
  if (!pattern.trim()) return null;
  if (SAVINGS_RE.test(pattern) && !SAVINGS_SLUGS.has(categorySlug)) return 'savings';
  if (INVESTMENT_RE.test(pattern) && !INVESTMENT_SLUGS.has(categorySlug)) return 'investment';
  return null;
}
