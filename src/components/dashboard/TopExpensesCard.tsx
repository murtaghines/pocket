import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Transaction } from "@/lib/mockData";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { useTranslation } from "react-i18next";
import { CategoryIcon } from "@/components/ui/category-icon";

interface TopExpensesCardProps {
  transactions: Transaction[];
}

export function TopExpensesCard({ transactions }: TopExpensesCardProps) {
  const { formatCurrency, formatDayMonth } = useLocalization();
  const { t } = useTranslation('dashboard');
  const { getCategoryLabel, getCategoryIcon, getCategoryColor } = useCategoryTranslations();

  const topExpenses = transactions
    .filter(tx => tx.type === 'expense' && tx.category !== 'investment')
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 5);

  const hasData = topExpenses.length > 0;

  if (!hasData) {
    return (
      <Card variant="bento" className="">
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] md:text-[14px] font-semibold uppercase tracking-[0.05em] text-foreground">
            {t('topExpenses.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState height="h-[220px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="bento" className="">
      <CardHeader className="px-5 pt-[18px] pb-2">
        <CardTitle className="text-[13px] md:text-[14px] font-semibold uppercase tracking-[0.05em] text-foreground">
          {t('topExpenses.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 px-5 pb-[18px] pt-0">
        {topExpenses.map((expense, index) => {
          const categorySlug = expense.categorySlug || expense.category;
          return (
            <div
              key={expense.id}
              className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-muted/80 text-sm font-medium text-muted-foreground shrink-0">
                {index + 1}
              </div>
              <CategoryIcon
                iconName={getCategoryIcon(categorySlug)}
                colorVar={getCategoryColor(categorySlug)}
                size="md"
                showBackground
                className="flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{expense.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDayMonth(expense.date)} • {getCategoryLabel(categorySlug)}
                </p>
              </div>
              <span className="text-sm font-semibold text-destructive flex-shrink-0">
                -{formatCurrency(Math.abs(expense.amount))}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
