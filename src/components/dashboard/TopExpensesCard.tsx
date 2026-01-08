import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown } from "lucide-react";
import { Transaction, categoryColors, Category } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { useLocalization } from "@/hooks/useLocalization";

interface TopExpensesCardProps {
  transactions: Transaction[];
}

export function TopExpensesCard({ transactions }: TopExpensesCardProps) {
  const { t, formatCurrency, language } = useLocalization();

  // Category labels using translations
  const getCategoryLabel = (category: Category): string => {
    // Try translation key first, fallback to category name
    const translationKey = `category.${category}`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : category;
  };

  // Exclude investment movements from top expenses (they're neutral movements)
  const topExpenses = transactions
    .filter(t => t.type === 'expense' && t.category !== 'investment')
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 5);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const locale = language === 'en' ? 'en-US' : language === 'pt' ? 'pt-BR' : language === 'fr' ? 'fr-FR' : language === 'it' ? 'it-IT' : language === 'de' ? 'de-DE' : 'es-ES';
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };

  return (
    <Card className="animate-slide-up" style={{ animationDelay: '500ms' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingDown className="w-4 h-4" />
          {t('dashboard.top_expenses')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {topExpenses.map((expense, index) => (
          <div 
            key={expense.id}
            className="flex items-center gap-3"
          >
            <div 
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0",
              )}
              style={{ backgroundColor: categoryColors[expense.category as Category] }}
            >
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{expense.description}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(expense.date)} • {getCategoryLabel(expense.category as Category)}
              </p>
            </div>
            <span className="text-sm font-semibold text-destructive flex-shrink-0">
              -{formatCurrency(Math.abs(expense.amount))}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
