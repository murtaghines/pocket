// Category translations - English only for now
// Full i18n support will be added later
//
// NOTE: `useCategoryTranslations` (backed by i18n/locales/{en,es}/categories.json) is the
// translated path for anything user-facing that needs es/en parity. `getCategoryLabel` /
// `getMovementLabel` below are still live — imports.tsx / MonthReviewModal / useTransactions /
// Index.tsx import them directly rather than via the hook, hardcoded to English. Not dead code:
// confirmed via grep before restoring (were mistakenly deleted in Fase 3 cleanup, 2026-07-11).

// Category labels (English)
export const categoryLabels: Record<string, string> = {
  // INCOME categories
  salary: 'Salary',
  refunds: 'Refunds',
  transfers: 'Transfers',
  other_income: 'Other',
  investment: 'Investment',
  freelance: 'Freelance',
  rents: 'Rents',

  // EXPENSE categories
  housing: 'Housing',
  groceries: 'Groceries',
  restaurants: 'Restaurants',
  transport: 'Transport',
  health: 'Health',
  entertainment: 'Entertainment',
  shopping: 'Shopping',
  education: 'Education',
  subscriptions: 'Subscriptions',
  travel: 'Travel',
  sports: 'Sports',
  other_expense: 'Other',
  pets: 'Pets',
  taxes: 'Taxes',
  insurance: 'Insurance',
  donations: 'Donations',

  // TRANSFER categories
  own_transfer: 'To Myself',
  from_myself: 'From Myself',
  to_investment: 'To Investment',
  from_investment: 'From Investment',
  to_joint_account: 'To Joint Account',
  from_joint_account: 'From Joint Account',
  to_savings: 'To Savings',
  from_savings: 'From Savings',
};

// Movement type labels
export const movementLabels: Record<string, string> = {
  INCOME: 'Income',
  EXPENSE: 'Expense',
  TRANSFER: 'Transfer',
};

// Category icons (matching lucide-react icon names)
export const categoryIcons: Record<string, string> = {
  salary: 'briefcase',
  refunds: 'rotate-ccw',
  transfers: 'arrow-down-left',
  other_income: 'ellipsis',
  housing: 'house',
  groceries: 'shopping-cart',
  restaurants: 'utensils',
  transport: 'car',
  health: 'heart-pulse',
  entertainment: 'gamepad-2',
  shopping: 'shopping-bag',
  education: 'graduation-cap',
  subscriptions: 'repeat',
  travel: 'plane',
  sports: 'dumbbell',
  other_expense: 'ellipsis',
  pets: 'paw-print',
  taxes: 'landmark',
  insurance: 'shield-check',
  donations: 'heart-handshake',
  investment: 'trending-up',
  freelance: 'laptop',
  rents: 'house',
  own_transfer: 'arrow-left-right',
  from_myself: 'arrow-left-right',
  to_investment: 'trending-up',
  from_investment: 'trending-down',
  to_joint_account: 'users',
  from_joint_account: 'users',
  to_savings: 'piggy-bank',
  from_savings: 'piggy-bank',
};

// Category colors (CSS variable names)
export const categoryColors: Record<string, string> = {
  // Income
  salary: 'category-salary',
  refunds: 'category-refunds',
  transfers: 'category-transfers',
  other_income: 'category-other-income',
  investment: 'category-investment',
  freelance: 'category-freelance',
  rents: 'category-rents',
  // Expense
  housing: 'category-housing',
  groceries: 'category-groceries',
  restaurants: 'category-restaurants',
  transport: 'category-transport',
  health: 'category-health',
  entertainment: 'category-entertainment',
  shopping: 'category-shopping',
  education: 'category-education',
  subscriptions: 'category-subscriptions',
  travel: 'category-travel',
  sports: 'category-sports',
  other_expense: 'category-other-expense',
  pets: 'category-pets',
  taxes: 'category-taxes',
  insurance: 'category-insurance',
  donations: 'category-donations',
  // Transfer
  own_transfer: 'category-own-transfer',
  from_myself: 'category-from-myself',
  to_investment: 'category-to-investment',
  from_investment: 'category-from-investment',
  to_joint_account: 'category-to-joint-account',
  from_joint_account: 'category-from-joint-account',
  to_savings: 'category-to-savings',
  from_savings: 'category-from-savings',
};

// Raw HSL values mirroring the CSS variables in index.css (.dashboard-theme).
// Used by JS code that needs to compute alpha channels on category colors.
export const categoryHslValues: Record<string, string> = {
  'category-salary': '47 100% 57%',
  'category-refunds': '200 85% 55%',
  'category-transfers': '216 100% 55%',
  'category-other-income': '220 10% 55%',
  'category-investment': '216 75% 42%',
  'category-freelance': '260 60% 62%',
  'category-rents': '35 90% 60%',
  'category-housing': '14 80% 58%',
  'category-groceries': '145 55% 42%',
  'category-restaurants': '22 95% 58%',
  'category-transport': '210 80% 55%',
  'category-health': '355 70% 55%',
  'category-entertainment': '280 65% 60%',
  'category-shopping': '240 65% 62%',
  'category-education': '190 80% 42%',
  'category-subscriptions': '250 55% 55%',
  'category-travel': '170 70% 38%',
  'category-sports': '95 55% 38%',
  'category-other-expense': '220 10% 55%',
  'category-pets': '30 85% 55%',
  'category-taxes': '52 60% 44%',
  'category-insurance': '305 50% 52%',
  'category-donations': '340 58% 52%',
  'category-own-transfer': '220 12% 50%',
  'category-from-myself': '220 10% 65%',
  'category-to-investment': '216 75% 42%',
  'category-from-investment': '216 60% 55%',
  'category-to-joint-account': '200 85% 50%',
  'category-from-joint-account': '200 70% 58%',
  'category-to-savings': '160 55% 40%',
  'category-from-savings': '160 45% 52%',
};

// Legacy slug mapping - maps old/incorrect slugs to correct ones
const legacySlugMap: Record<string, string> = {
  'investments_income': 'investment',
  'rental_income': 'rents',
  'transfers_in': 'own_transfer',
  'gifts_received': 'other_income',
  'sales': 'other_income',
  'gifts_given': 'other_expense',
  'family': 'other_expense',
  'personal_services': 'other_expense',
  'income': 'other_income',
  'other': 'other_expense',
  'food': 'groceries',
  'leisure': 'entertainment',
  'transfer': 'own_transfer',
  'bills': 'housing',
  'utilities': 'housing',
  'gas': 'transport',
  'fuel': 'transport',
  'uber': 'transport',
  'taxi': 'transport',
  'gym': 'sports',
  'pharmacy': 'health',
  'doctor': 'health',
  'netflix': 'subscriptions',
  'spotify': 'subscriptions',
  'amazon': 'shopping',
  'supermarket': 'groceries',
  'mercadona': 'groceries',
  'carrefour': 'groceries',
  'lidl': 'groceries',
  'restaurant': 'restaurants',
  'cafe': 'restaurants',
  'bar': 'restaurants',
  'hotel': 'travel',
  'flight': 'travel',
  'airbnb': 'travel',
  'rent': 'housing',
  'mortgage': 'housing',
  'electricity': 'housing',
  'water': 'housing',
  'internet': 'housing',
  'phone': 'subscriptions',
  'savings': 'to_savings',
};

// Normalize a category slug (handle legacy values)
export function normalizeCategory(slug: string): string {
  if (!slug) return 'other_expense';
  const lower = slug.toLowerCase().trim();
  return legacySlugMap[lower] || lower;
}

// Helper to get category label
export function getCategoryLabel(slug: string): string {
  const normalized = normalizeCategory(slug);
  return categoryLabels[normalized] || slug;
}

// Helper to get movement label
export function getMovementLabel(movement: string): string {
  return movementLabels[movement] || movement;
}

// Categories by movement type (for onboarding)
export const INCOME_CATEGORIES = ['salary', 'refunds', 'other_income', 'investment', 'freelance', 'rents'];
export const EXPENSE_CATEGORIES = ['housing', 'groceries', 'restaurants', 'transport', 'health', 'entertainment', 'shopping', 'education', 'subscriptions', 'travel', 'sports', 'other_expense', 'pets', 'taxes', 'insurance', 'donations'];
export const TRANSFER_CATEGORIES = ['own_transfer', 'from_myself', 'to_investment', 'from_investment', 'to_joint_account', 'from_joint_account', 'to_savings', 'from_savings'];
export const TRANSFER_OUTGOING = ['own_transfer', 'to_investment', 'to_joint_account', 'to_savings'];
export const TRANSFER_INCOMING = ['from_myself', 'from_investment', 'from_joint_account', 'from_savings'];

// Default selected categories for new users
export const DEFAULT_INCOME_CATEGORIES = ['salary', 'refunds', 'freelance', 'other_income'];
export const DEFAULT_EXPENSE_CATEGORIES = ['housing', 'groceries', 'restaurants', 'transport', 'health', 'entertainment', 'shopping', 'subscriptions', 'sports', 'other_expense'];
