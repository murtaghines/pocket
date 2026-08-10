import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Minus,
  ArrowRightLeft,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { evalArithmetic } from "@/lib/safeMath";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PillBadge } from "@/components/ui/pill-badge";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  getCategoriesForMovement,
} from "./helpers";
import {
  getCategoryLabel,
  getMovementLabel,
  normalizeCategory,
} from "@/lib/categoryTranslations";
import type { MonthTransaction, PendingEditShape, MovementType } from "./types";

interface TransactionEditDrawerProps {
  tx: MonthTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getCategoryIcon: (slug: string) => string;
  getCategoryColor: (slug: string) => string;
  formatCurrency: (amount: number) => string;
  categories: { id: string; slug: string }[];
  accountName: string | null;
  onSave: (tx: MonthTransaction, edits: PendingEditShape, withRule: boolean) => void;
}

export function TransactionEditDrawer({
  tx,
  open,
  onOpenChange,
  getCategoryIcon: getIcon,
  getCategoryColor: getColor,
  formatCurrency,
  categories,
  accountName,
  onSave,
}: TransactionEditDrawerProps) {
  const { t } = useTranslation("common");

  const [movement, setMovement] = useState<MovementType>("EXPENSE");
  const [category, setCategory] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");

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
      savedCategoriesRef.current = { [m]: { slug: cat, id: tx.category_id } };
    }
  }, [tx?.id, open]);

  if (!tx) return null;

  const cleanDescription = (tx.description_norm || tx.description)
    .replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, "")
    .trim();

  const availableCategories = getCategoriesForMovement(movement);

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
  };

  const handleDivide = (n: number) => {
    if (n < 1) return;
    const newAbs = Math.abs(amount) / n;
    const sign = movement === "EXPENSE" ? -1 : 1;
    setAmount(sign * newAbs);
    setAmountStr(String(parseFloat(newAbs.toFixed(2))).replace(".", ","));
  };

  const origMovement = (tx.movement || "EXPENSE") as MovementType;
  const origCategory = normalizeCategory(tx.category || "other_expense");

  const hasChanges =
    movement !== origMovement ||
    category !== origCategory ||
    amount !== tx.amount ||
    description !== cleanDescription;

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
    return edits;
  };

  const amountColor =
    amount === 0
      ? "text-muted-foreground"
      : movement === "INCOME"
        ? "text-success"
        : movement === "TRANSFER"
          ? "text-muted-foreground"
          : "text-destructive";

  const movementOptions: { value: MovementType; icon: typeof Plus; label: string; tone: string }[] = [
    { value: "EXPENSE", icon: Minus, label: getMovementLabel("EXPENSE"), tone: "red" },
    { value: "INCOME", icon: Plus, label: getMovementLabel("INCOME"), tone: "green" },
    { value: "TRANSFER", icon: ArrowRightLeft, label: getMovementLabel("TRANSFER"), tone: "amber" },
  ];

  const panel = (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-background transition-transform duration-300 ease-out",
        open ? "translate-y-0" : "translate-y-full",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {t("imports.editTransaction", "Edit transaction")}
        </span>
        <div className="w-9" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Movement toggle — segmented control */}
        <div className="flex rounded-xl bg-muted p-1">
          {movementOptions.map((opt) => {
            const Icon = opt.icon;
            const active = movement === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleMovementChange(opt.value)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all",
                  active
                    ? "bg-card text-foreground shadow-sm"
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
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("imports.description", "Description")}
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-11 rounded-xl bg-muted border-0 shadow-none focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("imports.amount", "Amount")}
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              {movement === "EXPENSE" && (
                <span className={cn("absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold", amountColor)}>−</span>
              )}
              <Input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                onBlur={handleAmountBlur}
                placeholder="0,00"
                className={cn(
                  "h-11 rounded-xl bg-muted border-0 shadow-none tabular-nums font-semibold focus-visible:ring-1 focus-visible:ring-primary",
                  movement === "EXPENSE" ? "pl-7" : "pl-3",
                  amountColor,
                )}
              />
            </div>
          </div>
          <div className="flex gap-1.5 pt-0.5">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleDivide(n)}
                className="rounded-lg bg-muted px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                &divide; {n}
              </button>
            ))}
          </div>
        </div>

        {/* Account */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("imports.account", "Account")}
          </label>
          <div className="flex h-11 items-center rounded-xl bg-muted px-3 text-sm text-foreground">
            {accountName || "—"}
          </div>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("imports.category", "Category")}
          </label>
          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="h-11 rounded-xl bg-muted border-0 shadow-none focus:ring-1 focus:ring-primary [&>svg]:opacity-40">
              <SelectValue>
                <PillBadge colorVar={getColor(category)} className="text-[11px] py-0.5 overflow-visible">
                  <CategoryIcon
                    iconName={getIcon(category)}
                    colorVar={getColor(category)}
                    size="sm"
                    showBackground={false}
                  />
                  <span className="truncate">{getCategoryLabel(category)}</span>
                </PillBadge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableCategories.map((slug) => (
                <SelectItem key={slug} value={slug}>
                  <div className="flex items-center gap-2">
                    <CategoryIcon
                      iconName={getIcon(slug)}
                      colorVar={getColor(slug)}
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

      {/* Footer buttons */}
      <div className="px-4 pb-6 pt-3 bg-background space-y-2">
        <div className="flex gap-2">
          {ruleWorthy && hasChanges && (
            <Button
              className="flex-1 h-12 rounded-xl gap-1.5"
              variant="outline"
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
          <Button
            className="flex-1 h-12 rounded-xl"
            disabled={!hasChanges}
            onClick={() => {
              handleAmountBlur();
              onSave(tx, buildEdits(), false);
              onOpenChange(false);
            }}
          >
            {t("imports.save", "Save")}
          </Button>
        </div>
        <Button
          variant="ghost"
          className="w-full h-10 rounded-xl text-muted-foreground"
          onClick={() => onOpenChange(false)}
        >
          {t("imports.cancel", "Cancel")}
        </Button>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
