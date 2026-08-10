import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { MinimalSelectContent, MinimalSelectItem } from "./MinimalSelect";
import {
  SheetPanel,
  SHEET_LABEL,
  SHEET_PILL,
  SHEET_BUTTON,
  SHEET_INPUT,
} from "./SheetPanel";
import type { Database } from "@/integrations/supabase/types";
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  TRANSFER_CATEGORIES,
  getCategoryLabel,
  getMovementLabel,
} from "@/lib/categoryTranslations";

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
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger
              className={cn(SHEET_PILL, "focus:ring-1 focus:ring-primary [&>svg]:opacity-40")}
            >
              <SelectValue placeholder={t("imports.selectAccount", "Select")}>
                <span className="truncate font-medium">
                  {selectedAccount ? getAccountDisplayName(selectedAccount) : "—"}
                </span>
              </SelectValue>
            </SelectTrigger>
            <MinimalSelectContent>
              {accounts.map((a) => (
                <MinimalSelectItem key={a.id} value={a.id}>
                  <span className="truncate">{getAccountDisplayName(a)}</span>
                </MinimalSelectItem>
              ))}
            </MinimalSelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 min-w-0">
          <label className={SHEET_LABEL}>{t("imports.category", "Category")}</label>
          <Select value={categorySlug} onValueChange={setCategorySlug}>
            <SelectTrigger
              className={cn(SHEET_PILL, "px-4 focus:ring-1 focus:ring-primary [&>svg]:opacity-60")}
              style={{
                backgroundColor: `hsl(var(--${getCategoryColor(categorySlug)}) / 0.15)`,
                color: `hsl(var(--${getCategoryColor(categorySlug)}))`,
              }}
            >
              <SelectValue>
                <span className="flex items-center gap-1.5 font-semibold">
                  <CategoryIcon
                    iconName={getCategoryIcon(categorySlug)}
                    colorVar={getCategoryColor(categorySlug)}
                    size="sm"
                    showBackground={false}
                  />
                  <span className="truncate">{getCategoryLabel(categorySlug)}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <MinimalSelectContent>
              {availableCategories.map((slug) => (
                <MinimalSelectItem key={slug} value={slug}>
                  <CategoryIcon
                    iconName={getCategoryIcon(slug)}
                    colorVar={getCategoryColor(slug)}
                    size="sm"
                    showBackground
                  />
                  <span className="truncate">{getCategoryLabel(slug)}</span>
                </MinimalSelectItem>
              ))}
            </MinimalSelectContent>
          </Select>
        </div>
      </div>
    </SheetPanel>
  );
}
