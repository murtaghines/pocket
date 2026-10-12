import { useState } from "react";
import { Sparkles, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSuggestions, type Suggestion } from "@/hooks/useSuggestions";
import { useCategorizationRules } from "@/hooks/useCategorizationRules";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { useLocalization } from "@/hooks/useLocalization";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { RetroactiveApplyOptions } from "@/components/settings/RetroactiveApplyOptions";
import { filterByScope, type RetroScope } from "@/hooks/useRetroactiveApply";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Tables"]["categories"]["Row"];

interface Props {
  incomeCategories: Category[];
  expenseCategories: Category[];
  transferCategories: Category[];
}

const INITIAL_VISIBLE = 5;

export function SuggestionsSection({ incomeCategories, expenseCategories, transferCategories }: Props) {
  const { t } = useTranslation("settings");
  const { data: suggestions = [], isLoading } = useSuggestions();
  const { addRule } = useCategorizationRules();
  const { getCategoryLabel } = useCategoryTranslations();
  const { formatCurrency } = useLocalization();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<Record<string, string>>({});
  const [retroScopes, setRetroScopes] = useState<Record<string, RetroScope>>({});
  const [retroCustomSince, setRetroCustomSince] = useState<Record<string, string>>({});
  const [showAll, setShowAll] = useState(false);

  const visible = suggestions.filter((s) => !dismissed.has(s.key));
  if (isLoading || visible.length === 0) return null;

  const displayed = showAll ? visible : visible.slice(0, INITIAL_VISIBLE);
  const hasMore = visible.length > INITIAL_VISIBLE;

  const categoriesForMovement = (movement: string) => {
    if (movement === "INCOME") return incomeCategories;
    if (movement === "TRANSFER") return transferCategories;
    return expenseCategories;
  };

  const movementLabel = (m: string) =>
    m === "INCOME" ? t("categories.income") : m === "TRANSFER" ? t("categories.transfers") : t("categories.expenses");

  const handleCreate = (s: Suggestion) => {
    const categoryId = selectedCategory[s.key];
    if (!categoryId) return;
    const scope = retroScopes[s.key] || "all";
    const customSince = retroCustomSince[s.key];
    const filteredIds = filterByScope(
      s.matchedTransactions,
      scope,
      customSince ? customSince + "-01" : undefined,
    );
    addRule.mutate(
      { category_id: categoryId, pattern: s.pattern, match_type: "SMART", matchingTransactionIds: filteredIds },
      {
        onSuccess: () => {
          toast({
            title: t("categories.ruleCreated", { count: filteredIds.length }),
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
        <span className="text-sm font-semibold text-foreground">{t("categories.suggestionsTitle")}</span>
        <span className="text-xs text-muted-foreground">
          — {t("categories.suggestionsSubtitle", { count: visible.length })}
        </span>
      </div>
      <div className="divide-y divide-border/40">
        {displayed.map((s) => {
          const cats = categoriesForMovement(s.movement);
          return (
            <div key={s.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0 basis-full sm:basis-0">
                <span className="text-sm font-mono text-foreground truncate block">{s.pattern}</span>
                <span className="text-xs text-muted-foreground">
                  {s.count === 1 ? t("categories.retroCount_one", { count: s.count }) : t("categories.retroCount_other", { count: s.count })}
                  {" · "}{movementLabel(s.movement)}
                  {" · "}{formatCurrency(s.totalAmount)}
                </span>
              </div>
              <Select
                value={selectedCategory[s.key] || ""}
                onValueChange={(v) => setSelectedCategory((prev) => ({ ...prev, [s.key]: v }))}
              >
                <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs shrink-0">
                  <SelectValue placeholder={t("categories.assignCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {cats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {getCategoryLabel(c.slug || c.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCategory[s.key] && s.matchedTransactions.length > 0 && (
                <div className="basis-full sm:basis-auto">
                  <RetroactiveApplyOptions
                    transactions={s.matchedTransactions}
                    scope={retroScopes[s.key] || "all"}
                    onScopeChange={(scope) => setRetroScopes((prev) => ({ ...prev, [s.key]: scope }))}
                    customSince={retroCustomSince[s.key] || ""}
                    onCustomSinceChange={(v) => setRetroCustomSince((prev) => ({ ...prev, [s.key]: v }))}
                    compact
                  />
                </div>
              )}
              <Button
                size="sm"
                className="h-8 shrink-0"
                disabled={!selectedCategory[s.key] || addRule.isPending}
                onClick={() => handleCreate(s)}
              >
                {t("categories.createRule")}
              </Button>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => setDismissed((prev) => new Set(prev).add(s.key))}
                aria-label={t("categories.dismissSuggestion")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors border-t border-border/40"
        >
          {showAll ? (
            <>
              {t("categories.showLess")}
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              {t("categories.showAll", { count: visible.length })}
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
