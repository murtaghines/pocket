import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Minus,
  ArrowRightLeft,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { evalArithmetic } from "@/lib/safeMath";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryIcon } from "@/components/ui/category-icon";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { MinimalSelectContent, MinimalSelectItem } from "../MinimalSelect";
import {
  getCategoriesForMovement,
} from "./helpers";
import {
  getCategoryLabel,
  getMovementLabel,
  normalizeCategory,
} from "@/lib/categoryTranslations";
import type { MonthTransaction, PendingEditShape, MovementType } from "./types";

// Field label — 12px/500 uppercase per design system (Label/overline token).
const FIELD_LABEL = "text-xs font-medium uppercase tracking-[0.07em] text-muted-foreground";

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

  useBodyScrollLock(open);

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
    setAmountStr(String(parseFloat(Math.abs(parsed).toFixed(2))).replace(".", ","));
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

  // Sign is implied by the movement toggle — the user only ever types the
  // plain magnitude. Transfers show no sign (matches the table's badge rule).
  const amountSign = movement === "EXPENSE" ? "−" : movement === "INCOME" ? "+" : null;

  const movementOptions: { value: MovementType; icon: typeof Plus; label: string }[] = [
    { value: "EXPENSE", icon: Minus, label: getMovementLabel("EXPENSE") },
    { value: "INCOME", icon: Plus, label: getMovementLabel("INCOME") },
    { value: "TRANSFER", icon: ArrowRightLeft, label: getMovementLabel("TRANSFER") },
  ];

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
          {t("imports.editTransaction", "Edit transaction")}
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
                onClick={() => handleMovementChange(opt.value)}
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
            className="h-12 rounded-full bg-muted border-0 shadow-none px-5 focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <label className={FIELD_LABEL}>
            {t("imports.amount", "Amount")}
          </label>
          <div className="relative">
            {amountSign && (
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-base text-muted-foreground pointer-events-none">
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
              className={cn(
                "h-12 rounded-full bg-muted border-0 shadow-none tabular-nums text-base focus-visible:ring-1 focus-visible:ring-primary",
                amountSign ? "pl-10 pr-5" : "px-5",
              )}
            />
          </div>
        </div>

        {/* Account + Category row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5 min-w-0">
            <label className={FIELD_LABEL}>
              {t("imports.account", "Account")}
            </label>
            <div className="flex h-12 items-center rounded-full bg-muted px-5 text-sm font-medium text-foreground truncate">
              {accountName || "—"}
            </div>
          </div>
          <div className="space-y-1.5 min-w-0">
            <label className={FIELD_LABEL}>
              {t("imports.category", "Category")}
            </label>
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger
                className="h-12 rounded-full border-0 shadow-none px-4 focus:ring-1 focus:ring-primary [&>svg]:opacity-60"
                style={{
                  backgroundColor: `hsl(var(--${getColor(category)}) / 0.15)`,
                  color: `hsl(var(--${getColor(category)}))`,
                }}
              >
                <SelectValue>
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
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
      </div>

      {/* Footer buttons */}
      <div className="px-4 pb-6 pt-3 bg-card border-t border-border space-y-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-12 rounded-full font-semibold text-base"
            onClick={() => onOpenChange(false)}
          >
            {t("imports.cancel", "Cancel")}
          </Button>
          <Button
            className="flex-1 h-12 rounded-full font-semibold text-base"
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
        {ruleWorthy && hasChanges && (
          <Button
            className="w-full h-12 rounded-full font-semibold text-base gap-1.5"
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
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
