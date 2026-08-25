import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Minus, ArrowRightLeft, EyeOff, Lock, Unlock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
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
  closingBalance?: number | null;
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
  closingBalance,
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
  const { t } = useTranslation("common");
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
      await queryClient.invalidateQueries({ queryKey: ["tx-count", monthKey, user.id] });

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
      <div className="md:hidden sticky bottom-0 z-20 mt-auto">
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

      {/* Desktop: redesigned footer — row count, 3 summaries with dots, closing balance, lock button */}
      <div className="hidden md:sticky md:bottom-0 md:z-20 md:flex items-center gap-[20px] border-t border-[#F1F2F4] bg-[#FAFBFC] px-[20px] py-[14px]">
        <span className="text-[13px] text-[#6B7280]">
          {summary.total} {summary.total === 1 ? t("imports.row") : t("imports.rows")}
        </span>

        {/* Income summary */}
        <div className="inline-flex items-center gap-[6px]">
          <span className="w-[6px] h-[6px] rounded-full bg-[#2E9E6B] shrink-0" />
          <span className="text-[13px] text-[#6B7280] tabular-nums">
            {formatCurrency(summary.income)}
          </span>
        </div>

        {/* Expense summary */}
        <div className="inline-flex items-center gap-[6px]">
          <span className="w-[6px] h-[6px] rounded-full bg-[#E0704A] shrink-0" />
          <span className="text-[13px] text-[#6B7280] tabular-nums">
            {formatCurrency(summary.expenses)}
          </span>
        </div>

        {/* Transfer summary */}
        <div className="inline-flex items-center gap-[6px]">
          <span className="w-[6px] h-[6px] rounded-full bg-[#B4BAC3] shrink-0" />
          <span className="text-[13px] text-[#6B7280] tabular-nums">
            {summary.transfers}
          </span>
        </div>

        {/* Closing balance + lock button — pushed right */}
        <div className="ml-auto inline-flex items-center gap-[16px]">
          {closingBalance != null && (
            <span className="text-[13px] text-[#6B7280]">
              {t("imports.closingBalance")}{" "}
              <span className="font-semibold text-[#0C0D0E] tabular-nums">
                {formatCurrency(closingBalance)}
              </span>
            </span>
          )}

          {rightSlot}
        </div>
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
