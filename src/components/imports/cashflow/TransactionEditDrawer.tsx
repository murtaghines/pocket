import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Minus,
  ArrowRightLeft,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { evalArithmetic } from "@/lib/safeMath";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
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
import { AmountEditButton } from "./AmountEditButton";
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

  const handleAmountChange = (raw: string) => {
    const sanitized = raw.replace(/\s/g, "").replace(",", ".");
    const parsed = evalArithmetic(sanitized);
    if (parsed === null) return;
    const sign = movement === "EXPENSE" ? -1 : 1;
    setAmount(sign * Math.abs(parsed));
  };

  const handleSplit = (n: number) => {
    if (n < 1) return;
    setAmount(Math.sign(amount || 1) * (Math.abs(amount) / n));
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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="px-4 pt-2 pb-1">
          {/* Movement toggle */}
          <div className="flex gap-2 mb-4">
            {movementOptions.map((opt) => {
              const Icon = opt.icon;
              const active = movement === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleMovementChange(opt.value)}
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

          {/* Form rows */}
          <div className="divide-y divide-border/60">
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">{t("imports.description", "Description")}</span>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-auto w-[60%] border-0 bg-transparent p-0 text-right text-sm font-medium shadow-none focus-visible:ring-0"
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">{t("imports.account", "Account")}</span>
              <span className="text-sm text-foreground">{accountName || "—"}</span>
            </div>

            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">{t("imports.amount", "Amount")}</span>
              <div className="flex items-center gap-2">
                <span className={cn("text-sm font-semibold tabular-nums", amountColor)}>
                  {amount < 0 ? "−" : ""}
                  {formatCurrency(Math.abs(amount))}
                </span>
                <AmountEditButton
                  originalAmount={amount}
                  formatCurrency={formatCurrency}
                  onChangeAmount={handleAmountChange}
                  onApplySplit={handleSplit}
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">{t("imports.category", "Category")}</span>
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger className="h-auto w-auto max-w-[65%] border-0 bg-transparent p-0 gap-1 focus:ring-0 focus:ring-offset-0 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:opacity-40 [&>svg]:shrink-0">
                  <SelectValue>
                    <PillBadge colorVar={getColor(category)} className="text-[11px] py-0.5">
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
        </div>

        <DrawerFooter>
          <div className="flex gap-2">
            {ruleWorthy && hasChanges && (
              <Button
                className="flex-1 gap-1.5"
                variant="outline"
                onClick={() => {
                  onSave(tx, buildEdits(), true);
                  onOpenChange(false);
                }}
              >
                <Sparkles className="h-4 w-4" />
                {t("imports.saveRule", "Save + rule")}
              </Button>
            )}
            <Button
              className="flex-1"
              disabled={!hasChanges}
              onClick={() => {
                onSave(tx, buildEdits(), false);
                onOpenChange(false);
              }}
            >
              {t("imports.save", "Save")}
            </Button>
          </div>
          <DrawerClose asChild>
            <Button variant="outline">{t("imports.cancel", "Cancel")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
