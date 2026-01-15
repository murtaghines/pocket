// Category translations - English only for now
// Full i18n support will be added later

// Category labels (English)
export const categoryLabels: Record<string, string> = {
  // INCOME categories
  salary: 'Salary',
  refunds: 'Refunds',
  sales: 'Sales',
  transfers_in: 'Transfers In',
  other_income: 'Other Income',
  investments_income: 'Investment Income',
  gifts_received: 'Gifts Received',
  freelance: 'Freelance',
  rental_income: 'Rental Income',

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
  gifts_given: 'Gifts Given',
  personal_services: 'Personal Services',
  taxes: 'Taxes',
  family: 'Family',
  donations: 'Donations',
  insurance: 'Insurance',

  // TRANSFER categories
  own_transfer: 'Own Account',
  to_investment: 'To Investment',
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
  sales: 'shopping-bag',
  transfers_in: 'arrow-down-left',
  other_income: 'plus-circle',
  housing: 'home',
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
  other_expense: 'more-horizontal',
  pets: 'paw-print',
  gifts_given: 'gift',
  personal_services: 'scissors',
  taxes: 'landmark',
  family: 'users',
  donations: 'heart-handshake',
  insurance: 'shield-check',
  investments_income: 'trending-up',
  gifts_received: 'gift',
  freelance: 'laptop',
  rental_income: 'home',
  own_transfer: 'arrow-left-right',
  to_investment: 'trending-up',
};

// Category emojis for onboarding UI
export const categoryEmojis: Record<string, string> = {
  // Income
  salary: '💼',
  refunds: '↩️',
  sales: '🛒',
  transfers_in: '📥',
  other_income: '➕',
  // Expense
  housing: '🏠',
  groceries: '🛒',
  restaurants: '🍽️',
  transport: '🚗',
  health: '🏥',
  entertainment: '🎮',
  shopping: '🛍️',
  education: '📚',
  subscriptions: '📺',
  travel: '✈️',
  sports: '🏃',
  other_expense: '📦',
  pets: '🐾',
  gifts_given: '🎁',
  personal_services: '💇',
  taxes: '🏛️',
  family: '👨‍👩‍👧',
  donations: '❤️',
  insurance: '🛡️',
  investments_income: '📈',
  gifts_received: '🎁',
  freelance: '💻',
  rental_income: '🏘️',
  // Transfer
  own_transfer: '↔️',
  to_investment: '📈',
};

// Legacy slug mapping - maps old/incorrect slugs to correct ones
const legacySlugMap: Record<string, string> = {
  'investment': 'investments_income',
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
  'savings': 'to_investment',
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
export const INCOME_CATEGORIES = ['salary', 'refunds', 'sales', 'transfers_in', 'other_income', 'investments_income', 'gifts_received', 'freelance', 'rental_income'];
export const EXPENSE_CATEGORIES = ['housing', 'groceries', 'restaurants', 'transport', 'health', 'entertainment', 'shopping', 'education', 'subscriptions', 'travel', 'sports', 'other_expense', 'pets', 'gifts_given', 'personal_services', 'taxes', 'family', 'donations', 'insurance'];
export const TRANSFER_CATEGORIES = ['own_transfer', 'to_investment'];

// Default selected categories for new users
export const DEFAULT_INCOME_CATEGORIES = ['salary', 'refunds', 'freelance', 'other_income'];
export const DEFAULT_EXPENSE_CATEGORIES = ['housing', 'groceries', 'restaurants', 'transport', 'health', 'entertainment', 'shopping', 'subscriptions', 'sports', 'taxes', 'other_expense'];
