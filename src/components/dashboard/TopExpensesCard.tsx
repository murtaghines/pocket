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

  const items = topExpenses.slice(0, 5);
  const hasData = items.length > 0;

  if (!hasData) {
    return (
      <Card variant="bento">
        <CardHeader className="px-[22px] pt-[16px] pb-2">
          <CardTitle>
            {t('topExpenses.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-[22px] pb-[20px]">
          <EmptyState height="h-[220px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="bento" className="flex flex-col h-full overflow-hidden">
      <CardHeader className="px-[14px] pt-3 pb-2 md:px-5 md:pt-[16px] shrink-0">
        <CardTitle>
          {t('topExpenses.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-[14px] pb-3 pt-0 md:px-5 md:pb-[20px] flex-1 min-h-0 flex flex-col justify-evenly">
        {items.map((expense, index) => (
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
                <p className="text-[12.5px] font-medium truncate text-foreground">{expense.description}</p>
                <p className="text-[12px] text-muted-foreground">
                  {formatDayMonth(expense.date)} · {getCategoryLabel(expense.category)}
                </p>
              </div>
              <span className="text-[13px] font-medium tabular-nums text-foreground flex-shrink-0">
                {formatCurrency(-expense.amount)}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
