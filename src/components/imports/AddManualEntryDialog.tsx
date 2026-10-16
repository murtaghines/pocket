import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { Button } from "@/components/ui/button";
import {
  ArrowRightLeft,
  Plus,
  Minus,
  Loader2,
  CalendarIcon,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAccounts } from "@/hooks/useAccounts";
import { getAccountDisplayName } from "@/lib/accountColors";
import { cn } from "@/lib/utils";
import { evalArithmetic } from "@/lib/safeMath";
import { buildRuleFromCorrection } from "@/lib/userRules";
import { useRulePreview } from "@/hooks/useRulePreview";
import {
  SheetPanel,
  SHEET_LABEL,
  SHEET_PILL,
  SHEET_BUTTON,
  SHEET_INPUT,
} from "./SheetPanel";
import type { Database } from "@/integrations/supabase/types";
import { getCategoriesForMovement } from "./cashflow/helpers";

type MovementType = Database["public"]["Enums"]["movement_type"];

function getSmartDefaultDate(monthKey: string): string {
  const [year, monthNum] = monthKey.split("-").map(Number);
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === monthNum;
  if (isCurrentMonth) {
    return `${year}-${String(monthNum).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  const lastDay = new Date(year, monthNum, 0).getDate();
  return `${year}-${String(monthNum).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

interface AddManualEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthKey: string;
  monthLabel: string;
  defaultMovement?: MovementType;
  defaultAccountId?: string | null;
  onSubmit: (entry: {
    date: string;
    description: string;
    accountId: string;
    movement: MovementType;
    categorySlug: string;
    amount: number;
    createRule: boolean;
    /** Existing transactions the new rule would also match, for retroactive apply. */
    matchingTransactionIds?: string[];
  }) => Promise<void> | void;
}

export function AddManualEntryDialog({
  open,
  onOpenChange,
  monthKey,
  monthLabel,
  defaultMovement,
  defaultAccountId,
  onSubmit,
}: AddManualEntryDialogProps) {
  const { t } = useTranslation("common");
  const { accounts } = useAccounts();
  const { getCategoryLabel, getMovementLabel } = useCategoryTranslations();

  const [year, monthNum] = monthKey.split("-").map(Number);
  const firstDay = `${year}-${String(monthNum).padStart(2, "0")}-01`;
  const lastDayNum = new Date(year, monthNum, 0).getDate();
  const lastDay = `${year}-${String(monthNum).padStart(2, "0")}-${String(lastDayNum).padStart(2, "0")}`;

  const [date, setDate] = useState<string>(() => getSmartDefaultDate(monthKey));
  const [description, setDescription] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [movement, setMovement] = useState<MovementType>(defaultMovement || "EXPENSE");
  const [categorySlug, setCategorySlug] = useState<string>(getCategoriesForMovement("EXPENSE")[0]);
  const [amountStr, setAmountStr] = useState<string>("");
  const [submitting, setSubmitting] = useState<"save" | "rule" | null>(null);
  const [debouncedDescription, setDebouncedDescription] = useState<string>("");

  useEffect(() => {
    if (open) {
      setDate(getSmartDefaultDate(monthKey));
      setDescription("");
      setDebouncedDescription("");
      setAccountId(defaultAccountId ?? accounts[0]?.id ?? "");
      const m = defaultMovement || "EXPENSE";
      setMovement(m);
      setCategorySlug(getCategoriesForMovement(m)[0]);
      setAmountStr("");
    }
  }, [open]);

  // Debounced so the "would also match" preview doesn't re-query on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedDescription(description.trim()), 350);
    return () => clearTimeout(id);
  }, [description]);

  useEffect(() => {
    setCategorySlug(getCategoriesForMovement(movement)[0]);
  }, [movement]);

  const parseNum = (s: string) => {
    const sanitized = s.replace(/\s/g, "").replace(",", ".");
    const arith = evalArithmetic(sanitized);
    if (arith !== null) return arith;
    const n = parseFloat(sanitized);
    return isNaN(n) ? NaN : n;
  };

  const parsedAmount = Math.abs(parseNum(amountStr));
  const signedAmount = movement === "EXPENSE" ? -parsedAmount : parsedAmount;

  const availableCategories = getCategoriesForMovement(
    movement,
    movement === "TRANSFER" && !isNaN(parsedAmount) && parsedAmount > 0 ? signedAmount : undefined,
  );

  const dateValid = date >= firstDay && date <= lastDay;
  const canSubmit =
    !!accountId &&
    description.trim().length > 0 &&
    !isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    dateValid &&
    !submitting;

  // Same builder used by the rule-creation path itself (ManualEntryFooter → addRule) — the
  // preview shown here can never drift from what "Add + create rule" would actually match.
  const builtRule = useMemo(
    () => (debouncedDescription ? buildRuleFromCorrection(debouncedDescription, movement, categorySlug) : null),
    [debouncedDescription, movement, categorySlug],
  );
  const { matchingIds, count: matchCount, isLoading: matchLoading } = useRulePreview({
    matchType: builtRule?.match_type ?? "contains",
    pattern: builtRule?.pattern ?? "",
    tokens: builtRule?.tokens ?? [],
    movement,
    accountId: accountId || null,
    enabled: !!builtRule && builtRule.pattern.trim().length > 0,
  });

  const handleSubmit = async (createRule: boolean) => {
    if (!canSubmit) return;
    setSubmitting(createRule ? "rule" : "save");
    try {
      await onSubmit({
        date,
        description: description.trim(),
        accountId,
        movement,
        categorySlug,
        amount: parsedAmount,
        createRule,
        matchingTransactionIds: createRule ? matchingIds : undefined,
      });
    } finally {
      setSubmitting(null);
    }
  };

  const movementOptions: { value: MovementType; icon: typeof Plus; label: string }[] = [
    { value: "EXPENSE", icon: Minus, label: getMovementLabel("EXPENSE") },
    { value: "INCOME", icon: Plus, label: getMovementLabel("INCOME") },
    { value: "TRANSFER", icon: ArrowRightLeft, label: getMovementLabel("TRANSFER") },
  ];

  // Sign is implied by the movement toggle — the user only types the magnitude.
  const amountSign = movement === "EXPENSE" ? "−" : movement === "INCOME" ? "+" : null;

  const selectedAccount = accounts.find((a) => a.id === accountId);

  const footer = (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className={cn(SHEET_BUTTON, "flex-1")}
          onClick={() => onOpenChange(false)}
          disabled={!!submitting}
        >
          {t("imports.cancel", "Cancel")}
        </Button>
        <Button
          className={cn(SHEET_BUTTON, "flex-1")}
          onClick={() => handleSubmit(false)}
          disabled={!canSubmit}
        >
          {submitting === "save" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {t("imports.addEntry", "Add entry")}
        </Button>
      </div>
      <Button
        variant="outline"
        className={cn(SHEET_BUTTON, "w-full gap-1.5")}
        onClick={() => handleSubmit(true)}
        disabled={!canSubmit}
      >
        {submitting === "rule" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {t("imports.addEntryRule", "Add + create rule")}
      </Button>
      {description.trim().length > 0 && !matchLoading && matchCount > 0 && (
        <p className="text-xs text-muted-foreground text-center -mt-1">
          {matchCount === 1
            ? t("imports.manualEntryRuleMatchOne")
            : t("imports.manualEntryRuleMatch", { count: matchCount })}
        </p>
      )}
    </>
  );

  return (
    <SheetPanel
      open={open}
      onOpenChange={onOpenChange}
      title={t("imports.addManualEntry", "add transaction")}
      footer={footer}
    >
      {/* Movement toggle — pill segmented control */}
      <div className="flex rounded-full bg-muted p-1">
        {movementOptions.map((opt) => {
          const Icon = opt.icon;
          const active = movement === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMovement(opt.value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-medium transition-all",
                active ? "bg-card text-foreground shadow-sm font-semibold" : "text-muted-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className={SHEET_LABEL}>{t("imports.description", "Description")}</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("imports.descriptionPlaceholder", "e.g. Cash lunch")}
          className={SHEET_INPUT}
          maxLength={200}
        />
      </div>

      {/* Amount + Date row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5 min-w-0">
          <label className={SHEET_LABEL}>{t("imports.amount", "Amount")}</label>
          <div className="relative">
            {amountSign && (
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                {amountSign}
              </span>
            )}
            <Input
              type="text"
              inputMode="decimal"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0,00"
              className={cn(SHEET_INPUT, "tabular-nums", amountSign && "pl-10 pr-5")}
            />
          </div>
        </div>
        <div className="space-y-1.5 min-w-0">
          <label className={SHEET_LABEL}>{t("imports.date", "Date")}</label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  SHEET_PILL,
                  "flex w-full items-center gap-2 text-foreground hover:bg-accent transition-colors",
                )}
              >
                <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">
                  {format(new Date(date + "T00:00:00"), "d MMM yyyy")}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={new Date(date + "T00:00:00")}
                onSelect={(d) => {
                  if (d) {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, "0");
                    const dd = String(d.getDate()).padStart(2, "0");
                    setDate(`${y}-${m}-${dd}`);
                  }
                }}
                defaultMonth={new Date(firstDay + "T00:00:00")}
                disabled={(d) => {
                  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                  return iso < firstDay || iso > lastDay;
                }}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Account + Category row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5 min-w-0">
          <label className={SHEET_LABEL}>{t("imports.account", "Account")}</label>
          <div className="pk-select-wrap">
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className={cn(SHEET_PILL, "w-full")}
            >
              <option value="" disabled>{t("imports.selectAccount", "Select")}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{getAccountDisplayName(a)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1.5 min-w-0">
          <label className={SHEET_LABEL}>{t("imports.category", "Category")}</label>
          <div className="pk-select-wrap">
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className={cn(SHEET_PILL, "w-full")}
            >
              {availableCategories.map((slug) => (
                <option key={slug} value={slug}>{getCategoryLabel(slug)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </SheetPanel>
  );
}
