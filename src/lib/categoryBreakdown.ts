import { getCategoryLabel, categoryColors as categoryColorVars } from "@/lib/categoryTranslations";
import { dateInRange } from "@/lib/analytics";
import type { Category, Transaction } from "@/lib/mockData";

/** Resolves a category slug's brand color from the CSS custom property it's bound to. */
export function getCategoryHslColor(slug: string): string {
  const varName = categoryColorVars[slug];
  if (!varName) return "hsl(220, 10%, 55%)";
  if (typeof window !== "undefined") {
    const value = getComputedStyle(document.documentElement).getPropertyValue(`--${varName}`).trim();
    if (value) return `hsl(${value})`;
  }
  return "hsl(220, 10%, 55%)";
}

export interface CategoryBreakdownPoint {
  name: string;
  value: number;
  category: Category;
  color: string;
  previousValue?: number;
}

/**
 * Category totals for transactions inside `range` matching `filterFn` (typically `isExpense` or
 * `isIncome`), converted to the user's currency. Used by the Week/Year tabs — the Month tab keeps
 * its own inline copy of this logic unchanged.
 */
export function categoryBreakdownForRange(
  transactions: Transaction[],
  range: { start: string; end: string } | null,
  filterFn: (t: Transaction) => boolean,
  convert: (n: number) => number,
): CategoryBreakdownPoint[] {
  if (!range) return [];
  const totals: Record<string, number> = {};
  transactions
    .filter((t) => dateInRange(t.date, range) && filterFn(t))
    .forEach((t) => {
      const key = t.categorySlug || t.category;
      totals[key] = (totals[key] || 0) + Math.abs(t.amount);
    });
  return Object.entries(totals).map(([slug, value]) => ({
    name: getCategoryLabel(slug),
    value: Math.round(convert(value) * 100) / 100,
    category: slug as Category,
    color: getCategoryHslColor(slug),
  }));
}
