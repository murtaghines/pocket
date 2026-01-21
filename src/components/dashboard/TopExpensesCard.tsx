import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown } from "lucide-react";
import { Transaction } from "@/lib/mockData";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { useTranslation } from "react-i18next";
import { CategoryIcon } from "@/components/ui/category-icon";

interface TopExpensesCardProps {
  transactions: Transaction[];
}

export function TopExpensesCard({ transactions }: TopExpensesCardProps) {
  const { formatCurrency } = useLocalization();
  const { t } = useTranslation('dashboard');
  const { getCategoryLabel, getCategoryIcon, getCategoryColor } = useCategoryTranslations();

  const topExpenses = transactions
    .filter(t => t.type === 'expense' && t.category !== 'investment')
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 5);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  const hasData = topExpenses.length > 0;

  if (!hasData) {
    return (
      <Card className="animate-slide-up" style={{ animationDelay: '500ms' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            {t('topExpenses.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">{t('common.noDataYet', { defaultValue: 'No data yet' })}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up" style={{ animationDelay: '500ms' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingDown className="w-4 h-4" />
          {t('topExpenses.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {topExpenses.map((expense) => {
          const categorySlug = expense.categorySlug || expense.category;
          return (
            <div key={expense.id} className="flex items-center gap-3">
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
                  {formatDate(expense.date)} • {getCategoryLabel(categorySlug)}
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
