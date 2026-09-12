import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { useTranslation } from "react-i18next";
import { CategoryIcon } from "@/components/ui/category-icon";
import type { TopExpenseRow } from "@/hooks/usePeriodAggregates";

interface TopExpensesCardProps {
  topExpenses: TopExpenseRow[];
}

export function TopExpensesCard({ topExpenses }: TopExpensesCardProps) {
  const { formatCurrency, formatDayMonth } = useLocalization();
  const { t } = useTranslation('dashboard');
  const { getCategoryLabel, getCategoryIcon, getCategoryColor } = useCategoryTranslations();

  const hasData = topExpenses.length > 0;

  if (!hasData) {
    return (
      <Card variant="bento">
        <CardHeader className="pb-2">
          <CardTitle>
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
    <Card variant="bento" className="flex flex-col h-full overflow-hidden">
      <CardHeader className="px-3 pt-3 pb-2 md:px-5 md:pt-5 shrink-0">
        <CardTitle>
          {t('topExpenses.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0 md:px-5 md:pb-5 flex-1 min-h-0 overflow-y-auto">
        {topExpenses.map((expense, index) => (
          <div key={expense.id}>
            {index > 0 && <div className="h-px bg-border" />}
            <div className="flex items-center gap-3 py-[9px]">
              <span className="text-[12px] font-medium text-muted-foreground/50 w-4 shrink-0 text-center tabular-nums">
                {index + 1}
              </span>
              <CategoryIcon
                iconName={getCategoryIcon(expense.category)}
                colorVar={getCategoryColor(expense.category)}
                size="md"
                showBackground
                className="flex-shrink-0 !w-8 !h-8 !rounded-[10px]"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-medium truncate text-foreground">{expense.description}</p>
                <p className="text-[12px] text-muted-foreground">
                  {formatDayMonth(expense.date)} · {getCategoryLabel(expense.category)}
                </p>
              </div>
              <span className="text-[13.5px] font-semibold tabular-nums text-foreground flex-shrink-0">
                -{formatCurrency(expense.amount)}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
