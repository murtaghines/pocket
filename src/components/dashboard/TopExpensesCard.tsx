import { EmptyState } from "@/components/ui/empty-state";
import { Transaction } from "@/lib/mockData";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { useTranslation } from "react-i18next";

interface TopExpensesCardProps {
  transactions: Transaction[];
}

export function TopExpensesCard({ transactions }: TopExpensesCardProps) {
  const { formatCurrency } = useLocalization();
  const { t } = useTranslation('dashboard');
  const { getCategoryColor } = useCategoryTranslations();

  const topExpenses = transactions
    .filter(tx => tx.type === 'expense' && tx.category !== 'investment')
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 5);

  const hasData = topExpenses.length > 0;
  const maxAmount = hasData ? Math.abs(topExpenses[0].amount) : 1;

  return (
    <div
      className="bg-card rounded-[18px] p-[20px_22px_18px]"
      style={{ boxShadow: "0 1px 3px rgba(13,30,70,.06)" }}
    >
      <p className="text-[15px] font-semibold text-foreground mb-4">
        {t('topExpenses.title', 'Top expenses')}
      </p>

      {!hasData ? (
        <EmptyState height="h-[200px]" />
      ) : (
        <div className="flex flex-col gap-[14px]">
          {topExpenses.map((expense) => {
            const categorySlug = expense.categorySlug || expense.category;
            const colorVar = getCategoryColor(categorySlug);
            const barPct = (Math.abs(expense.amount) / maxAmount) * 100;
            return (
              <div key={expense.id}>
                <div className="flex items-center justify-between text-[13px] mb-[5px]">
                  <span className="font-[500] text-foreground truncate pr-3">
                    {expense.description}
                  </span>
                  <span className="font-[700] tabular-nums shrink-0 text-foreground">
                    {formatCurrency(Math.abs(expense.amount))}
                  </span>
                </div>
                <div className="h-[6px] rounded-[4px] bg-[#eef1f5]">
                  <div
                    className="h-[6px] rounded-[4px] transition-all"
                    style={{
                      width: `${barPct}%`,
                      backgroundColor: `hsl(var(${colorVar}))`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
