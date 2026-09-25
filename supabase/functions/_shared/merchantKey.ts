// Merchant key extraction for the global learning merchant dictionary (merchant_categories).
//
// `merchantKey()` turns a raw bank description into a stable, normalized key for a *merchant*
// (e.g. "COMPRA TARJETA *1234 MERCADONA" → "MERCADONA"), or returns null when the description is
// NOT a merchant purchase — person-to-person payments (Bizum, "payment to: NAME", "To NAME"),
// own-account/pocket transfers, and anything that mentions the user's own name. This is the
// privacy linchpin: only genuine merchant names ever enter the global (cross-user) dictionary,
// never a person's name.
//
// Pure module (unit-tested in tests/merchantKey.test.ts). Reuses the categorizer's normalizer.

import { normalize, extractTokens } from './categorizer.ts';

// Payment-method / channel noise stripped from the front of a key so the merchant is what's left.
const GENERIC_TOKENS = new Set<string>([
  'COMPRA', 'PAGO', 'MOVIL', 'TARJETA', 'TARJ', 'CARD', 'PAYMENT', 'POS', 'COM', 'WWW',
  'ONLINE', 'REV', 'SUMUP', 'PAYPAL', 'PP', 'SP', 'CONTACTLESS', 'RECURRENTE', 'DEBITO', 'CREDITO',
]);

// Descriptions that are person-to-person payments or own-account/pocket transfers — never a
// merchant, and often carrying a person's name → must be skipped entirely.
const NON_MERCHANT_RE =
  /\b(bizum|payment\s+(to|from)|transfer\s+(to|from)|rendimientos\s+diarios|instant\s+access|savings\s+challenge|to\s+savings|from\s+savings|net\s+interest|traspaso|a\s+favor\s+de)\b|^\s*(to|from)\s+\S/i;

/**
 * A stable merchant key, or null when the description isn't a categorizable merchant purchase.
 * @param descriptionRaw raw bank description
 * @param userName the account owner's name (to reject own-name transfers), if known
 */
export function merchantKey(
  descriptionRaw: string,
  userName?: { firstName?: string | null; lastName?: string | null },
): string | null {
  const raw = (descriptionRaw || '').trim();
  if (raw.length < 2) return null;
  if (NON_MERCHANT_RE.test(raw)) return null;

  // The user's own full name in the description → an own transfer, not a merchant.
  if (
    userName?.firstName && userName?.lastName &&
    userName.firstName.length >= 3 && userName.lastName.length >= 3
  ) {
    const dn = ` ${normalize(raw)} `;
    if (dn.includes(` ${normalize(userName.firstName)} `) && dn.includes(` ${normalize(userName.lastName)} `)) {
      return null;
    }
  }

  // Revolut appends the transaction city as "Merchant*CITY" ("Hotel*BARCELONA",
  // "Flixbus*Munchen"). Strip that trailing token so the same merchant in two cities keys the same.
  const cleaned = raw.replace(/\*[^\s*]+\s*$/, '').trim();
  const tokens = extractTokens(cleaned).filter((t) => !GENERIC_TOKENS.has(t));
  if (tokens.length === 0) return null;

  const key = tokens.slice(0, 2).join(' ').trim();
  if (key.length < 3) return null;
  return key;
}
