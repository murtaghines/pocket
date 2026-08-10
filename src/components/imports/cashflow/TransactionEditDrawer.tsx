import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Plus,
  Minus,
  ArrowRightLeft,
  Sparkles,
  CalendarIcon,
  Trash2,
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
  SheetPanel,
  SHEET_LABEL,
  SHEET_PILL,
  SHEET_BUTTON,
  SHEET_INPUT,
} from "../SheetPanel";
import { LockedFieldLabel } from "../LockedFieldLabel";
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

/** Read-only rendering of a field that belongs to the imported statement. */
function LockedValue({ value }: { value: string }) {
  return (
    <div
      className={cn(
        SHEET_PILL,
        "flex items-center bg-muted/60 text-muted-foreground truncate",
      )}
    >
      <span className="truncate">{value}</span>
    </div>
  );
}

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
  onSave: (tx: MonthTransaction, edits: PendingEditShape, withRule: boolean) => void;
  onDelete?: (tx: MonthTransaction) => void;
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
      const cleaned = (tx.description_norm || tx.description)
        .replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, "")
        .trim();
      setDescription(cleaned);
      setDate(tx.date);
      setAccountId(tx.account_id || "");
      savedCategoriesRef.current = { [m]: { slug: cat, id: tx.category_id } };
    }
  }, [tx?.id, open]);

  if (!tx) return null;

  // What the user may change depends on where the row came from: a statement
  // row's description/date/account are properties of the file, a manual entry's
  // are its own. See lib/transactionSource.ts.
  const isManual = isManualTransaction(tx);

  const cleanDescription = (tx.description_norm || tx.description)
    .replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, "")
    .trim();

  const [year, monthNum] = monthKey.split("-").map(Number);
  const firstDay = `${year}-${String(monthNum).padStart(2, "0")}-01`;
  const lastDayNum = new Date(year, monthNum, 0).getDate();
  const lastDay = `${year}-${String(monthNum).padStart(2, "0")}-${String(lastDayNum).padStart(2, "0")}`;

  const availableCategories = getCategoriesForMovement(movement);
  const selectedAccount = accounts.find((a) => a.id === accountId);
  // `date` syncs from `tx` in an effect, so it's briefly "" on the first render
  // after `tx` changes — fall back so the date formatting never sees "".
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
      const defaultCat = getCategoriesForMovement(newMovement)[0];
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
    setAmount(sign * Math.abs(parsed));
    setAmountStr(String(parseFloat(Math.abs(parsed).toFixed(2))).replace(".", ","));
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
    accountId !== origAccountId;

  const invalid = isManual && (description.trim().length === 0 || !accountId);

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
    return edits;
  };

  // Sign is implied by the movement toggle — the user only types the magnitude.
  const amountSign = movement === "EXPENSE" ? "−" : movement === "INCOME" ? "+" : null;

  const movementOptions: { value: MovementType; icon: typeof Plus; label: string }[] = [
    { value: "EXPENSE", icon: Minus, label: getMovementLabel("EXPENSE") },
    { value: "INCOME", icon: Plus, label: getMovementLabel("INCOME") },
    { value: "TRANSFER", icon: ArrowRightLeft, label: getMovementLabel("TRANSFER") },
  ];

  const footer = (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className={cn(SHEET_BUTTON, "flex-1")}
          onClick={() => onOpenChange(false)}
        >
          {t("imports.cancel", "Cancel")}
        </Button>
        <Button
          className={cn(SHEET_BUTTON, "flex-1")}
          disabled={!hasChanges || invalid}
          onClick={() => {
            handleAmountBlur();
            onSave(tx, buildEdits(), false);
            onOpenChange(false);
          }}
        >
          {t("imports.save", "Save")}
        </Button>
      </div>
      {ruleWorthy && hasChanges && (
        <Button
          variant="outline"
          className={cn(SHEET_BUTTON, "w-full gap-1.5")}
          onClick={() => {
            handleAmountBlur();
            onSave(tx, buildEdits(), true);
            onOpenChange(false);
          }}
        >
          <Sparkles className="h-4 w-4" />
          {t("imports.saveRule", "Save + rule")}
        </Button>
      )}
    </>
  );

  return (
    <SheetPanel
      open={open}
      onOpenChange={onOpenChange}
      title={t("imports.editTransaction", "edit transaction")}
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
              onClick={() => handleMovementChange(opt.value)}
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
        <LockedFieldLabel
          label={t("imports.description", "Description")}
          locked={!isManual}
          reason={t(
            "imports.lockedDescription",
            "this description comes from the uploaded bank statement and can't be edited",
          )}
        />
        {isManual ? (
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={SHEET_INPUT}
          />
        ) : (
          <LockedValue value={description} />
        )}
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
              onBlur={handleAmountBlur}
              placeholder="0,00"
              className={cn(SHEET_INPUT, "tabular-nums", amountSign && "pl-10 pr-5")}
            />
          </div>
        </div>
        <div className="space-y-1.5 min-w-0">
          <LockedFieldLabel
            label={t("imports.date", "Date")}
            locked={!isManual}
            reason={t(
              "imports.lockedDate",
              "the date comes from the bank statement, so it can't be changed on an imported transaction",
            )}
          />
          {isManual ? (
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
                    {format(new Date(displayDate + "T00:00:00"), "d MMM yyyy")}
                  </span>
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
          ) : (
            <LockedValue value={format(new Date(displayDate + "T00:00:00"), "d MMM yyyy")} />
          )}
        </div>
      </div>

      {/* Account + Category row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5 min-w-0">
          <LockedFieldLabel
            label={t("imports.account", "Account")}
            locked={!isManual}
            reason={t(
              "imports.lockedAccount",
              "the account belongs to the entire uploaded file statement — it can be changed in configuration",
            )}
          />
          {isManual ? (
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
          ) : (
            <LockedValue value={selectedAccount ? getAccountDisplayName(selectedAccount) : "—"} />
          )}
        </div>
        <div className="space-y-1.5 min-w-0">
          <label className={SHEET_LABEL}>{t("imports.category", "Category")}</label>
          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger
              className={cn(
                SHEET_PILL,
                "px-4 focus:ring-1 focus:ring-primary [&>svg]:opacity-60",
              )}
              style={{
                backgroundColor: `hsl(var(--${getColor(category)}) / 0.15)`,
                color: `hsl(var(--${getColor(category)}))`,
              }}
            >
              <SelectValue>
                <span className="flex items-center gap-1.5 font-semibold">
                  <CategoryIcon
                    iconName={getIcon(category)}
                    colorVar={getColor(category)}
                    size="sm"
                    showBackground={false}
                  />
                  <span className="truncate">{getCategoryLabel(category)}</span>
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

      {isManual && onDelete && (
        <Button
          type="button"
          variant="ghost"
          className="w-full h-10 rounded-full text-[13px] font-medium text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
          onClick={() => onDelete(tx)}
        >
          <Trash2 className="h-4 w-4" />
          {t("imports.deleteEntry", "Delete entry")}
        </Button>
      )}
    </SheetPanel>
  );
}
