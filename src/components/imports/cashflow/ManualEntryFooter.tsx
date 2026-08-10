import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Minus, ArrowRightLeft, EyeOff, PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useLocalization } from "@/hooks/useLocalization";
import { useToast } from "@/hooks/use-toast";
import { buildRuleFromCorrection } from "@/lib/userRules";
import { buildManualFingerprint } from "@/lib/transactionSource";
import { getCategoryLabel } from "@/lib/categoryTranslations";
import { AddManualEntryDialog } from "../AddManualEntryDialog";
import type { MovementType } from "./types";

export interface ManualEntryFooterProps {
  monthKey: string;
  monthLabel: string;
  isLocked: boolean;
  summary: {
    total: number;
    income: number;
    expenses: number;
    transfers: number;
    hidden?: number;
  };
  rightSlot?: React.ReactNode;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
  defaultMovement?: MovementType;
}

export function ManualEntryFooter({
  monthKey,
  monthLabel,
  isLocked,
  summary,
  rightSlot,
  externalOpen,
  onExternalOpenChange,
  defaultMovement,
}: ManualEntryFooterProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { accounts } = useAccounts();
  const { categories } = useCategories("CASHFLOW");
  const { formatCurrency } = useLocalization();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    onExternalOpenChange?.(v);
  };

  const handleSubmit = async (entry: {
    date: string;
    description: string;
    accountId: string;
    movement: MovementType;
    categorySlug: string;
    amount: number;
    createRule: boolean;
  }) => {
    if (!user) return;
    try {
      // Resolve or create CASHFLOW period for this month
      let periodId: string | null = null;
      const { data: existingPeriod } = await supabase
        .from("periods")
        .select("id")
        .eq("user_id", user.id)
        .eq("month_key", monthKey)
        .eq("domain", "CASHFLOW")
        .maybeSingle();
      if (existingPeriod) {
        periodId = existingPeriod.id;
      } else {
        const { data: newPeriod } = await supabase
          .from("periods")
          .insert({ user_id: user.id, month_key: monthKey, domain: "CASHFLOW", status: "OPEN" })
          .select("id")
          .single();
        periodId = newPeriod?.id ?? null;
      }

      const account = accounts.find((a) => a.id === entry.accountId);
      const category = categories.find((c) => c.slug === entry.categorySlug);
      const sign = entry.movement === "EXPENSE" ? -1 : 1;
      const signedAmount = sign * Math.abs(entry.amount);
      const cleanDesc = entry.description.trim();
      const descNorm = cleanDesc.toLowerCase();
      // Manual entries have no source file, so we mint a unique fingerprint/row-hash to
      // satisfy the NOT NULL dedup key without colliding with imported rows. The
      // `manual-` prefix is also what marks the row as user-created for the rest of
      // the app (see lib/transactionSource.ts).
      const uniqHash = buildManualFingerprint(user.id);

      const { error: insertError } = await supabase.from("transactions").insert({
        user_id: user.id,
        domain: "CASHFLOW",
        date: entry.date,
        description: cleanDesc,
        description_norm: descNorm,
        description_clean: cleanDesc,
        amount: signedAmount,
        currency: account?.currency_base || "EUR",
        movement: entry.movement,
        category: entry.categorySlug,
        category_id: category?.id || null,
        account_id: entry.accountId,
        period_id: periodId,
        // Deliberately NOT linked to the month's statement, even when one exists:
        // a manual entry isn't part of that file, and deleteImport() deletes every
        // transaction carrying the import_id — which used to take the user's own
        // entries down with the file.
        import_id: null,
        category_source: "MANUAL",
        categorized_by: "user",
        user_corrected: true,
        is_hidden: false,
        fingerprint: uniqHash,
        source_row_hash: uniqHash,
      });

      if (insertError) throw insertError;

      await queryClient.invalidateQueries({ queryKey: ["month-transactions-inline", monthKey, user.id] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });

      if (entry.createRule && cleanDesc) {
        const built = buildRuleFromCorrection(cleanDesc, entry.movement, entry.categorySlug);
        const { data: existing } = await supabase
          .from("user_rules")
          .select("id")
          .eq("user_id", user.id)
          .eq("pattern", built.pattern)
          .eq("category", entry.categorySlug)
          .eq("is_active", true)
          .limit(1);

        if (existing && existing.length > 0) {
          toast({ title: "Entry added", description: "Rule already exists for this pattern", duration: 3000 });
        } else {
          const { error: ruleError } = await supabase.from("user_rules").insert({
            user_id: user.id,
            source: "manual",
            match_type: built.match_type,
            pattern: built.pattern,
            tokens: built.tokens,
            movement: entry.movement,
            category: entry.categorySlug,
            confidence: 0.99,
            original_description: cleanDesc,
            is_active: true,
          });
          if (ruleError) {
            toast({ title: "Entry added", description: "Couldn't save rule: " + ruleError.message, variant: "destructive" });
          } else {
            await queryClient.invalidateQueries({ queryKey: ["user_rules"] });
            toast({
              title: "Entry added",
              description: `Rule saved: future "${cleanDesc}" transactions will be categorized as ${getCategoryLabel(entry.categorySlug)}.`,
              duration: 3500,
            });
          }
        }
      } else {
        toast({ title: "Entry added", duration: 2500 });
      }
      setOpen(false);
    } catch (err) {
      console.error("[ManualEntryFooter] insert error", err);
      toast({
        title: "Error",
        description: "Could not add entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {/* Mobile: summary strip — sticky at bottom */}
      <div className="md:hidden sticky bottom-0 z-20">
        <div className="flex items-center px-4 py-2 gap-3 border-t border-border bg-card/95 backdrop-blur">
          <div className="flex items-center gap-1">
            <Plus className="w-3 h-3 text-success" />
            <span className="text-xs font-semibold tabular-nums text-success">
              {formatCurrency(summary.income)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Minus className="w-3 h-3 text-destructive" />
            <span className="text-xs font-semibold tabular-nums text-destructive">
              {formatCurrency(summary.expenses)}
            </span>
          </div>
          {summary.transfers !== undefined && summary.transfers > 0 && (
            <div className="flex items-center gap-1">
              <ArrowRightLeft className="w-3 h-3 text-warning" />
              <span className="text-xs font-semibold tabular-nums text-warning">
                {summary.transfers}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Desktop: full sticky footer bar */}
      <div className="hidden md:sticky md:bottom-0 md:z-20 md:flex md:flex-wrap md:items-center md:gap-3 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-4 py-3 text-sm shadow-[0_-2px_8px_-4px_rgba(0,0,0,0.08)]">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary disabled:opacity-50"
          onClick={() => setOpen(true)}
          disabled={isLocked}
          title={isLocked ? "Unlock the month to add entries" : "Add a manual entry (cash, etc.)"}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Add entry
        </Button>
        <span className="text-border">|</span>
        <div className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="tabular-nums font-medium text-foreground">{summary.total}</span>
          row{summary.total !== 1 ? "s" : ""}
        </div>
        <div className="inline-flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-success" />
          <span className="text-success font-semibold tabular-nums">
            {formatCurrency(summary.income)}
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5">
          <Minus className="w-3.5 h-3.5 text-destructive" />
          <span className="text-destructive font-semibold tabular-nums">
            {formatCurrency(summary.expenses)}
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5">
          <ArrowRightLeft className="w-3.5 h-3.5 text-warning" />
          <span className="text-warning font-semibold tabular-nums">
            {summary.transfers} transfer{summary.transfers !== 1 ? "s" : ""}
          </span>
        </div>
        {summary.hidden !== undefined && summary.hidden > 0 && (
          <div className="inline-flex items-center gap-1.5 text-muted-foreground">
            <EyeOff className="w-3.5 h-3.5" />
            <span className="tabular-nums">
              {summary.hidden} excluded from analysis
            </span>
          </div>
        )}
        {rightSlot && (
          <div className="ml-auto inline-flex items-center gap-3 text-sm text-muted-foreground">
            {rightSlot}
          </div>
        )}
      </div>

      <AddManualEntryDialog
        open={open}
        onOpenChange={setOpen}
        monthKey={monthKey}
        monthLabel={monthLabel}
        defaultMovement={defaultMovement}
        onSubmit={handleSubmit}
      />
    </>
  );
}
