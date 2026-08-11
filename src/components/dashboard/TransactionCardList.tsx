import { Transaction } from "@/lib/mockData";
import { type PillTone } from "@/components/ui/pill-badge";
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
    <ul className="divide-y divide-border/60">
      {transactions.map((tx) => {
        const movementType = getMovementType(tx);
        // Sign follows the movement, not the stored number: transfers move money
        // between your own accounts, so they carry none.
        const sign =
          tx.amount === 0 || movementType === "transfer"
            ? ""
            : movementType === "income"
              ? "+"
              : "−";
        const amountClass =
          tx.amount === 0
            ? "text-muted-foreground"
            : movementType === "income"
              ? "text-success"
              : movementType === "expense"
                ? "text-destructive"
                : "text-muted-foreground";

        return (
          <li
            key={tx.id}
            className="flex items-center gap-3 py-3 px-1 -mx-1 rounded-lg transition-colors hover:bg-muted/40"
          >
            {/* Category icon — the movement is already legible from the sign
                and colour of the amount, so the circle carries the category. */}
            <div
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `hsl(var(--${getCategoryColor(tx.category)}) / 0.15)` }}
              title={getCategoryLabel(tx.category)}
            >
              <CategoryIcon
                iconName={getCategoryIcon(tx.category)}
                colorVar={getCategoryColor(tx.category)}
                size="sm"
                showBackground={false}
              />
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground line-clamp-1">
                {tx.description
                  .replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, "")
                  .trim()}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                {tx.account && <span className="truncate">{tx.account}</span>}
                {tx.account && <span className="text-muted-foreground/50">&middot;</span>}
                <span className="whitespace-nowrap">{formatDate(tx.date)}</span>
              </div>
            </div>

            {/* Amount */}
            <div className={cn("text-sm font-semibold whitespace-nowrap", amountClass)}>
              {sign}
              {formatCurrency(Math.abs(tx.amount))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
