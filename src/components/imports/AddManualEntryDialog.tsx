import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerClose,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
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
  PlusCircle,
  CalendarIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { PillBadge } from "@/components/ui/pill-badge";
import { useAccounts } from "@/hooks/useAccounts";
import { useLocalization } from "@/hooks/useLocalization";
import { getAccountDisplayName } from "@/lib/accountColors";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  TRANSFER_CATEGORIES,
  getCategoryLabel,
  getMovementLabel,
} from "@/lib/categoryTranslations";

type MovementType = Database["public"]["Enums"]["movement_type"];

interface AddManualEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthKey: string;
  monthLabel: string;
  onSubmit: (entry: {
    date: string;
    description: string;
    accountId: string;
    movement: MovementType;
    categorySlug: string;
    amount: number;
  }) => Promise<void> | void;
}

export function AddManualEntryDialog({
  open,
  onOpenChange,
  monthKey,
  monthLabel,
  onSubmit,
}: AddManualEntryDialogProps) {
  const { t } = useTranslation("common");
  const { accounts } = useAccounts();
  const { getCategoryIcon, getCategoryColor } = useCategoryTranslations();
  const { formatCurrency } = useLocalization();

  const [year, monthNum] = monthKey.split("-").map(Number);
  const firstDay = `${year}-${String(monthNum).padStart(2, "0")}-01`;
  const lastDayNum = new Date(year, monthNum, 0).getDate();
  const lastDay = `${year}-${String(monthNum).padStart(2, "0")}-${String(lastDayNum).padStart(2, "0")}`;

  const [date, setDate] = useState<string>(firstDay);
  const [description, setDescription] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [movement, setMovement] = useState<MovementType>("EXPENSE");
  const [categorySlug, setCategorySlug] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amountStr, setAmountStr] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const [isShared, setIsShared] = useState(false);
  const [totalAmountStr, setTotalAmountStr] = useState<string>("");
  const [sharePercentStr, setSharePercentStr] = useState<string>("50");

  useEffect(() => {
    if (open) {
      setDate(firstDay);
      setDescription("");
      setAccountId(accounts[0]?.id || "");
      setMovement("EXPENSE");
      setCategorySlug(EXPENSE_CATEGORIES[0]);
      setAmountStr("");
      setIsShared(false);
      setTotalAmountStr("");
      setSharePercentStr("50");
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
    const n = parseFloat(s.replace(",", ".").trim());
    return isNaN(n) ? NaN : n;
  };

  const totalAmount = parseNum(totalAmountStr);
  const sharePercent = parseNum(sharePercentStr);
  const directAmount = Math.abs(parseNum(amountStr));

  const sharedAmount =
    !isNaN(totalAmount) && !isNaN(sharePercent)
      ? Math.round(Math.abs(totalAmount) * (sharePercent / 100) * 100) / 100
      : NaN;

  const parsedAmount = isShared ? sharedAmount : directAmount;

  const dateValid = date >= firstDay && date <= lastDay;
  const canSubmit =
    !!accountId &&
    description.trim().length > 0 &&
    !isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    (!isShared || (sharePercent > 0 && sharePercent <= 100)) &&
    dateValid &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const finalDescription = isShared
        ? `${description.trim()} (${sharePercent}% of ${formatCurrency(Math.abs(totalAmount))})`
        : description.trim();

      await onSubmit({
        date,
        description: finalDescription,
        accountId,
        movement,
        categorySlug,
        amount: parsedAmount,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const activeClass: Record<string, string> = {
    green: "border-success bg-success/10 text-success",
    red: "border-destructive bg-destructive/10 text-destructive",
    amber: "border-warning bg-warning/10 text-warning",
  };

  const circleClass: Record<string, string> = {
    green: "bg-success text-white",
    red: "bg-destructive text-white",
    amber: "bg-warning text-warning-foreground",
  };

  const movementOptions: { value: MovementType; icon: typeof Plus; label: string; tone: string }[] = [
    { value: "INCOME", icon: Plus, label: getMovementLabel("INCOME"), tone: "green" },
    { value: "EXPENSE", icon: Minus, label: getMovementLabel("EXPENSE"), tone: "red" },
    { value: "TRANSFER", icon: ArrowRightLeft, label: getMovementLabel("TRANSFER"), tone: "amber" },
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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerTitle className="sr-only">
          {t("imports.addManualEntry", "Add manual entry")} · {monthLabel}
        </DrawerTitle>
        <DrawerDescription className="sr-only">
          {t("imports.addManualEntryDesc", "Record a transaction that isn't on a statement")}
        </DrawerDescription>

        <div className="px-4 pt-2 pb-1">
          {/* Movement toggle — same as TransactionEditDrawer */}
          <div className="flex gap-2 mb-4">
            {movementOptions.map((opt) => {
              const Icon = opt.icon;
              const active = movement === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMovement(opt.value)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? activeClass[opt.tone] || "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  <span className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full",
                    active
                      ? circleClass[opt.tone]
                      : "bg-muted text-muted-foreground",
                  )}>
                    <Icon className="h-3 w-3" />
                  </span>
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Form rows — divider style matching TransactionEditDrawer */}
          <div className="divide-y divide-border/60">
            {/* Date */}
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">{t("imports.date", "Date")}</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    {format(new Date(date + "T00:00:00"), "PPP")}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
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

            {/* Description */}
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">{t("imports.description", "Description")}</span>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("imports.descriptionPlaceholder", "e.g. Cash lunch")}
                className="h-auto w-[60%] border-0 bg-transparent p-0 text-right text-sm font-medium shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
                maxLength={200}
              />
            </div>

            {/* Account */}
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">{t("imports.account", "Account")}</span>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 gap-1 focus:ring-0 focus:ring-offset-0 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:opacity-40">
                  <SelectValue placeholder={t("imports.selectAccount", "Select account")}>
                    <span className="text-sm font-medium">
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

            {/* Amount */}
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">{t("imports.amount", "Amount")}</span>
              {isShared ? (
                <span className={cn("text-sm font-semibold tabular-nums", amountColor)}>
                  {!isNaN(sharedAmount) && sharedAmount > 0
                    ? formatCurrency(sharedAmount)
                    : "—"}
                </span>
              ) : (
                <Input
                  type="text"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0,00"
                  className={cn(
                    "h-auto w-[40%] border-0 bg-transparent p-0 text-right text-sm font-semibold tabular-nums shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50",
                    amountColor,
                  )}
                />
              )}
            </div>

            {/* Category */}
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">{t("imports.category", "Category")}</span>
              <Select value={categorySlug} onValueChange={setCategorySlug}>
                <SelectTrigger className="h-auto w-auto max-w-[65%] border-0 bg-transparent p-0 gap-1 focus:ring-0 focus:ring-offset-0 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:opacity-40 [&>svg]:shrink-0">
                  <SelectValue>
                    <PillBadge colorVar={getCategoryColor(categorySlug)} className="text-[11px] py-0.5">
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

          {/* Shared expense toggle */}
          <div className="mt-3 flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
            <div className="space-y-0.5 pr-3">
              <span className="text-xs font-medium">{t("imports.sharedExpense", "Shared expense")}</span>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {t("imports.sharedExpenseDesc", "Someone else paid the full amount — only your share counts.")}
              </p>
            </div>
            <Switch checked={isShared} onCheckedChange={setIsShared} />
          </div>

          {isShared && (
            <div className="mt-2 space-y-2.5 rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {t("imports.totalPaid", "Total paid")}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={totalAmountStr}
                  onChange={(e) => setTotalAmountStr(e.target.value)}
                  placeholder="0,00"
                  className="h-auto w-[40%] border-0 bg-transparent p-0 text-right text-sm font-medium tabular-nums shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {t("imports.yourShare", "Your share (%)")}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={sharePercentStr}
                  onChange={(e) => setSharePercentStr(e.target.value)}
                  placeholder="50"
                  className="h-auto w-[30%] border-0 bg-transparent p-0 text-right text-sm font-medium tabular-nums shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
                />
              </div>
              {!isNaN(sharedAmount) && sharedAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("imports.yourAmount", "Your amount:")} <span className="font-semibold text-foreground tabular-nums">{formatCurrency(sharedAmount)}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <DrawerFooter>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-1.5">
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <PlusCircle className="w-4 h-4" />
            )}
            {t("imports.addEntry", "Add entry")}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">{t("imports.cancel", "Cancel")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
