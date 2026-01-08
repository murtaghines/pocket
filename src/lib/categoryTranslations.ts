// Category slug translations for i18n
// These slugs match the 'slug' column in the categories table

export const categoryTranslations: Record<string, Record<string, string>> = {
  // INCOME categories
  salary: {
    es: 'Sueldo',
    en: 'Salary',
    pt: 'Salário',
    fr: 'Salaire',
    it: 'Stipendio',
    de: 'Gehalt',
  },
  refunds: {
    es: 'Reembolsos',
    en: 'Refunds',
    pt: 'Reembolsos',
    fr: 'Remboursements',
    it: 'Rimborsi',
    de: 'Rückerstattungen',
  },
  sales: {
    es: 'Ventas',
    en: 'Sales',
    pt: 'Vendas',
    fr: 'Ventes',
    it: 'Vendite',
    de: 'Verkäufe',
  },
  transfers_in: {
    es: 'Transferencias',
    en: 'Transfers In',
    pt: 'Transferências',
    fr: 'Virements',
    it: 'Trasferimenti',
    de: 'Überweisungen',
  },
  other_income: {
    es: 'Otros ingresos',
    en: 'Other Income',
    pt: 'Outras receitas',
    fr: 'Autres revenus',
    it: 'Altre entrate',
    de: 'Sonstige Einnahmen',
  },

  // EXPENSE categories
  housing: {
    es: 'Vivienda',
    en: 'Housing',
    pt: 'Moradia',
    fr: 'Logement',
    it: 'Casa',
    de: 'Wohnung',
  },
  groceries: {
    es: 'Supermercado',
    en: 'Groceries',
    pt: 'Supermercado',
    fr: 'Courses',
    it: 'Spesa',
    de: 'Lebensmittel',
  },
  restaurants: {
    es: 'Restaurantes',
    en: 'Restaurants',
    pt: 'Restaurantes',
    fr: 'Restaurants',
    it: 'Ristoranti',
    de: 'Restaurants',
  },
  transport: {
    es: 'Transporte',
    en: 'Transport',
    pt: 'Transporte',
    fr: 'Transport',
    it: 'Trasporti',
    de: 'Transport',
  },
  health: {
    es: 'Salud',
    en: 'Health',
    pt: 'Saúde',
    fr: 'Santé',
    it: 'Salute',
    de: 'Gesundheit',
  },
  entertainment: {
    es: 'Ocio',
    en: 'Entertainment',
    pt: 'Lazer',
    fr: 'Loisirs',
    it: 'Svago',
    de: 'Freizeit',
  },
  shopping: {
    es: 'Compras',
    en: 'Shopping',
    pt: 'Compras',
    fr: 'Achats',
    it: 'Acquisti',
    de: 'Einkäufe',
  },
  education: {
    es: 'Educación',
    en: 'Education',
    pt: 'Educação',
    fr: 'Éducation',
    it: 'Istruzione',
    de: 'Bildung',
  },
  subscriptions: {
    es: 'Suscripciones',
    en: 'Subscriptions',
    pt: 'Assinaturas',
    fr: 'Abonnements',
    it: 'Abbonamenti',
    de: 'Abonnements',
  },
  travel: {
    es: 'Viaje',
    en: 'Travel',
    pt: 'Viagens',
    fr: 'Voyages',
    it: 'Viaggi',
    de: 'Reisen',
  },
  other_expense: {
    es: 'Otros',
    en: 'Other',
    pt: 'Outros',
    fr: 'Autres',
    it: 'Altro',
    de: 'Sonstiges',
  },

  // TRANSFER categories
  own_transfer: {
    es: 'Propia',
    en: 'Own Account',
    pt: 'Própria',
    fr: 'Compte propre',
    it: 'Conto proprio',
    de: 'Eigenes Konto',
  },
  to_investment: {
    es: 'A inversión',
    en: 'To Investment',
    pt: 'Para investimento',
    fr: 'Vers investissement',
    it: 'A investimento',
    de: 'Zur Anlage',
  },
};

// Movement type translations
export const movementTranslations: Record<string, Record<string, string>> = {
  INCOME: {
    es: 'Ingreso',
    en: 'Income',
    pt: 'Receita',
    fr: 'Revenu',
    it: 'Entrata',
    de: 'Einnahme',
  },
  EXPENSE: {
    es: 'Gasto',
    en: 'Expense',
    pt: 'Despesa',
    fr: 'Dépense',
    it: 'Spesa',
    de: 'Ausgabe',
  },
  TRANSFER: {
    es: 'Transferencia',
    en: 'Transfer',
    pt: 'Transferência',
    fr: 'Virement',
    it: 'Trasferimento',
    de: 'Überweisung',
  },
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
  other_expense: 'more-horizontal',
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
  other_expense: '📦',
  // Transfer
  own_transfer: '↔️',
  to_investment: '📈',
};

// Helper to get translated category name
export function getCategoryLabel(slug: string, language: string = 'en'): string {
  return categoryTranslations[slug]?.[language] || categoryTranslations[slug]?.['en'] || slug;
}

// Helper to get translated movement name
export function getMovementLabel(movement: string, language: string = 'en'): string {
  return movementTranslations[movement]?.[language] || movementTranslations[movement]?.['en'] || movement;
}

// Categories by movement type (for onboarding)
export const INCOME_CATEGORIES = ['salary', 'refunds', 'sales', 'transfers_in', 'other_income'];
export const EXPENSE_CATEGORIES = ['housing', 'groceries', 'restaurants', 'transport', 'health', 'entertainment', 'shopping', 'education', 'subscriptions', 'travel', 'other_expense'];
export const TRANSFER_CATEGORIES = ['own_transfer', 'to_investment'];

// Default selected categories for new users
export const DEFAULT_INCOME_CATEGORIES = ['salary', 'refunds', 'other_income'];
export const DEFAULT_EXPENSE_CATEGORIES = ['housing', 'groceries', 'restaurants', 'transport', 'health', 'entertainment', 'shopping', 'subscriptions', 'other_expense'];
