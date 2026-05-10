import { Plus, Minus, ArrowRightLeft, TrendingUp } from "lucide-react";
import { Transaction } from "@/lib/mockData";
import { PillBadge, type PillTone } from "@/components/ui/pill-badge";
import { CategoryIcon } from "@/components/ui/category-icon";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { cn } from "@/lib/utils";

type MovementType = "income" | "expense" | "transfer" | "investment";

const movementBadgeTone: Record<MovementType, PillTone> = {
  income: "green",
  expense: "red",
  transfer: "neutral",
  investment: "purple",
};

const getMovementType = (transaction: Transaction): MovementType => {
  if (transaction.movement === "INCOME" || transaction.type === "income") return "income";
  if (transaction.movement === "TRANSFER" || transaction.type === "transfer") return "transfer";
  if (transaction.category === "investment" || transaction.category === "to_investment")
    return "investment";
  return "expense";
};

interface Props {
  transactions: Transaction[];
  emptyLabel: string;
}

/**
 * Mobile-only stacked card view of transactions.
 * Each card shows: icon (movement), description, category pill,
 * date (small), and amount aligned right.
 */
export function TransactionCardList({ transactions, emptyLabel }: Props) {
  const { formatCurrency, formatDate } = useLocalization();
  const { getCategoryLabel, getCategoryIcon, getCategoryColor } = useCategoryTranslations();

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">{emptyLabel}</div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {transactions.map((tx) => {
        const movementType = getMovementType(tx);
        const Icon =
          movementType === "income"
            ? Plus
            : movementType === "transfer"
              ? ArrowRightLeft
              : movementType === "investment"
                ? TrendingUp
                : Minus;
        const sign = tx.amount > 0 ? "+" : "";
        const amountClass =
          tx.amount === 0
            ? "text-muted-foreground"
            : movementType === "income"
              ? "text-success"
              : movementType === "expense"
                ? "text-destructive"
                : "text-foreground";

        return (
          <li
            key={tx.id}
            className="bg-background border border-border rounded-xl p-3 flex items-center gap-3"
          >
            {/* Movement icon */}
            <div
              className={cn(
                "shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
                movementType === "income" && "bg-success/15 text-success",
                movementType === "expense" && "bg-destructive/15 text-destructive",
                movementType === "transfer" && "bg-muted text-muted-foreground",
                movementType === "investment" && "bg-primary/15 text-primary",
              )}
            >
              <Icon className="w-4 h-4" />
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground line-clamp-1">
                {tx.description
                  .replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, "")
                  .trim()}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <PillBadge colorVar={getCategoryColor(tx.category)}>
                  <CategoryIcon
                    iconName={getCategoryIcon(tx.category)}
                    colorVar={getCategoryColor(tx.category)}
                    size="sm"
                    showBackground={false}
                  />
                  <span className="truncate max-w-[110px]">
                    {getCategoryLabel(tx.category)}
                  </span>
                </PillBadge>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {formatDate(tx.date)}
                </span>
              </div>
            </div>

            {/* Amount */}
            <div className={cn("text-sm font-semibold whitespace-nowrap", amountClass)}>
              {sign}
              {formatCurrency(tx.amount)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
