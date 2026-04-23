import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Checkbox } from "@/components/ui/checkbox";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import { 
  CheckCircle2, 
  PlusCircle, 
  MinusCircle, 
  ArrowRightLeft, 
  Loader2,
  Pencil,
  Lock,
  Brain,
  AlertTriangle,
  Eye,
  EyeOff,
  Split as SplitIcon,
  Undo2,
  RotateCcw,
  Undo,
  Redo,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { 
  INCOME_CATEGORIES, 
  EXPENSE_CATEGORIES, 
  TRANSFER_CATEGORIES,
  getCategoryLabel,
  getMovementLabel,
  normalizeCategory
} from "@/lib/categoryTranslations";
import { buildRuleFromCorrection, ruleMatchesDescription } from "@/lib/userRules";
import type { MatchType } from "@/lib/userRules";

type MovementType = Database["public"]["Enums"]["movement_type"];

interface MonthTransaction {
  id: string;
  date: string;
  description: string;
  description_norm: string | null;
  amount: number;
  type: string;
  movement: MovementType | null;
  category: string;
  category_id: string | null;
  bank: string | null;
  account_id: string | null;
  is_hidden: boolean;
}

interface MonthReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthKey: string; // YYYY-MM
  monthLabel: string;
  isLocked?: boolean;
  importId?: string; // Filter to a specific import
}

// Info about potential rules from edits
interface PotentialRule {
  pattern: string;
  match_type: MatchType;
  tokens: string[];
  categorySlug: string;
  categoryId: string | null;
  movement: string;
  txDescription: string;
}

// Info about rules that were created (includes DB id)
interface CreatedRule extends PotentialRule {
  ruleId: string;
}

// Local edits state
interface TransactionEdits {
  movement?: MovementType;
  category?: string;
  amount?: number;
  is_hidden?: boolean;
  splitCount?: number;
}

export function MonthReviewModal({
  open,
  onOpenChange,
  monthKey,
  monthLabel,
  isLocked = false,
  importId,
}: MonthReviewModalProps) {
  const { formatCurrency, formatDate } = useLocalization();
  const { categories } = useCategories("CASHFLOW");
  const { accounts } = useAccounts();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getCategoryIcon, getCategoryColor } = useCategoryTranslations();
  
  const getAccountNameById = (accountId: string | null) => {
    if (!accountId) return null;
    return accounts.find(a => a.id === accountId)?.name || null;
  };
  const [edits, setEdits] = useState<Record<string, TransactionEdits>>({});
  const [showRetroactiveDialog, setShowRetroactiveDialog] = useState(false);
  const [showRuleSelectionDialog, setShowRuleSelectionDialog] = useState(false);
  const [potentialRules, setPotentialRules] = useState<PotentialRule[]>([]);
  const [selectedRuleIndices, setSelectedRuleIndices] = useState<Set<number>>(new Set());
  const [createdRules, setCreatedRules] = useState<CreatedRule[]>([]);
  const [editedTxIds, setEditedTxIds] = useState<string[]>([]);
  const [isApplyingRetroactive, setIsApplyingRetroactive] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const editsRef = useRef<Record<string, TransactionEdits>>({});

  const updateEdits = useCallback(
    (
      updater:
        | Record<string, TransactionEdits>
        | ((prev: Record<string, TransactionEdits>) => Record<string, TransactionEdits>)
    ) => {
      const prev = editsRef.current;
      const next = typeof updater === "function"
        ? updater(prev)
        : updater;

      editsRef.current = next;
      setEdits(next);
    },
    [],
  );

  // ============= Undo / Redo history (spreadsheet-like) =============
  const editsHistory = useRef<Record<string, TransactionEdits>[]>([{}]);
  const historyIndex = useRef<number>(0);
  const isReplaying = useRef<boolean>(false);

  // Push a new edits snapshot whenever edits change (but skip undo/redo replays)
  useEffect(() => {
    if (isReplaying.current) {
      isReplaying.current = false;
      return;
    }
    // Drop any "redo" tail when a new change is made
    editsHistory.current = editsHistory.current.slice(0, historyIndex.current + 1);
    editsHistory.current.push(edits);
    historyIndex.current = editsHistory.current.length - 1;
    // Cap history to prevent memory bloat
    if (editsHistory.current.length > 100) {
      editsHistory.current.shift();
      historyIndex.current--;
    }
  }, [edits]);

  // Reset history when modal closes/opens
  useEffect(() => {
    if (!open) {
      editsHistory.current = [{}];
      historyIndex.current = 0;
    }
  }, [open]);

  const canUndo = historyIndex.current > 0;
  const canRedo = historyIndex.current < editsHistory.current.length - 1;

  const handleUndo = () => {
    if (historyIndex.current <= 0) return;
    historyIndex.current--;
    isReplaying.current = true;
    updateEdits(editsHistory.current[historyIndex.current]);
  };

  const handleRedo = () => {
    if (historyIndex.current >= editsHistory.current.length - 1) return;
    historyIndex.current++;
    isReplaying.current = true;
    updateEdits(editsHistory.current[historyIndex.current]);
  };

  // Keyboard shortcuts: Cmd/Ctrl+Z (undo), Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y (redo)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      else if ((e.key === "z" && e.shiftKey) || e.key === "y") { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Fetch transactions for this month (optionally filtered by import)
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["month-transactions", monthKey, user?.id, importId],
    queryFn: async () => {
      if (!user) return [];
      
      // Calculate start and end dates using string parsing to avoid timezone shifts
      const [year, month] = monthKey.split("-").map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate(); // getDate() is safe here
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      
      let query = supabase
        .from("transactions")
        .select("id, date, description, description_norm, amount, type, movement, category, category_id, bank, account_id, is_hidden")
        .eq("user_id", user.id)
        .eq("domain", "CASHFLOW")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (importId) {
        query = query.eq("import_id", importId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MonthTransaction[];
    },
    enabled: open && !!user,
  });

  // Detect sign↔movement mismatches
  const mismatchedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tx of transactions) {
      if (tx.amount > 0 && tx.movement === 'EXPENSE') ids.add(tx.id);
      else if (tx.amount < 0 && tx.movement === 'INCOME') ids.add(tx.id);
    }
    return ids;
  }, [transactions]);

  // Auto-populate edits for mismatched transactions (only once when data loads)
  const [mismatchAutoApplied, setMismatchAutoApplied] = useState(false);
  useMemo(() => {
    if (mismatchedIds.size > 0 && !mismatchAutoApplied && transactions.length > 0 && !isLocked) {
      const autoEdits: Record<string, TransactionEdits> = {};
      for (const tx of transactions) {
        if (!mismatchedIds.has(tx.id)) continue;
        if (tx.amount > 0 && tx.movement === 'EXPENSE') {
          const currentCat = normalizeCategory(tx.category || 'other_income');
          const isExpenseCat = EXPENSE_CATEGORIES.includes(currentCat);
          autoEdits[tx.id] = {
            movement: 'INCOME',
            category: isExpenseCat ? 'other_income' : currentCat,
          };
        } else if (tx.amount < 0 && tx.movement === 'INCOME') {
          const currentCat = normalizeCategory(tx.category || 'other_expense');
          const isIncomeCat = INCOME_CATEGORIES.includes(currentCat);
          autoEdits[tx.id] = {
            movement: 'EXPENSE',
            category: isIncomeCat ? 'other_expense' : currentCat,
          };
        }
      }
      if (Object.keys(autoEdits).length > 0) {
        setEdits(prev => ({ ...autoEdits, ...prev }));
        setMismatchAutoApplied(true);
      }
    }
  }, [mismatchedIds, transactions, mismatchAutoApplied, isLocked]);

  // Reset auto-applied flag when modal closes
  useMemo(() => {
    if (!open) setMismatchAutoApplied(false);
  }, [open]);

  const [isSaving, setIsSaving] = useState(false);

  // Get categories for a movement type
  const getCategoriesForMovement = (movement: MovementType): string[] => {
    switch (movement) {
      case "INCOME":
        return INCOME_CATEGORIES;
      case "EXPENSE":
        return EXPENSE_CATEGORIES;
      case "TRANSFER":
        return TRANSFER_CATEGORIES;
      default:
        return EXPENSE_CATEGORIES;
    }
  };

  // Get effective movement for a transaction (considering edits)
  const getEffectiveMovement = (tx: MonthTransaction): MovementType => {
    if (edits[tx.id]?.movement) {
      return edits[tx.id].movement!;
    }
    if (tx.movement) {
      return tx.movement;
    }
    // Infer from legacy type
    switch (tx.type?.toLowerCase()) {
      case "income":
        return "INCOME";
      case "transfer":
        return "TRANSFER";
      default:
        return "EXPENSE";
    }
  };

  // Get effective category for a transaction (normalized)
  const getEffectiveCategory = (tx: MonthTransaction): string => {
    if (edits[tx.id]?.category) {
      return edits[tx.id].category!;
    }
    // Normalize the category from DB to handle legacy values
    return normalizeCategory(tx.category || "other_expense");
  };

  // Effective amount (considering edits) — preserves sign based on movement
  const getEffectiveAmount = (tx: MonthTransaction): number => {
    const edited = edits[tx.id]?.amount;
    return edited !== undefined ? edited : tx.amount;
  };

  // Effective hidden flag
  const isEffectivelyHidden = (tx: MonthTransaction): boolean => {
    const edited = edits[tx.id]?.is_hidden;
    return edited !== undefined ? edited : tx.is_hidden;
  };

  // Toggle hide/show
  const handleToggleHidden = (transactionId: string) => {
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx) return;
    const current = isEffectivelyHidden(tx);
    setEdits(prev => ({
      ...prev,
      [transactionId]: {
        ...prev[transactionId],
        is_hidden: !current,
      },
    }));
  };

  // Revert a single edited field on a transaction
  const handleRevertField = (
    transactionId: string,
    field: "movement" | "category" | "amount" | "is_hidden",
  ) => {
    setEdits(prev => {
      const current = prev[transactionId];
      if (!current) return prev;
      const next = { ...current };
      delete next[field];
      if (field === "amount") delete next.splitCount;
      // If movement was reverted, also clear category if it was auto-set with the movement
      const isEmpty = Object.keys(next).length === 0;
      const newEdits = { ...prev };
      if (isEmpty) {
        delete newEdits[transactionId];
      } else {
        newEdits[transactionId] = next;
      }
      return newEdits;
    });
  };

  // Revert all edits on a single transaction
  const handleRevertRow = (transactionId: string) => {
    setEdits(prev => {
      const next = { ...prev };
      delete next[transactionId];
      return next;
    });
  };

  // Discard all pending edits in the modal
  const handleDiscardAllEdits = () => {
    setEdits({});
  };

  // Edit amount (preserve sign based on effective movement)
  const handleAmountChange = (transactionId: string, rawValue: string) => {
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx) return;
    // Allow simple math expressions like "20/4", "10+5", "100*0.5"
    const sanitized = rawValue.replace(/\s/g, "").replace(",", ".");
    let parsed: number;
    if (/^-?[\d.]+$/.test(sanitized)) {
      parsed = parseFloat(sanitized);
    } else if (/^-?[\d+\-*/.()]+$/.test(sanitized)) {
      try {
        // Safe: only digits and math operators allowed by regex above
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${sanitized});`)();
        parsed = typeof result === "number" && isFinite(result) ? result : NaN;
      } catch {
        return;
      }
    } else {
      return;
    }
    if (isNaN(parsed)) return;
    const movement = getEffectiveMovement(tx);
    const sign = movement === "EXPENSE" ? -1 : 1;
    const newAmount = sign * Math.abs(parsed);
    setEdits(prev => ({
      ...prev,
      [transactionId]: {
        ...prev[transactionId],
        amount: newAmount,
        splitCount: undefined,
      },
    }));
  };

  // Apply split: divide original amount by N people
  const handleApplySplit = (transactionId: string, splitCount: number) => {
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx || splitCount < 1) return;
    const original = tx.amount; // always split from original DB amount
    const newAmount = Math.sign(original || 1) * (Math.abs(original) / splitCount);
    setEdits(prev => ({
      ...prev,
      [transactionId]: {
        ...prev[transactionId],
        amount: newAmount,
        splitCount,
      },
    }));
  };

  // Scroll to first edited row
  const scrollToFirstEdit = () => {
    const firstEditedId = Object.keys(edits)[0];
    if (!firstEditedId) return;
    const el = rowRefs.current[firstEditedId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 1500);
    }
  };

  // Handle movement change
  const handleMovementChange = (transactionId: string, newMovement: MovementType) => {
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx) return;

    // Get default category for the new movement type
    const categoriesForMovement = getCategoriesForMovement(newMovement);
    const defaultCategory = categoriesForMovement[0];
    
    // Find category ID
    const category = categories.find(c => c.slug === defaultCategory);

    setEdits(prev => ({
      ...prev,
      [transactionId]: {
        ...prev[transactionId],
        movement: newMovement,
        category: defaultCategory,
      },
    }));
  };

  // Handle category change
  const handleCategoryChange = (transactionId: string, newCategorySlug: string) => {
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx) return;

    const effectiveMovement = getEffectiveMovement(tx);
    const category = categories.find(c => c.slug === newCategorySlug);

    setEdits(prev => ({
      ...prev,
      [transactionId]: {
        ...prev[transactionId],
        category: newCategorySlug,
      },
    }));
  };

  // Translate movement label
  const translateMovement = (movement: MovementType): string => {
    return getMovementLabel(movement);
  };

  // Translate category label
  const translateCategory = (slug: string): string => {
    return getCategoryLabel(slug);
  };

  const summary = useMemo(() => {
    const visible = transactions.filter((t) => !isEffectivelyHidden(t));
    const income = visible
      .filter((t) => getEffectiveMovement(t) === "INCOME")
      .reduce((sum, t) => sum + Math.abs(getEffectiveAmount(t)), 0);
    const expenses = visible
      .filter((t) => getEffectiveMovement(t) === "EXPENSE")
      .reduce((sum, t) => sum + Math.abs(getEffectiveAmount(t)), 0);
    const transfers = visible
      .filter((t) => getEffectiveMovement(t) === "TRANSFER").length;
    // Count only transactions whose effective values actually differ from the
    // original DB values. If a user edits and then reverts back, it counts as 0.
    const edited = transactions.reduce((count, tx) => {
      const e = edits[tx.id];
      if (!e) return count;
      const movementChanged = e.movement !== undefined && e.movement !== (tx.movement ?? getEffectiveMovement(tx));
      const categoryChanged = e.category !== undefined && e.category !== normalizeCategory(tx.category || "");
      const amountChanged = e.amount !== undefined && e.amount !== tx.amount;
      const hiddenChanged = e.is_hidden !== undefined && e.is_hidden !== tx.is_hidden;
      return (movementChanged || categoryChanged || amountChanged || hiddenChanged) ? count + 1 : count;
    }, 0);
    const hidden = transactions.filter((t) => isEffectivelyHidden(t)).length;
    return { income, expenses, transfers, edited, hidden };
  }, [transactions, edits]);

  const getMovementIcon = (movement: MovementType) => {
    switch (movement) {
      case "INCOME":
        return <span className="inline-flex items-center justify-center w-4 h-4 text-success font-semibold text-base leading-none">+</span>;
      case "EXPENSE":
        return <span className="inline-flex items-center justify-center w-4 h-4 text-destructive font-semibold text-base leading-none">−</span>;
      case "TRANSFER":
        return <ArrowRightLeft className="w-3.5 h-3.5 text-warning" />;
      default:
        return null;
    }
  };

  const getMovementColor = (movement: MovementType): string => {
    switch (movement) {
      case "INCOME":
        return "text-success";
      case "EXPENSE":
        return "text-destructive";
      case "TRANSFER":
        return "text-warning";
      default:
        return "";
    }
  };

  const handleCancel = () => {
    setEdits({});
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    const editEntries = Object.entries(edits);
    console.log('[MonthReviewModal] handleConfirm fired. editEntries:', editEntries);
    if (editEntries.length === 0) {
      onOpenChange(false);
      return;
    }

    setIsSaving(true);
    try {
      const pendingRules: PotentialRule[] = [];
      const savedTxIds: string[] = [];

      const savePromises = editEntries.map(async ([txId, edit]) => {
        const tx = transactions.find(t => t.id === txId);
        if (!tx) {
          console.warn('[MonthReviewModal] tx not found for edit', txId);
          return;
        }

        const effectiveMovement = edit.movement || getEffectiveMovement(tx);
        const effectiveCategory = edit.category || normalizeCategory(tx.category || "other_expense");
        const category = categories.find(c => c.slug === effectiveCategory);

        const updatePayload: Record<string, unknown> = {};
        // Only update movement/category if they actually changed
        const movementChanged = edit.movement !== undefined && edit.movement !== tx.movement;
        const categoryChanged = edit.category !== undefined && edit.category !== normalizeCategory(tx.category);
        if (movementChanged || categoryChanged) {
          updatePayload.movement = effectiveMovement;
          updatePayload.category = effectiveCategory;
          updatePayload.category_id = category?.id || null;
          updatePayload.category_source = "MANUAL";
          updatePayload.categorized_by = "user";
          updatePayload.user_corrected = true;
        }
        if (edit.amount !== undefined && edit.amount !== tx.amount) {
          updatePayload.amount = edit.amount;
        }
        if (edit.is_hidden !== undefined && edit.is_hidden !== tx.is_hidden) {
          updatePayload.is_hidden = edit.is_hidden;
        }
        console.log('[MonthReviewModal] tx', txId, {
          edit,
          dbMovement: tx.movement,
          dbCategory: tx.category,
          normalizedDbCategory: normalizeCategory(tx.category),
          movementChanged,
          categoryChanged,
          updatePayload,
        });
        if (Object.keys(updatePayload).length === 0) {
          console.warn('[MonthReviewModal] skipped tx (no changes detected)', txId);
          return;
        }

        const { error: updateError } = await supabase
          .from("transactions")
          .update(updatePayload)
          .eq("id", txId);

        if (updateError) {
          console.error('[MonthReviewModal] update error', txId, updateError);
          throw updateError;
        }
        console.log('[MonthReviewModal] update OK', txId);
        savedTxIds.push(txId);

        // Only suggest a smart rule when category/movement actually changed
        if (!movementChanged && !categoryChanged) return;

        const cleanDesc = (tx.description_norm || tx.description)
          .replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, '')
          .trim();

        // Build a smart rule from the description
        const ruleData = buildRuleFromCorrection(cleanDesc, effectiveMovement, effectiveCategory);

        if (category?.id) {
          pendingRules.push({
            pattern: ruleData.pattern,
            match_type: ruleData.match_type,
            tokens: ruleData.tokens,
            categorySlug: effectiveCategory,
            categoryId: category.id,
            movement: effectiveMovement,
            txDescription: cleanDesc,
          });
        }
      });

      await Promise.all(savePromises);

      queryClient.invalidateQueries({ queryKey: ["month-transactions", monthKey] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });

      toast({
        title: `✓ ${editEntries.length} change(s) saved`,
        description: `Transactions updated for ${monthLabel}`,
        duration: 4000,
      });

      setEdits({});
      setEditedTxIds(savedTxIds);

      if (pendingRules.length > 0) {
        setPotentialRules(pendingRules);
        setSelectedRuleIndices(new Set(pendingRules.map((_, i) => i))); // all selected by default
        setShowRuleSelectionDialog(true);
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error saving edits:", error);
      toast({
        title: "Error",
        description: "Could not save some changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSelectedRules = async () => {
    const selectedRules = potentialRules.filter((_, i) => selectedRuleIndices.has(i));
    
    if (selectedRules.length === 0) {
      setShowRuleSelectionDialog(false);
      setPotentialRules([]);
      setSelectedRuleIndices(new Set());
      onOpenChange(false);
      return;
    }

    setIsSaving(true);
    try {
      const newRules: CreatedRule[] = [];

      for (const rule of selectedRules) {
        if (user) {
          const { data: insertedRule, error: ruleError } = await supabase
            .from("user_rules")
            .insert({
              user_id: user.id,
              source: "user_correction" as const,
              match_type: rule.match_type,
              pattern: rule.pattern,
              tokens: rule.tokens,
              movement: rule.movement,
              category: rule.categorySlug,
              confidence: 0.99,
              original_description: rule.txDescription,
              is_active: true,
            })
            .select("id")
            .single();

          if (!ruleError && insertedRule) {
            newRules.push({ ...rule, ruleId: insertedRule.id });
          } else {
            console.warn("Could not create user rule:", ruleError);
          }
        }
      }

      // No longer dual-writing to categorization_rules — the edge function
      // now reads both user_rules and categorization_rules directly.

      queryClient.invalidateQueries({ queryKey: ["categorization_rules"] });

      toast({
        title: `✓ ${newRules.length} rule(s) created`,
        description: `These patterns will be used for future categorization`,
        duration: 5000,
      });

      setShowRuleSelectionDialog(false);
      setPotentialRules([]);
      setSelectedRuleIndices(new Set());

      if (newRules.length > 0) {
        setCreatedRules(newRules);
        setShowRetroactiveDialog(true);
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error creating rules:", error);
      toast({
        title: "Error",
        description: "Could not create some rules. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkipRuleSelection = () => {
    setShowRuleSelectionDialog(false);
    setPotentialRules([]);
    setSelectedRuleIndices(new Set());
    onOpenChange(false);
  };

  const toggleRuleSelection = (index: number) => {
    setSelectedRuleIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleApplyRetroactive = async () => {
    setIsApplyingRetroactive(true);
    try {
      // Fetch all user transactions to find matches client-side
      const { data: allTransactions, error: fetchError } = await supabase
        .from("transactions")
        .select("id, description, description_norm, category, movement")
        .eq("user_id", user!.id)
        .eq("domain", "CASHFLOW");

      if (fetchError) throw fetchError;

      let totalUpdated = 0;

      for (const rule of createdRules) {
        // Find matching transactions (excluding already-edited ones)
        const matches = (allTransactions || []).filter(tx => {
          if (editedTxIds.includes(tx.id)) return false;
          const desc = tx.description_norm || tx.description;
          return ruleMatchesDescription(rule.match_type, rule.pattern, rule.tokens, desc);
        });

        if (matches.length === 0) continue;

        const matchIds = matches.map(tx => tx.id);

        // Update in batches of 100
        for (let i = 0; i < matchIds.length; i += 100) {
          const batch = matchIds.slice(i, i + 100);
          const { error: updateError } = await supabase
            .from("transactions")
            .update({
              movement: rule.movement as any,
              category: rule.categorySlug,
              category_id: rule.categoryId,
              category_source: "USER_RULE",
              categorized_by: "user_rule",
              auto_recategorized: true,
              rule_id_applied: rule.ruleId,
            })
            .in("id", batch);

          if (updateError) {
            console.warn("Error updating batch:", updateError);
          } else {
            totalUpdated += batch.length;
          }
        }

        // Update applied_count on the rule
        await supabase
          .from("user_rules")
          .update({
            applied_count: matches.length,
            last_applied_at: new Date().toISOString(),
          })
          .eq("id", rule.ruleId);
      }

      if (totalUpdated > 0) {
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["month-transactions"] });
        
        toast({
          title: "✓ Rules applied to history",
          description: `${totalUpdated} historical transaction(s) re-categorized`,
          duration: 5000,
        });
      } else {
        toast({
          title: "No additional matches",
          description: "No other transactions matched these patterns",
          duration: 4000,
        });
      }
    } catch (error) {
      console.error("Error applying retroactive rules:", error);
      toast({
        title: "Error",
        description: "Could not apply rules to historical data",
        variant: "destructive",
      });
    } finally {
      setIsApplyingRetroactive(false);
      setShowRetroactiveDialog(false);
      setCreatedRules([]);
      setEditedTxIds([]);
      onOpenChange(false);
    }
  };

  const handleSkipRetroactive = () => {
    setShowRetroactiveDialog(false);
    setCreatedRules([]);
    setEditedTxIds([]);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v && !showRetroactiveDialog) handleCancel(); else onOpenChange(v); }}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full flex flex-col dashboard-theme !bg-white text-foreground">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Pencil className="w-5 h-5 text-primary" />
              Edit · {monthLabel}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {transactions.length} transactions · changes are saved only when you click <span className="font-medium text-foreground">Save</span>.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Pencil className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No transactions for this month</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Upload and process files first
              </p>
            </div>
          ) : (
            <>
              {/* Locked Banner */}
              {isLocked && (
                <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg border">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    This month is closed. You cannot edit categories.
                  </span>
                </div>
              )}

              {/* Mismatch Warning Banner */}
              {mismatchedIds.size > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-300 dark:border-amber-700">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-sm text-amber-800 dark:text-amber-300">
                    <strong>{mismatchedIds.size}</strong> transaction{mismatchedIds.size !== 1 ? 's have' : ' has'} sign-movement mismatches (positive amount marked as Expense or vice versa). {isLocked ? 'Reopen the month to fix them.' : 'Review the highlighted rows — corrections have been pre-applied.'}
                  </span>
                </div>
              )}

              {/* Stats Summary */}
              <div className="flex gap-2 flex-wrap items-center text-sm">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 rounded-lg">
                  <span className="text-success font-semibold text-base leading-none">+</span>
                  <span className="text-success font-medium tabular-nums">{formatCurrency(summary.income)}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 rounded-lg">
                  <span className="text-destructive font-semibold text-base leading-none">−</span>
                  <span className="text-destructive font-medium tabular-nums">{formatCurrency(summary.expenses)}</span>
                </div>
                {summary.transfers > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-warning/10 rounded-lg">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-warning" />
                    <span className="text-warning font-medium">{summary.transfers}</span>
                  </div>
                )}
                {summary.edited > 0 && !isLocked && (
                  <div className="inline-flex items-center gap-1 ml-1">
                    <button
                      type="button"
                      onClick={scrollToFirstEdit}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                      title="Jump to first edited row"
                    >
                      <Pencil className="w-3 h-3" />
                      {summary.edited} edited
                    </button>
                    <button
                      type="button"
                      onClick={handleDiscardAllEdits}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs font-medium transition-colors"
                      title="Discard all unsaved changes"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Discard
                    </button>
                  </div>
                )}
                {summary.hidden > 0 && (
                  <label className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-muted text-muted-foreground text-xs cursor-pointer">
                    <Switch
                      checked={showHidden}
                      onCheckedChange={setShowHidden}
                      className="scale-75"
                    />
                    <EyeOff className="w-3.5 h-3.5" />
                    Show hidden ({summary.hidden})
                  </label>
                )}
                {!isLocked && (
                  <div className="ml-auto inline-flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5 border border-border">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      onClick={handleUndo}
                      disabled={!canUndo}
                      title="Undo (⌘Z)"
                    >
                      <Undo className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      onClick={handleRedo}
                      disabled={!canRedo}
                      title="Redo (⌘⇧Z)"
                    >
                      <Redo className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Transaction Table */}
              <div ref={tableScrollRef} className="flex-1 min-h-0 border rounded-lg overflow-auto bg-white">
                <Table className="w-full table-fixed">
                  <TableHeader className="sticky top-0 z-10 bg-white">
                   <TableRow className="hover:bg-transparent">
                       <TableHead className="w-[8%]">Date</TableHead>
                       <TableHead className="w-[26%]">Description</TableHead>
                       <TableHead className="w-[10%]">Account</TableHead>
                       <TableHead className="w-[11%]">Movement</TableHead>
                       <TableHead className="w-[15%]">Category</TableHead>
                       <TableHead className="text-right w-[13%]">Amount</TableHead>
                       <TableHead className="text-center w-[6%]">Split</TableHead>
                       <TableHead className="text-center w-[5%]">Show</TableHead>
                       <TableHead className="text-center w-[6%]">Revert</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .filter((tx) => showHidden || !isEffectivelyHidden(tx))
                      .map((tx) => {
                      const effectiveMovement = getEffectiveMovement(tx);
                      const effectiveCategory = getEffectiveCategory(tx);
                      const availableCategories = getCategoriesForMovement(effectiveMovement);
                      const isEdited = !!edits[tx.id];
                      const editedFields = edits[tx.id] || {};
                      const movementChanged = editedFields.movement !== undefined && editedFields.movement !== tx.movement;
                      const categoryChanged = editedFields.category !== undefined && editedFields.category !== normalizeCategory(tx.category);
                      const amountChanged = editedFields.amount !== undefined && editedFields.amount !== tx.amount;
                      const hidden = isEffectivelyHidden(tx);
                      const effectiveAmount = getEffectiveAmount(tx);
                      
                      const cleanDescription = (tx.description_norm || tx.description)
                        .replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, '')
                        .trim();
                      
                      return (
                        <TableRow 
                          key={tx.id}
                          ref={(el) => { rowRefs.current[tx.id] = el; }}
                          className={cn(
                            "transition-all",
                            isEdited && !mismatchedIds.has(tx.id) && "bg-primary/5 border-l-2 border-l-primary",
                            mismatchedIds.has(tx.id) && "bg-amber-50/60 dark:bg-amber-950/20 border-l-2 border-l-amber-400",
                            hidden && "opacity-40"
                          )}
                        >
                          <TableCell className="text-sm">
                            {formatDate(new Date(tx.date))}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-start gap-2 min-w-0">
                              <span className={cn("break-words flex-1", hidden && "line-through")} title={cleanDescription}>
                                {cleanDescription}
                              </span>
                              {isEdited && (
                                <Badge variant="secondary" className="bg-primary/15 text-primary text-[10px] h-4 px-1.5 shrink-0 mt-0.5">
                                  Edited
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {getAccountNameById(tx.account_id) || tx.bank || '—'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {isLocked ? (
                              <div className="flex items-center gap-1.5">
                                {mismatchedIds.has(tx.id) && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                {getMovementIcon(effectiveMovement)}
                                <span className={cn("font-medium", getMovementColor(effectiveMovement))}>
                                  {translateMovement(effectiveMovement)}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1">
                              {mismatchedIds.has(tx.id) && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                              <Select
                                value={effectiveMovement}
                                onValueChange={(value) => handleMovementChange(tx.id, value as MovementType)}
                                disabled={hidden}
                              >
                                <SelectTrigger className="h-8 text-sm border border-border bg-transparent hover:bg-muted/50">
                                  <SelectValue>
                                    <div className="flex items-center gap-1.5">
                                      {getMovementIcon(effectiveMovement)}
                                      <span className="text-foreground">
                                        {translateMovement(effectiveMovement)}
                                      </span>
                                    </div>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="INCOME">
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex items-center justify-center w-4 h-4 text-success font-semibold text-base leading-none">+</span>
                                      <span className="text-success">{translateMovement("INCOME")}</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="EXPENSE">
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex items-center justify-center w-4 h-4 text-destructive font-semibold text-base leading-none">−</span>
                                      <span className="text-destructive">{translateMovement("EXPENSE")}</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="TRANSFER">
                                    <div className="flex items-center gap-2">
                                      <ArrowRightLeft className="w-3.5 h-3.5 text-warning" />
                                      <span className="text-warning">{translateMovement("TRANSFER")}</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              </div>
                              {movementChanged && tx.movement && (
                                <button
                                  type="button"
                                  onClick={() => handleRevertField(tx.id, "movement")}
                                  className="group/rv inline-flex items-center gap-1 pl-1 text-[10px] text-muted-foreground hover:text-primary transition-colors w-fit"
                                  title={`Revert to ${translateMovement(tx.movement)}`}
                                >
                                  <Undo2 className="w-2.5 h-2.5 opacity-60 group-hover/rv:opacity-100" />
                                  <span className="line-through group-hover/rv:no-underline">
                                    {translateMovement(tx.movement)}
                                  </span>
                                </button>
                              )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {isLocked ? (
                              <div className="flex items-center gap-1.5">
                                <CategoryIcon 
                                  iconName={getCategoryIcon(effectiveCategory)} 
                                  colorVar={getCategoryColor(effectiveCategory)} 
                                  size="sm"
                                />
                                <span>{translateCategory(effectiveCategory)}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                              <Select
                                value={effectiveCategory}
                                onValueChange={(value) => handleCategoryChange(tx.id, value)}
                                disabled={hidden}
                              >
                                <SelectTrigger 
                                  className="h-8 text-sm border-0"
                                  style={{ backgroundColor: `hsl(var(--${getCategoryColor(effectiveCategory)}) / 0.12)` }}
                                >
                                  <SelectValue>
                                    <div className="flex items-center gap-1.5">
                                      <CategoryIcon 
                                        iconName={getCategoryIcon(effectiveCategory)} 
                                        colorVar={getCategoryColor(effectiveCategory)} 
                                        size="sm"
                                        showBackground={false}
                                      />
                                      {translateCategory(effectiveCategory)}
                                    </div>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {availableCategories.map((catSlug) => (
                                    <SelectItem key={catSlug} value={catSlug}>
                                      <div className="flex items-center gap-2">
                                        <CategoryIcon 
                                          iconName={getCategoryIcon(catSlug)} 
                                          colorVar={getCategoryColor(catSlug)} 
                                          size="sm"
                                          showBackground={false}
                                        />
                                        {translateCategory(catSlug)}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {categoryChanged && (
                                <button
                                  type="button"
                                  onClick={() => handleRevertField(tx.id, "category")}
                                  className="group/rv inline-flex items-center gap-1 pl-1 text-[10px] text-muted-foreground hover:text-primary transition-colors w-fit"
                                  title={`Revert to ${translateCategory(normalizeCategory(tx.category))}`}
                                >
                                  <Undo2 className="w-2.5 h-2.5 opacity-60 group-hover/rv:opacity-100" />
                                  <span className="line-through group-hover/rv:no-underline">
                                    {translateCategory(normalizeCategory(tx.category))}
                                  </span>
                                </button>
                              )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {isLocked ? (
                              <span className="font-medium tabular-nums">{formatCurrency(effectiveAmount)}</span>
                            ) : (
                              <AmountDisplay
                                tx={tx}
                                effectiveAmount={effectiveAmount}
                                originalAmount={tx.amount}
                                amountChanged={amountChanged}
                                splitCount={editedFields.splitCount}
                                onRevert={() => handleRevertField(tx.id, "amount")}
                                formatCurrency={formatCurrency}
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {!isLocked && (
                              <SplitButton
                                originalAmount={tx.amount}
                                effectiveAmount={effectiveAmount}
                                amountChanged={amountChanged}
                                splitCount={editedFields.splitCount}
                                disabled={hidden}
                                onApplySplit={(n) => handleApplySplit(tx.id, n)}
                                onChangeAmount={(v) => handleAmountChange(tx.id, v)}
                                formatCurrency={formatCurrency}
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {!isLocked && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-7 w-7",
                                  hidden
                                    ? "text-muted-foreground hover:text-foreground"
                                    : "text-muted-foreground/60 hover:text-foreground"
                                )}
                                onClick={() => handleToggleHidden(tx.id)}
                                title={hidden ? "Include in totals" : "Hide from totals"}
                              >
                                {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {!isLocked && isEdited && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleRevertRow(tx.id)}
                                title="Revert all changes on this row"
                              >
                                <Undo2 className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={transactions.length === 0 || isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              {Object.keys(edits).length > 0 ? `Save ${Object.keys(edits).length} change(s)` : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rule Selection Dialog */}
      <AlertDialog open={showRuleSelectionDialog} onOpenChange={setShowRuleSelectionDialog}>
        <AlertDialogContent className="dashboard-theme bg-background text-foreground max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Save as categorization rules?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Select which changes should become permanent rules. Future transactions with similar descriptions will be automatically categorized.
                </p>
                <div className="space-y-2 max-h-60 overflow-auto">
                  {potentialRules.map((rule, i) => (
                    <label
                      key={i}
                      className={cn(
                        "flex items-center gap-3 text-sm px-3 py-2.5 rounded-lg border cursor-pointer transition-colors",
                        selectedRuleIndices.has(i)
                          ? "bg-primary/5 border-primary/30"
                          : "bg-muted/30 border-border/50 opacity-70"
                      )}
                    >
                      <Checkbox
                        checked={selectedRuleIndices.has(i)}
                        onCheckedChange={() => toggleRuleSelection(i)}
                      />
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="truncate text-foreground" title={rule.txDescription}>
                          "{rule.txDescription.substring(0, 40)}{rule.txDescription.length > 40 ? '…' : ''}"
                        </span>
                        <span className="text-muted-foreground shrink-0">→</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <CategoryIcon
                            iconName={getCategoryIcon(rule.categorySlug)}
                            colorVar={getCategoryColor(rule.categorySlug)}
                            size="sm"
                            showBackground={false}
                          />
                          <span className="font-medium text-foreground whitespace-nowrap">
                            {translateCategory(rule.categorySlug)}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedRuleIndices.size} of {potentialRules.length} selected
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkipRuleSelection} disabled={isSaving}>
              Skip all
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveSelectedRules} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Save {selectedRuleIndices.size} rule(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Retroactive Rules Dialog */}
      <AlertDialog open={showRetroactiveDialog} onOpenChange={setShowRetroactiveDialog}>
        <AlertDialogContent className="dashboard-theme bg-background text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Apply rules to historical data?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  {createdRules.length} new categorization rule(s) were created:
                </p>
                <div className="space-y-1.5 max-h-40 overflow-auto">
                  {createdRules.map((rule, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm px-2 py-1 rounded bg-muted/50">
                      <CategoryIcon 
                        iconName={getCategoryIcon(rule.categorySlug)} 
                        colorVar={getCategoryColor(rule.categorySlug)} 
                        size="sm"
                        showBackground={false}
                      />
                      <span className="truncate text-foreground" title={rule.txDescription}>
                        "{rule.txDescription.substring(0, 35)}{rule.txDescription.length > 35 ? '…' : ''}"
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium text-foreground whitespace-nowrap">
                        {translateCategory(rule.categorySlug)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground">
                  Do you want to apply these rules to all existing transactions with matching descriptions? This will re-categorize historical data automatically.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkipRetroactive} disabled={isApplyingRetroactive}>
              Skip
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyRetroactive} disabled={isApplyingRetroactive}>
              {isApplyingRetroactive ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Brain className="w-4 h-4 mr-2" />
              )}
              Apply to all history
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// AmountDisplay: read-only amount display with revert affordance.
// (Editing is handled in the Split column popover.)
// ─────────────────────────────────────────────────────────────
interface AmountDisplayProps {
  tx: MonthTransaction;
  effectiveAmount: number;
  originalAmount: number;
  amountChanged: boolean;
  splitCount?: number;
  onRevert: () => void;
  formatCurrency: (n: number) => string;
}

function AmountDisplay({
  effectiveAmount,
  originalAmount,
  amountChanged,
  splitCount,
  onRevert,
  formatCurrency,
}: AmountDisplayProps) {
  const isNeg = effectiveAmount < 0;
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span
        className={cn(
          "tabular-nums text-sm font-medium",
          amountChanged ? "text-primary" : "text-foreground",
        )}
      >
        {isNeg ? "-" : ""}
        {formatCurrency(Math.abs(effectiveAmount))}
      </span>
      {amountChanged && (
        <button
          type="button"
          onClick={onRevert}
          className="group/rv inline-flex items-center gap-1 pr-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
          title="Revert amount"
        >
          <Undo2 className="w-2.5 h-2.5 opacity-60 group-hover/rv:opacity-100" />
          <span className="line-through group-hover/rv:no-underline tabular-nums">
            {formatCurrency(Math.abs(originalAmount))}
            {splitCount && splitCount > 1 ? ` (÷${splitCount})` : ""}
          </span>
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SplitButton: edit amount manually OR split it across N people.
// Opens a popover with both controls.
// ─────────────────────────────────────────────────────────────
interface SplitButtonProps {
  originalAmount: number;
  effectiveAmount: number;
  amountChanged: boolean;
  splitCount?: number;
  disabled: boolean;
  onApplySplit: (n: number) => void;
  onChangeAmount: (rawValue: string) => void;
  formatCurrency: (n: number) => string;
}

function SplitButton({
  originalAmount,
  effectiveAmount,
  amountChanged,
  splitCount,
  disabled,
  onApplySplit,
  onChangeAmount,
  formatCurrency,
}: SplitButtonProps) {
  const [open, setOpen] = useState(false);
  const [splitN, setSplitN] = useState<number>(splitCount || 2);
  const isSplit = !!splitCount && splitCount > 1;
  const isActive = isSplit || amountChanged;

  const formatSigned = (n: number) => {
    const sign = n < 0 ? "-" : "";
    return `${sign}${Math.abs(n).toFixed(2)}`;
  };
  const [amountInput, setAmountInput] = useState<string>(formatSigned(effectiveAmount));

  // Re-sync local input when popover opens or external amount changes
  useEffect(() => {
    if (open) setAmountInput(formatSigned(effectiveAmount));
  }, [open, effectiveAmount]);

  const commitAmount = () => {
    if (amountInput === "" || amountInput === "-") return;
    onChangeAmount(amountInput);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-7 px-2 gap-1 text-xs font-medium",
            isActive
              ? "text-primary bg-primary/10 hover:bg-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
          title="Edit amount or split across people"
        >
          <Pencil className="w-3.5 h-3.5" />
          {isSplit && <span className="tabular-nums">÷{splitCount}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-4">
          {/* Edit amount manually */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Edit amount
            </label>
            <div className="flex gap-2 mt-1">
              <Input
                type="text"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commitAmount();
                    setOpen(false);
                  }
                }}
                title="You can type expressions like 20/4 or 10+5"
                className="h-8 text-right tabular-nums text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => { commitAmount(); setOpen(false); }}
              >
                Apply
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Tip: you can type expressions like <span className="font-mono">20/4</span> or <span className="font-mono">10+5</span>
            </p>
          </div>

          <div className="border-t border-border" />

          {/* Split across N people */}
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <SplitIcon className="w-3 h-3" />
              Split between N people
            </label>
            <Input
              type="number"
              min={1}
              step={1}
              value={splitN}
              onChange={(e) => setSplitN(Math.max(1, parseInt(e.target.value) || 1))}
              className="h-8 mt-1"
            />
            <div className="text-xs text-muted-foreground mt-2">
              Original: <span className="tabular-nums">{formatCurrency(Math.abs(originalAmount))}</span>
            </div>
            <div className="text-sm font-medium">
              Your share: <span className="tabular-nums">{formatCurrency(Math.abs(originalAmount) / splitN)}</span>
            </div>
            <Button
              size="sm"
              className="w-full h-8 mt-2"
              onClick={() => { onApplySplit(splitN); setOpen(false); }}
            >
              Apply ÷ {splitN}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
