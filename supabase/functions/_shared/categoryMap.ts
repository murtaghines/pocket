// Category-slug resolution: maps the advanced categorizer's extended category set down to
// the app-level slugs that exist in the `categories` table, and enforces that a slug is valid
// for its movement. Extracted from process-import so it can be unit-tested
// (tests/categoryMap.test.ts) — this is the last hop before a category reaches the DB, so a
// gap here means a transaction lands under the wrong (or a non-existent) category.

export type MovementType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

// ========== CATEGORY SLUGS BY MOVEMENT (app-level) ==========
export const INCOME_SLUGS = ['salary', 'refunds', 'transfers', 'other_income', 'investment', 'freelance', 'rents'];
export const EXPENSE_SLUGS = ['housing', 'groceries', 'restaurants', 'transport', 'health', 'entertainment', 'shopping', 'education', 'subscriptions', 'travel', 'sports', 'other_expense', 'pets'];
export const TRANSFER_SLUGS = ['own_transfer', 'to_investment', 'from_investment', 'to_joint_account', 'from_joint_account'];

// ========== EXTENDED → APP CATEGORY MAPPING ==========
// The advanced categorizer uses more categories than the app.
// This maps extended categories to app-level categories.
export const CATEGORY_SLUG_MAP: Record<string, string> = {
  // Income extended → app
  'investments_income': 'investment',
  'rental_income': 'rents',
  'transfers_in': 'transfers',
  'gifts_received': 'other_income',
  'sales': 'other_income',
  // Expense extended → app
  'gifts_given': 'other_expense',
  'insurance': 'other_expense',
  'family': 'other_expense',
  'donations': 'other_expense',
  'personal_services': 'other_expense',
  'taxes': 'other_expense',
};

/** Map an extended category slug to an app-level slug. */
export function mapCategorySlug(slug: string): string {
  // Handle custom_ prefixed categories from the categorizer
  if (slug.startsWith('custom_')) return slug;
  return CATEGORY_SLUG_MAP[slug] || slug;
}

/**
 * Resolve a raw category slug to a valid app slug for the given movement. Falls back to the
 * generic `other_*` / `own_transfer` bucket when the slug isn't valid for that movement.
 */
export function validateCategorySlug(slug: string | null, movement: MovementType): string {
  if (!slug) {
    switch (movement) {
      case 'INCOME': return 'other_income';
      case 'EXPENSE': return 'other_expense';
      case 'TRANSFER': return 'own_transfer';
    }
  }

  const normalizedSlug = slug!.toLowerCase().replace(/\s+/g, '_');
  // Map extended categories to app categories
  const mappedSlug = mapCategorySlug(normalizedSlug);

  // Custom user-defined categories (custom_*) live in profiles.custom_category_rules, not in
  // the categories table. They're resolved to their id downstream via userContext, so let the
  // slug pass through here — otherwise every custom category silently demotes to other_*.
  if (mappedSlug.startsWith('custom_')) return mappedSlug;

  switch (movement) {
    case 'INCOME':
      return INCOME_SLUGS.includes(mappedSlug) ? mappedSlug : 'other_income';
    case 'EXPENSE':
      return EXPENSE_SLUGS.includes(mappedSlug) ? mappedSlug : 'other_expense';
    case 'TRANSFER':
      return TRANSFER_SLUGS.includes(mappedSlug) ? mappedSlug : 'own_transfer';
  }
}
