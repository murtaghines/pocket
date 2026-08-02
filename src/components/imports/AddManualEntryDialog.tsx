import { useState, useEffect } from "react";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { PillBadge, type PillTone } from "@/components/ui/pill-badge";
import { useAccounts } from "@/hooks/useAccounts";
import { useLocalization } from "@/hooks/useLocalization";
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
  monthKey: string; // YYYY-MM — date is constrained to this month
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

  // Shared-expense split: e.g. your partner paid the full rent, but only your
  // share should count as your expense. Off by default — pure convenience calculator,
  // no schema change: we just save your share as the amount and note the split in the
  // description, so it's self-documenting without a new column.
  const [isShared, setIsShared] = useState(false);
  const [totalAmountStr, setTotalAmountStr] = useState<string>("");
  const [sharePercentStr, setSharePercentStr] = useState<string>("50");

  // Reset on open
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

  // Sync default category when movement changes
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

  // When splitting a shared expense, the amount actually saved is your share of the
  // total someone else paid (or you paid but only part is "yours") — never the full total.
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
      // Self-documenting: the split shows up in the description itself (no schema change),
      // so it's still visible later in the transaction list / audit history.
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

  const movementTone = (m: MovementType): PillTone =>
    m === "INCOME" ? "green" : m === "TRANSFER" ? "amber" : "red";
  const movementIcon = (m: MovementType) =>
    m === "INCOME" ? <Plus className="w-3 h-3" /> :
    m === "TRANSFER" ? <ArrowRightLeft className="w-3 h-3" /> :
    <Minus className="w-3 h-3" />;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dashboard-theme bg-background text-foreground sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-primary" />
            Add manual entry · {monthLabel}
          </DialogTitle>
          <DialogDescription>
            Record a transaction that isn't on a statement (e.g. cash).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-9",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(new Date(date + "T00:00:00"), "PPP") : "Pick a date"}
                </Button>
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
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Cash lunch"
              className="h-9"
              maxLength={200}
            />
          </div>

          {/* Account */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Movement + Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Movement</Label>
              <Select value={movement} onValueChange={(v) => setMovement(v as MovementType)}>
                <SelectTrigger className="h-9">
                  <SelectValue>
                    <PillBadge tone={movementTone(movement)} icon={movementIcon(movement)}>
                      {getMovementLabel(movement)}
                    </PillBadge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">
                    <PillBadge tone="green" icon={<Plus className="w-3 h-3" />}>
                      {getMovementLabel("INCOME")}
                    </PillBadge>
                  </SelectItem>
                  <SelectItem value="EXPENSE">
                    <PillBadge tone="red" icon={<Minus className="w-3 h-3" />}>
                      {getMovementLabel("EXPENSE")}
                    </PillBadge>
                  </SelectItem>
                  <SelectItem value="TRANSFER">
                    <PillBadge tone="amber" icon={<ArrowRightLeft className="w-3 h-3" />}>
                      {getMovementLabel("TRANSFER")}
                    </PillBadge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Category</Label>
              <Select value={categorySlug} onValueChange={setCategorySlug}>
                <SelectTrigger className="h-9">
                  <SelectValue>
                    <div className="flex items-center gap-1.5">
                      <CategoryIcon
                        iconName={getCategoryIcon(categorySlug)}
                        colorVar={getCategoryColor(categorySlug)}
                        size="sm"
                        showBackground={true}
                      />
                      <span>{getCategoryLabel(categorySlug)}</span>
                    </div>
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
                          showBackground={true}
                        />
                        {getCategoryLabel(slug)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amount */}
          {!isShared && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Amount {movement === "EXPENSE" ? "(will be saved as a negative value)" : ""}
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0,00"
                className="h-9 text-right tabular-nums"
              />
            </div>
          )}

          {/* Shared expense toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div className="space-y-0.5 pr-3">
              <Label className="text-xs font-medium">Shared expense</Label>
              <p className="text-[11px] text-muted-foreground">
                Someone else paid the full amount — only your share counts.
              </p>
            </div>
            <Switch checked={isShared} onCheckedChange={setIsShared} />
          </div>

          {isShared && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Total amount paid
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={totalAmountStr}
                    onChange={(e) => setTotalAmountStr(e.target.value)}
                    placeholder="0,00"
                    className="h-9 text-right tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Your share (%)
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={sharePercentStr}
                    onChange={(e) => setSharePercentStr(e.target.value)}
                    placeholder="50"
                    className="h-9 text-right tabular-nums"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {!isNaN(sharedAmount) && sharedAmount > 0
                  ? <>You'll save this as <span className="font-semibold text-foreground">{formatCurrency(sharedAmount)}</span>.</>
                  : "Enter the total and your share to see the amount."}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <PlusCircle className="w-4 h-4 mr-2" />
            )}
            Add entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
