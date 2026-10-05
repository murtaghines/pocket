import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Plus,
  Minus,
  ArrowRightLeft,
  CalendarIcon,
  Trash2,
  EyeOff,
  Eye,
  RotateCcw,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { evalArithmetic } from "@/lib/safeMath";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CategoryIcon } from "@/components/ui/category-icon";
import { MinimalSelectContent, MinimalSelectItem } from "../MinimalSelect";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { filterRevertableSnapshot } from "./helpers";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getAccountDisplayName } from "@/lib/accountColors";
import { isManualTransaction } from "@/lib/transactionSource";
import type { Account } from "@/hooks/useAccounts";
import { getCategoriesForMovement } from "./helpers";
import {
  getCategoryLabel,
  getMovementLabel,
  normalizeCategory,
} from "@/lib/categoryTranslations";
import type { MonthTransaction, PendingEditShape, MovementType } from "./types";

const LABEL = "text-[12px] font-medium text-primary/70 mb-1.5";
const PILL_INPUT =
  "h-11 rounded-xl bg-muted/50 border-0 shadow-none px-4 text-[14px] focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50";
const PILL_SELECT =
  "h-11 rounded-xl bg-muted/50 border-0 shadow-none px-4 text-[14px]";

interface TransactionEditDrawerProps {
  tx: MonthTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthKey: string;
  getCategoryIcon: (slug: string) => string;
  getCategoryColor: (slug: string) => string;
  formatCurrency: (amount: number) => string;
  categories: { id: string; slug: string }[];
  accounts: Account[];
  onSave: (tx: MonthTransaction, edits: PendingEditShape, withRule: boolean, isRevert?: boolean) => void;
  onDelete?: (tx: MonthTransaction) => void;
  isEdited?: boolean;
  originalSnapshot?: { values: Record<string, unknown>; fields: string[] } | null;
}

export function TransactionEditDrawer({
  tx,
  open,
  onOpenChange,
  monthKey,
  getCategoryIcon: getIcon,
  getCategoryColor: getColor,
  formatCurrency,
  categories,
  accounts,
  onSave,
  onDelete,
  isEdited,
  originalSnapshot,
}: TransactionEditDrawerProps) {
  const { t } = useTranslation("common");

  const [movement, setMovement] = useState<MovementType>("EXPENSE");
  const [category, setCategory] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [pendingHidden, setPendingHidden] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const savedCategoriesRef = useRef<Record<string, { slug: string; id: string | null }>>({});

  useEffect(() => {
    if (tx && open) {
      const m = (tx.movement || "EXPENSE") as MovementType;
      const cat = normalizeCategory(tx.category || "other_expense");
      setMovement(m);
      setCategory(cat);
      setCategoryId(tx.category_id);
      setAmount(tx.amount);
      setAmountStr(String(Math.abs(tx.amount)).replace(".", ","));
      const cleaned = (tx.description || tx.description_norm || "")
        .replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, "")
        .trim();
      setDescription(cleaned);
      setDate(tx.date);
      setAccountId(tx.account_id || "");
      setPendingHidden(tx.is_hidden);
      setIsReverting(false);
      setDeleteConfirmOpen(false);
      savedCategoriesRef.current = { [m]: { slug: cat, id: tx.category_id } };
    }
  }, [tx?.id, open]);

  if (!tx) return null;

  const isManual = isManualTransaction(tx);

  const cleanDescription = (tx.description || tx.description_norm || "")
    .replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, "")
    .trim();

  const [year, monthNum] = monthKey.split("-").map(Number);
  const firstDay = `${year}-${String(monthNum).padStart(2, "0")}-01`;
  const lastDayNum = new Date(year, monthNum, 0).getDate();
  const lastDay = `${year}-${String(monthNum).padStart(2, "0")}-${String(lastDayNum).padStart(2, "0")}`;

  const availableCategories = getCategoriesForMovement(movement, amount);
  const selectedAccount = accounts.find((a) => a.id === accountId);
  const displayDate = date || tx.date;

  const handleMovementChange = (newMovement: MovementType) => {
    savedCategoriesRef.current[movement] = { slug: category, id: categoryId };
    setMovement(newMovement);
    const sign = newMovement === "EXPENSE" ? -1 : 1;
    setAmount(sign * Math.abs(amount));

    const saved = savedCategoriesRef.current[newMovement];
    if (saved) {
      setCategory(saved.slug);
      setCategoryId(saved.id);
    } else {
      const newAmount = (newMovement === "EXPENSE" ? -1 : 1) * Math.abs(amount);
      const defaultCat = getCategoriesForMovement(newMovement, newAmount)[0];
      setCategory(defaultCat);
      const cat = categories.find((c) => c.slug === defaultCat);
      setCategoryId(cat?.id || null);
    }
  };

  const handleCategoryChange = (newSlug: string) => {
    setCategory(newSlug);
    const cat = categories.find((c) => c.slug === newSlug);
    setCategoryId(cat?.id || null);
  };

  const handleAmountBlur = () => {
    const sanitized = amountStr.replace(/\s/g, "").replace(",", ".");
    const parsed = evalArithmetic(sanitized);
    if (parsed === null) return;
    const sign = movement === "EXPENSE" ? -1 : 1;
    const newAmount = sign * Math.abs(parsed);
    setAmount(newAmount);
    setAmountStr(String(parseFloat(Math.abs(parsed).toFixed(2))).replace(".", ","));
    if (movement === "TRANSFER" && newAmount !== 0) {
      const validCats = getCategoriesForMovement("TRANSFER", newAmount);
      if (!validCats.includes(category)) {
        const defaultCat = validCats[0];
        setCategory(defaultCat);
        const cat = categories.find((c) => c.slug === defaultCat);
        setCategoryId(cat?.id || null);
      }
    }
  };

  const handleUndoChanges = () => {
    if (!originalSnapshot) return;
    const filtered = filterRevertableSnapshot(originalSnapshot);
    const v = filtered.values;
    if (v.description !== undefined) setDescription(v.description as string);
    else if (v.description_norm !== undefined) setDescription(v.description_norm as string);
    if (v.amount !== undefined) {
      setAmount(v.amount as number);
      setAmountStr(String(Math.abs(v.amount as number)).replace(".", ","));
    }
    if (v.date !== undefined) setDate(v.date as string);
    if (v.account_id !== undefined) setAccountId(v.account_id as string);
    setIsReverting(true);
  };

  const origMovement = (tx.movement || "EXPENSE") as MovementType;
  const origCategory = normalizeCategory(tx.category || "other_expense");
  const origAccountId = tx.account_id || "";

  const hasChanges =
    movement !== origMovement ||
    category !== origCategory ||
    amount !== tx.amount ||
    description !== cleanDescription ||
    date !== tx.date ||
    accountId !== origAccountId ||
    pendingHidden !== tx.is_hidden;

  const invalid = description.trim().length === 0 || !accountId;

  const ruleWorthy =
    category !== origCategory ||
    (movement !== origMovement &&
      (origMovement === "TRANSFER" || movement === "TRANSFER"));

  const buildEdits = (): PendingEditShape => {
    const edits: PendingEditShape = {};
    if (movement !== origMovement) edits.movement = movement;
    if (category !== origCategory) {
      edits.category = category;
      edits.category_id = categoryId;
    }
    if (amount !== tx.amount) edits.amount = amount;
    if (description !== cleanDescription) edits.description = description;
    if (date !== tx.date) edits.date = date;
    if (accountId !== origAccountId) {
      edits.account_id = accountId;
      if (selectedAccount) edits.currency = selectedAccount.currency_base;
    }
    if (pendingHidden !== tx.is_hidden) edits.is_hidden = pendingHidden;
    return edits;
  };

  const currencySymbol = selectedAccount?.currency_base === "USD" ? "$" : "€";

  const movementOptions: { value: MovementType; label: string }[] = [
    { value: "EXPENSE", label: getMovementLabel("EXPENSE") },
    { value: "INCOME", label: getMovementLabel("INCOME") },
    { value: "TRANSFER", label: getMovementLabel("TRANSFER") },
  ];

  const jointAccount = selectedAccount?.account_type === "JOINT" ? selectedAccount : null;
  const splitPct = jointAccount?.split_percentage;
  const hasSplit = jointAccount && splitPct != null && splitPct < 100;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px] bg-card rounded-2xl p-0 gap-0 overflow-hidden border-0 shadow-lg">
          {/* Header */}
          <DialogHeader className="px-7 pt-6 pb-0">
            <DialogTitle className="text-[17px] font-semibold text-foreground">
              {t("imports.editTransaction", "edit transaction")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("imports.editTransaction", "edit transaction")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 px-7 pt-5 pb-6">
            {/* Movement toggle */}
            <div className="flex rounded-xl bg-muted/50 p-1">
              {movementOptions.map((opt) => {
                const active = movement === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleMovementChange(opt.value)}
                    className={cn(
                      "flex flex-1 items-center justify-center rounded-lg py-2.5 text-[13.5px] font-medium transition-all",
                      active
                        ? "bg-card text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground/70",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Description */}
            <div>
              <label className={LABEL}>
                {t("imports.description", "Description")}
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={PILL_INPUT}
              />
            </div>

            {/* Amount + Date row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className={LABEL}>{t("imports.amount", "Amount")}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-muted-foreground pointer-events-none">
                    {currencySymbol}
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    onBlur={handleAmountBlur}
                    placeholder="0,00"
                    className={cn(PILL_INPUT, "tabular-nums pl-9")}
                  />
                </div>
              </div>
              <div className="min-w-0">
                <label className={LABEL}>
                  {t("imports.date", "Date")}
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        PILL_SELECT,
                        "flex w-full items-center gap-2 text-foreground hover:bg-muted/40 transition-colors",
                      )}
                    >
                      <span className="truncate text-[14px]">
                        {format(new Date(displayDate + "T00:00:00"), "d MMM yyyy")}
                      </span>
                      <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0 ml-auto" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={new Date(displayDate + "T00:00:00")}
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
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className={LABEL}>
                  {t("imports.account", "Account")}
                </label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger
                    className={cn(PILL_SELECT, "focus:ring-1 focus:ring-primary [&>svg]:opacity-40")}
                  >
                    <SelectValue placeholder={t("imports.selectAccount", "Select")}>
                      <span className="flex items-center gap-2 truncate">
                        {selectedAccount && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: selectedAccount.color || "hsl(var(--primary))" }}
                          />
                        )}
                        <span className="truncate font-medium">
                          {selectedAccount ? getAccountDisplayName(selectedAccount) : "—"}
                        </span>
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
              <div className="min-w-0">
                <label className={LABEL}>{t("imports.category", "Category")}</label>
                <Select value={category} onValueChange={handleCategoryChange}>
                  <SelectTrigger
                    className={cn(PILL_SELECT, "focus:ring-1 focus:ring-primary [&>svg]:opacity-40")}
                  >
                    <SelectValue>
                      <span className="flex items-center gap-1.5">
                        <CategoryIcon
                          iconName={getIcon(category)}
                          colorVar={getColor(category)}
                          size="sm"
                          showBackground={false}
                        />
                        <span className="truncate font-medium">{getCategoryLabel(category)}</span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <MinimalSelectContent>
                    {availableCategories.map((slug) => (
                      <MinimalSelectItem key={slug} value={slug}>
                        <CategoryIcon
                          iconName={getIcon(slug)}
                          colorVar={getColor(slug)}
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

            {/* Joint account split info — toggle-style card */}
            {hasSplit && (
              <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-foreground">
                    {t("imports.accountShareNote", "Your share: {{pct}}%", { pct: splitPct })}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {splitPct}% · {formatCurrency(Math.abs(amount) * (splitPct! / 100))} {t("imports.each", "each")}
                  </p>
                </div>
                <div className="w-11 h-6 rounded-full bg-primary flex items-center px-0.5 shrink-0">
                  <div className="w-5 h-5 rounded-full bg-white shadow-sm ml-auto" />
                </div>
              </div>
            )}

            {/* Rule info hint */}
            {ruleWorthy && hasChanges && (
              <div className="flex items-start gap-2 text-[12px] text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/60" />
                <span>
                  {t("imports.ruleHint", "When you save, Pocket will ask if you want to create a rule for similar transactions.")}
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl font-semibold text-[14px] border-border"
                onClick={() => onOpenChange(false)}
              >
                {t("imports.cancel", "Cancel")}
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl font-semibold text-[14px]"
                disabled={!hasChanges || invalid}
                onClick={() => {
                  handleAmountBlur();
                  onSave(tx, buildEdits(), false, isReverting);
                  onOpenChange(false);
                }}
              >
                {t("imports.save", "Save")}
              </Button>
            </div>

            {/* Secondary actions */}
            {(isManual || !isManual) && (
              <div className="flex items-center justify-center gap-4 -mt-2">
                {isManual && onDelete && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-destructive py-1"
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("imports.delete", "delete")}
                  </button>
                )}
                {!isManual && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground py-1"
                    onClick={() => setPendingHidden(!pendingHidden)}
                  >
                    {pendingHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {pendingHidden
                      ? t("imports.showEntry", "show")
                      : t("imports.hideEntry", "hide")}
                  </button>
                )}
                {!isManual && isEdited && originalSnapshot && (
                  <>
                    <span className="text-muted-foreground/30">·</span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary py-1"
                      onClick={handleUndoChanges}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {t("imports.revertChanges", "undo changes")}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-[240px] rounded-2xl p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-[15px]">
              {t("imports.deleteEntryTitle", "Delete entry?")}
            </AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              {t("imports.deleteEntryDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:justify-center">
            <AlertDialogCancel className="mt-0 flex-1 rounded-full border-0 bg-muted shadow-none">
              {t("imports.no", "no")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (tx && onDelete) onDelete(tx);
                onOpenChange(false);
              }}
            >
              {t("imports.yes", "yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
