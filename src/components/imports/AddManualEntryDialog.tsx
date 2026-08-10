import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { format } from "date-fns";
import { PillBadge } from "@/components/ui/pill-badge";
import { useAccounts } from "@/hooks/useAccounts";
import { getAccountDisplayName } from "@/lib/accountColors";
import { cn } from "@/lib/utils";
import { evalArithmetic } from "@/lib/safeMath";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import type { Database } from "@/integrations/supabase/types";
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  TRANSFER_CATEGORIES,
  getCategoryLabel,
  getMovementLabel,
} from "@/lib/categoryTranslations";

type MovementType = Database["public"]["Enums"]["movement_type"];

// Field label — 12px/500 uppercase per design system (Label/overline token).
const FIELD_LABEL = "text-xs font-medium uppercase tracking-[0.07em] text-muted-foreground";

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
  onSubmit: (entry: {
    date: string;
    description: string;
    accountId: string;
    movement: MovementType;
    categorySlug: string;
    amount: number;
    createRule: boolean;
  }) => Promise<void> | void;
}

export function AddManualEntryDialog({
  open,
  onOpenChange,
  monthKey,
  monthLabel,
  defaultMovement,
  onSubmit,
}: AddManualEntryDialogProps) {
  const { t } = useTranslation("common");
  const { accounts } = useAccounts();
  const { getCategoryIcon, getCategoryColor } = useCategoryTranslations();

  useBodyScrollLock(open);

  const [year, monthNum] = monthKey.split("-").map(Number);
  const firstDay = `${year}-${String(monthNum).padStart(2, "0")}-01`;
  const lastDayNum = new Date(year, monthNum, 0).getDate();
  const lastDay = `${year}-${String(monthNum).padStart(2, "0")}-${String(lastDayNum).padStart(2, "0")}`;

  const [date, setDate] = useState<string>(() => getSmartDefaultDate(monthKey));
  const [description, setDescription] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [movement, setMovement] = useState<MovementType>(defaultMovement || "EXPENSE");
  const [categorySlug, setCategorySlug] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amountStr, setAmountStr] = useState<string>("");
  const [submitting, setSubmitting] = useState<"save" | "rule" | null>(null);

  useEffect(() => {
    if (open) {
      setDate(getSmartDefaultDate(monthKey));
      setDescription("");
      setAccountId(accounts[0]?.id || "");
      const m = defaultMovement || "EXPENSE";
      setMovement(m);
      const list =
        m === "INCOME" ? INCOME_CATEGORIES :
        m === "TRANSFER" ? TRANSFER_CATEGORIES :
        EXPENSE_CATEGORIES;
      setCategorySlug(list[0]);
      setAmountStr("");
    }
  }, [open]);

  useEffect(() => {
    const list =
      movement === "INCOME" ? INCOME_CATEGORIES :
      movement === "TRANSFER" ? TRANSFER_CATEGORIES :
      EXPENSE_CATEGORIES;
    setCategorySlug(list[0]);
  }, [movement]);

  const availableCategories =
    movement === "INCOME" ? INCOME_CATEGORIES :
    movement === "TRANSFER" ? TRANSFER_CATEGORIES :
    EXPENSE_CATEGORIES;

  const parseNum = (s: string) => {
    const sanitized = s.replace(/\s/g, "").replace(",", ".");
    const arith = evalArithmetic(sanitized);
    if (arith !== null) return arith;
    const n = parseFloat(sanitized);
    return isNaN(n) ? NaN : n;
  };

  const parsedAmount = Math.abs(parseNum(amountStr));

  const dateValid = date >= firstDay && date <= lastDay;
  const canSubmit =
    !!accountId &&
    description.trim().length > 0 &&
    !isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    dateValid &&
    !submitting;

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

  const amountColor =
    !parsedAmount || isNaN(parsedAmount)
      ? "text-muted-foreground"
      : movement === "INCOME"
        ? "text-success"
        : movement === "TRANSFER"
          ? "text-muted-foreground"
          : "text-destructive";

  const selectedAccount = accounts.find((a) => a.id === accountId);

  if (!open) return null;

  const panel = (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex flex-col bg-card transition-transform duration-300 ease-out",
        // Leave mobile nav (h-12 = 48px) + month tab strip (~52px) visible on top
        "top-[100px] md:top-0",
        open ? "translate-y-0" : "translate-y-full",
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-card border-b border-border text-center">
        <span className="text-base font-semibold text-foreground">
          {t("imports.addManualEntry", "Add manual entry")}
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 space-y-5">
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
                  "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-card text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground",
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
          <label className={FIELD_LABEL}>
            {t("imports.description", "Description")}
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("imports.descriptionPlaceholder", "e.g. Cash lunch")}
            className="h-12 rounded-full bg-muted border-0 shadow-none px-5 focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50"
            maxLength={200}
          />
        </div>

        {/* Amount + Date row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5 min-w-0">
            <label className={FIELD_LABEL}>
              {t("imports.amount", "Amount")}
            </label>
            <div className="relative">
              {movement === "EXPENSE" && (
                <span className={cn("absolute left-5 top-1/2 -translate-y-1/2 text-base font-semibold pointer-events-none", amountColor)}>−</span>
              )}
              <Input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0,00"
                className={cn(
                  "h-12 rounded-full bg-muted border-0 shadow-none tabular-nums font-semibold text-base focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50",
                  movement === "EXPENSE" ? "pl-10 pr-5" : "px-5",
                  amountColor,
                )}
              />
            </div>
          </div>
          <div className="space-y-1.5 min-w-0">
            <label className={FIELD_LABEL}>
              {t("imports.date", "Date")}
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex w-full h-12 items-center gap-2 rounded-full bg-muted px-5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
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
            <label className={FIELD_LABEL}>
              {t("imports.account", "Account")}
            </label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-12 rounded-full bg-muted border-0 shadow-none px-5 focus:ring-1 focus:ring-primary [&>svg]:opacity-40">
                <SelectValue placeholder={t("imports.selectAccount", "Select")}>
                  <span className="text-sm font-medium truncate">
                    {selectedAccount ? getAccountDisplayName(selectedAccount) : "—"}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {getAccountDisplayName(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 min-w-0">
            <label className={FIELD_LABEL}>
              {t("imports.category", "Category")}
            </label>
            <Select value={categorySlug} onValueChange={setCategorySlug}>
              <SelectTrigger className="h-12 rounded-full bg-muted border-0 shadow-none px-4 focus:ring-1 focus:ring-primary [&>svg]:opacity-40 overflow-visible">
                <SelectValue>
                  <PillBadge colorVar={getCategoryColor(categorySlug)} className="text-[11px] py-0.5 overflow-visible">
                    <CategoryIcon
                      iconName={getCategoryIcon(categorySlug)}
                      colorVar={getCategoryColor(categorySlug)}
                      size="sm"
                      showBackground={false}
                    />
                    <span className="truncate">{getCategoryLabel(categorySlug)}</span>
                  </PillBadge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((slug) => (
                  <SelectItem key={slug} value={slug}>
                    <div className="flex items-center gap-2">
                      <CategoryIcon
                        iconName={getCategoryIcon(slug)}
                        colorVar={getCategoryColor(slug)}
                        size="sm"
                        showBackground
                      />
                      {getCategoryLabel(slug)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-6 pt-3 bg-card border-t border-border space-y-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-12 rounded-full font-semibold text-base"
            onClick={() => onOpenChange(false)}
            disabled={!!submitting}
          >
            {t("imports.cancel", "Cancel")}
          </Button>
          <Button
            className="flex-1 h-12 rounded-full font-semibold text-base"
            onClick={() => handleSubmit(false)}
            disabled={!canSubmit}
          >
            {submitting === "save" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("imports.addEntry", "Add entry")}
          </Button>
        </div>
        <Button
          variant="outline"
          className="w-full h-12 rounded-full font-semibold text-base gap-1.5"
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
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
