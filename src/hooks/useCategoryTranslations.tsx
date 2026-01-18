import { useTranslation } from 'react-i18next';
import { normalizeCategory, categoryEmojis, categoryIcons, INCOME_CATEGORIES, EXPENSE_CATEGORIES, TRANSFER_CATEGORIES } from '@/lib/categoryTranslations';

export function useCategoryTranslations() {
  const { t } = useTranslation('categories');

  // Get translated category label
  const getCategoryLabel = (slug: string): string => {
    const normalized = normalizeCategory(slug);
    
    // Check if it's an income category
    if (INCOME_CATEGORIES.includes(normalized)) {
      return t(`income.${normalized}`, normalized);
    }
    
    // Check if it's an expense category
    if (EXPENSE_CATEGORIES.includes(normalized)) {
      return t(`expense.${normalized}`, normalized);
    }
    
    // Check if it's a transfer category
    if (TRANSFER_CATEGORIES.includes(normalized)) {
      return t(`transfer.${normalized}`, normalized);
    }
    
    // Fallback: try all namespaces
    const incomeLabel = t(`income.${normalized}`, '');
    if (incomeLabel) return incomeLabel;
    
    const expenseLabel = t(`expense.${normalized}`, '');
    if (expenseLabel) return expenseLabel;
    
    const transferLabel = t(`transfer.${normalized}`, '');
    if (transferLabel) return transferLabel;
    
    return normalized;
  };

  // Get translated movement type label
  const getMovementLabel = (movement: string): string => {
    return t(`movement.${movement}`, movement);
  };

  // Get category emoji
  const getCategoryEmoji = (slug: string): string => {
    const normalized = normalizeCategory(slug);
    return categoryEmojis[normalized] || '📦';
  };

  // Get category icon name
  const getCategoryIcon = (slug: string): string => {
    const normalized = normalizeCategory(slug);
    return categoryIcons[normalized] || 'circle';
  };

  return {
    getCategoryLabel,
    getMovementLabel,
    getCategoryEmoji,
    getCategoryIcon,
    normalizeCategory,
  };
}
