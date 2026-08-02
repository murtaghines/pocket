import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSuggestedRules, type SuggestedRule } from "@/hooks/useSuggestedRules";
import { useCategorizationRules } from "@/hooks/useCategorizationRules";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Tables"]["categories"]["Row"];

interface Props {
  incomeCategories: Category[];
  expenseCategories: Category[];
  transferCategories: Category[];
}

const movementLabel = (m: string) => (m === "INCOME" ? "Income" : m === "TRANSFER" ? "Transfer" : "Expense");

export function SuggestedRulesSection({ incomeCategories, expenseCategories, transferCategories }: Props) {
  const { data: suggestions = [], isLoading } = useSuggestedRules();
  const { addRule } = useCategorizationRules();
  const { getCategoryLabel } = useCategoryTranslations();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<Record<string, string>>({});

  const visible = suggestions.filter((s) => !dismissed.has(s.key));
  if (isLoading || visible.length === 0) return null;

  const categoriesForMovement = (movement: string) => {
    if (movement === "INCOME") return incomeCategories;
    if (movement === "TRANSFER") return transferCategories;
    return expenseCategories;
  };

  const handleCreate = (s: SuggestedRule) => {
    const categoryId = selectedCategory[s.key];
    if (!categoryId) return;
    addRule.mutate(
      { category_id: categoryId, pattern: s.pattern, match_type: "SMART", matchingTransactionIds: s.transactionIds },
      {
        onSuccess: () => {
          toast({
            title: `Rule created — ${s.transactionIds.length} transaction${s.transactionIds.length === 1 ? "" : "s"} updated`,
          });
          setDismissed((prev) => new Set(prev).add(s.key));
        },
      },
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60 bg-primary/5">
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-semibold text-foreground">Suggested rules</span>
        <span className="text-xs text-muted-foreground">— frequently uncategorized patterns</span>
      </div>
      <div className="divide-y divide-border/40">
        {visible.map((s) => {
          const cats = categoriesForMovement(s.movement);
          return (
            <div key={s.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0 basis-full sm:basis-0">
                <code className="text-sm font-mono text-foreground truncate block">{s.pattern}</code>
                <span className="text-xs text-muted-foreground">
                  {s.count} transactions · {movementLabel(s.movement)}
                </span>
              </div>
              <Select
                value={selectedCategory[s.key] || ""}
                onValueChange={(v) => setSelectedCategory((prev) => ({ ...prev, [s.key]: v }))}
              >
                <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs shrink-0">
                  <SelectValue placeholder="Pick category" />
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
                disabled={!selectedCategory[s.key] || addRule.isPending}
                onClick={() => handleCreate(s)}
              >
                Create rule
              </Button>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => setDismissed((prev) => new Set(prev).add(s.key))}
                aria-label="Dismiss suggestion"
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
