import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReviewQueue, type ReviewGroup } from "@/hooks/useReviewQueue";
import { useCategorizationRules } from "@/hooks/useCategorizationRules";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { useLocalization } from "@/hooks/useLocalization";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Tables"]["categories"]["Row"];

interface Props {
  incomeCategories: Category[];
  expenseCategories: Category[];
  transferCategories: Category[];
}

const movementLabel = (m: string) => (m === "INCOME" ? "Income" : m === "TRANSFER" ? "Transfer" : "Expense");

export function ReviewQueueSection({ incomeCategories, expenseCategories, transferCategories }: Props) {
  const { data: groups = [], isLoading } = useReviewQueue();
  const { addRule } = useCategorizationRules();
  const { getCategoryLabel } = useCategoryTranslations();
  const { formatCurrency } = useLocalization();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<Record<string, string>>({});

  const visible = groups.filter((g) => !dismissed.has(g.key));
  if (isLoading || visible.length === 0) return null;

  const categoriesForMovement = (movement: string) => {
    if (movement === "INCOME") return incomeCategories;
    if (movement === "TRANSFER") return transferCategories;
    return expenseCategories;
  };

  const handleCreate = (g: ReviewGroup) => {
    const categoryId = selectedCategory[g.key];
    if (!categoryId) return;
    addRule.mutate(
      { category_id: categoryId, pattern: g.pattern, match_type: "SMART", matchingTransactionIds: g.transactionIds },
      {
        onSuccess: () => {
          toast({
            title: `Rule created — ${g.transactionIds.length} transaction${g.transactionIds.length === 1 ? "" : "s"} updated`,
          });
          setDismissed((prev) => new Set(prev).add(g.key));
        },
      },
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60 bg-amber-500/5">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
        <span className="text-sm font-semibold text-foreground">Review queue</span>
        <span className="text-xs text-muted-foreground">— low-confidence categorizations</span>
      </div>
      <div className="divide-y divide-border/40">
        {visible.map((g) => {
          const cats = categoriesForMovement(g.movement);
          return (
            <div key={g.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0 basis-full sm:basis-0">
                <code className="text-sm font-mono text-foreground truncate block">{g.pattern}</code>
                <span className="text-xs text-muted-foreground">
                  {g.count} transactions · {movementLabel(g.movement)} · {formatCurrency(g.totalAmount)}
                </span>
              </div>
              <Select
                value={selectedCategory[g.key] || ""}
                onValueChange={(v) => setSelectedCategory((prev) => ({ ...prev, [g.key]: v }))}
              >
                <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs shrink-0">
                  <SelectValue placeholder="Assign category" />
                </SelectTrigger>
                <SelectContent>
                  {cats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {getCategoryLabel(c.slug || c.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-8 shrink-0"
                disabled={!selectedCategory[g.key] || addRule.isPending}
                onClick={() => handleCreate(g)}
              >
                Create rule
              </Button>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => setDismissed((prev) => new Set(prev).add(g.key))}
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
