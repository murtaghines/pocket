import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  AlertTriangle,
  ArrowRightLeft,
  Plus,
  Minus,
  Split as SplitIcon,
  RotateCcw,
  FileSpreadsheet,
  Trash2,
  Pencil,
  Copy,
} from "lucide-react";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { cn } from "@/lib/utils";
import { evalArithmetic } from "@/lib/safeMath";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { CategoryIcon } from "@/components/ui/category-icon";
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
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useCategorizationRules } from "@/hooks/useCategorizationRules";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { useLocalization } from "@/hooks/useLocalization";
import { useToast } from "@/hooks/use-toast";
import type { Import } from "@/hooks/useImports";
import { getAccountDisplayName } from "@/lib/accountColors";
import { RuleEditorDialog } from "../RuleEditorDialog";
import type { RuleEditorPayload } from "../RuleEditorDialog";
import {
  normalizeCategory,
} from "@/lib/categoryTranslations";
import { buildSplitMap, applySplitFast } from "@/lib/splitAmount";
import {
  USER_TRACKED_FIELDS,
  getCategoriesForMovement,
  getMovementIcon,
  getMovementTone,
  buildOriginalSnapshot,
  isBackToOriginal,
  filterRevertableSnapshot,
  withAmountOriginalReset,
} from "./helpers";
import { RowEditIndicator } from "./RowEditIndicator";
import { RevertToOriginalButton } from "./RevertToOriginalButton";
import { TransactionContextMenu } from "./TransactionContextMenu";
import { toast as sonnerToast } from "sonner";
import { isManualTransaction } from "@/lib/transactionSource";
import { ManualEntryFooter } from "./ManualEntryFooter";
import { ProcessingPanel } from "./ProcessingPanel";
import { SwipeableRow } from "./SwipeableRow";
import { MobileTransactionActions } from "./MobileTransactionActions";
import { TransactionEditDrawer } from "./TransactionEditDrawer";
import { BulkActionsToolbar } from "./BulkActionsToolbar";
import { AccountSheetTabs, type AccountTab } from "./AccountSheetTabs";
import type {
  MonthTransaction,
  AuditEntry,
  PendingEditShape,
  PendingFileInfo,
  MovementType,
} from "./types";
import type { SortColumn, SortDirection, DataFilters, TabSummary } from "./DataToolbar";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Tables"]["categories"]["Row"];

function getISOWeek(dateStr: string): number {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

export interface InlineTransactionsEditorProps {
  monthKey: string;
  monthLabel: string;
  imports: Import[];
  cashAccounts: ReturnType<typeof useAccounts>["accounts"];
  deleteImport: (id: string) => void;
  isDeleting: boolean;
  onAddMore: () => void;
  isProcessing: boolean;
  pendingFiles?: PendingFileInfo[];
  manualEntryOpen?: boolean;
  onManualEntryOpenChange?: (open: boolean) => void;
  defaultMovement?: MovementType;
  sortColumn?: SortColumn;
  sortDirection?: SortDirection;
  filters?: DataFilters;
  openingBalance?: number | null;
  accountOpeningBalances?: Record<string, number>;
  closingBalance?: number | null;
  accountClosingBalances?: Record<string, number>;
  activeAccountId?: string | null;
  onAccountChange?: (id: string | null) => void;
  onTabsDataChange?: (data: { tabs: AccountTab[]; summary: TabSummary; globalSummary: TabSummary }) => void;
}

export function InlineTransactionsEditor({
  monthKey,
  monthLabel,
  imports,
  cashAccounts,
  deleteImport,
  isDeleting,
  onAddMore,
  isProcessing,
  pendingFiles,
  manualEntryOpen: externalManualEntryOpen,
  onManualEntryOpenChange,
  defaultMovement,
  sortColumn: sortColumnProp = "date",
  sortDirection: sortDirectionProp = "desc",
  filters: filtersProp,
  openingBalance,
  accountOpeningBalances,
  closingBalance: closingBalanceProp,
  accountClosingBalances,
  activeAccountId: activeAccountIdProp,
  onAccountChange,
  onTabsDataChange,
}: InlineTransactionsEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { categories } = useCategories("CASHFLOW");
  const { accounts } = useAccounts();
  const { addRule, updateRule } = useCategorizationRules();
  const { formatCurrency, formatDate, formatWeekday } = useLocalization();
  const { getCategoryLabel, getMovementLabel, getCategoryIcon, getCategoryColor } = useCategoryTranslations();
  const { t } = useTranslation("common");

  const splitMap = useMemo(() => buildSplitMap(accounts), [accounts]);
  const splitAmt = useCallback(
    (amount: number, accountId?: string | null) => applySplitFast(amount, accountId, splitMap),
    [splitMap],
  );

  const savingsAccountIds = useMemo(
    () => new Set(cashAccounts.filter(a => a.account_type === "SAVINGS").map(a => a.id)),
    [cashAccounts],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const copiedRowsRef = useRef<MonthTransaction[]>([]);
  const recentlyNudgedRef = useRef<Map<string, number>>(new Map());

  // Checkbox selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Account sheet tab state — lifted to parent when props are provided
  const [internalAccountId, setInternalAccountId] = useState<string | null>(null);
  const activeAccountId = activeAccountIdProp ?? internalAccountId;
  const setActiveAccountId = onAccountChange ?? setInternalAccountId;

  // Inline editing state
  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [editingDescValue, setEditingDescValue] = useState("");
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [editingAmountValue, setEditingAmountValue] = useState("");
  const descInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      if (prev.size > 0) return new Set();
      return new Set(ids);
    });
  }, []);

  // Movement-mismatch confirmation (e.g. positive amount marked as EXPENSE)
  const [movementConfirm, setMovementConfirm] = useState<{
    tx: MonthTransaction;
    newMovement: MovementType;
  } | null>(null);

  // Category change → post-hoc "Edit" rule dialog (opened from toast action)
  const [categoryRulePrompt, setCategoryRulePrompt] = useState<{
    tx: MonthTransaction;
    newSlug: string;
    newCategoryId: string | null;
    cleanDesc: string;
    targetMovement: MovementType;
    existingRuleId?: string;
  } | null>(null);

  // Edit-history popover open state (one tx at a time)
  const [openHistoryFor, setOpenHistoryFor] = useState<string | null>(null);

  // Mobile: transaction being edited in the bottom drawer
  const [editingTx, setEditingTx] = useState<MonthTransaction | null>(null);
  const [actionMenu, setActionMenu] = useState<{ tx: MonthTransaction; rect: DOMRect } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null);


  const accountName = (id: string | null) =>
    accounts.find((a) => a.id === id)?.name || null;

  /** "Bank · nickname" — the canonical account display used across the app. */
  const accountLabel = (id: string | null) => {
    const acct = accounts.find((a) => a.id === id);
    return acct ? getAccountDisplayName(acct) : null;
  };

  const importFileExtMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const imp of imports) {
      const ext = imp.file_name?.split(".").pop()?.toLowerCase() ?? "";
      m.set(imp.id, ext);
    }
    return m;
  }, [imports]);

  const getSourceLabel = (tx: MonthTransaction) => {
    if (!tx.import_id) return t("imports.sourceManual");
    const ext = importFileExtMap.get(tx.import_id);
    if (ext === "pdf") return "PDF";
    if (ext === "csv") return "CSV";
    if (ext === "xlsx" || ext === "xls") return "Excel";
    return "File";
  };

  // Fetch transactions for this month
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["month-transactions-inline", monthKey, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const [year, month] = monthKey.split("-").map(Number);
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const { data, error } = await supabase
        .from("transactions")
        .select(
          "id, date, description, description_norm, original_description, amount, amount_original, movement, category, category_id, account_id, is_hidden, import_id, fingerprint, transfer_pair_id, user_notes",
        )
        .eq("user_id", user.id)
        .eq("domain", "CASHFLOW")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false })
        .order("id", { ascending: true });
      if (error) throw error;
      return (data || []) as MonthTransaction[];
    },
    enabled: !!user,
  });

  // Fetch edit history for every tx in this month, grouped by tx id (newest first)
  const { data: auditByTx = {} } = useQuery({
    queryKey: ["tx-audit", monthKey, user?.id],
    queryFn: async () => {
      if (!user || transactions.length === 0) return {};
      const ids = transactions.map((t) => t.id);
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, entity_id, action, created_at, diff_json")
        .eq("user_id", user.id)
        .eq("entity_type", "transaction")
        .in("entity_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const grouped: Record<string, AuditEntry[]> = {};
      for (const row of (data || []) as AuditEntry[]) {
        (grouped[row.entity_id] ||= []).push(row);
      }
      return grouped;
    },
    enabled: !!user && transactions.length > 0,
  });

  // Single auto-save mutation: applies any partial update to a transaction
  const saveMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
      before,
    }: {
      id: string;
      payload: Record<string, unknown>;
      before?: Record<string, unknown>;
    }) => {
      // Extract meta-only keys (prefixed with `__`) so they aren't sent as columns
      const action = (payload as { __action?: string }).__action ?? "edit";
      const updatePayload: Record<string, unknown> = {};
      for (const key of Object.keys(payload)) {
        if (key.startsWith("__")) continue;
        updatePayload[key] = payload[key];
      }
      // INTEGRITY INVARIANT — NEVER put `fingerprint` in this update payload.
      // The fingerprint is frozen at import time (the file's original values) and is what
      // re-upload dedup matches against. If an edit recomputed it from the row's new
      // (shaped) values, re-uploading the same file would no longer match and would
      // silently duplicate the transaction. This is guarded by tests/integrity-invariants.test.ts
      // and documented in docs/epics/uploads.md "Modelo de integridad".
      const { error } = await supabase.from("transactions").update(updatePayload).eq("id", id);
      if (error) throw error;

      // Audit log: record what changed so the user can review/revert later.
      // We only log fields the user actually edited, with before/after snapshots.
      if (user?.id && before) {
        const fields: string[] = [];
        const beforeDiff: Record<string, unknown> = {};
        const afterDiff: Record<string, unknown> = {};
        for (const key of Object.keys(updatePayload)) {
          // Only persist user-meaningful fields
          if (!USER_TRACKED_FIELDS.has(key)) continue;
          const prev = before[key] ?? null;
          const next = updatePayload[key] ?? null;
          if (prev === next) continue;
          fields.push(key);
          beforeDiff[key] = prev;
          afterDiff[key] = next;
        }
        if (fields.length > 0) {
          await supabase.rpc("log_audit_event", {
            _entity_type: "transaction",
            _entity_id: id,
            _action: action,
            _diff: { fields, before: beforeDiff, after: afterDiff } as never,
          });
        }
      }
      return id;
    },
    onSuccess: async () => {
      try { await supabase.rpc("refresh_dashboard_views"); } catch { /* best-effort */ }
      queryClient.invalidateQueries({ queryKey: ["month-transactions-inline", monthKey, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["tx-audit", monthKey, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-period-series"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-opening-balances"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-aggregates"] });
      queryClient.invalidateQueries({ queryKey: ["account-period-summary"] });
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't save change",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveFnAsync = useCallback(
    (args: { id: string; payload: Record<string, unknown>; before: Record<string, unknown> }) =>
      saveMutation.mutateAsync(args).then(() => {}),
    [],
  );
  const undoRedo = useUndoRedo(saveFnAsync);

  const handleDuplicateRow = useCallback(async (tx: MonthTransaction) => {
    if (!user) return;
    const { buildManualFingerprint } = await import("@/lib/transactionSource");
    const fingerprint = await buildManualFingerprint(
      tx.date,
      tx.amount,
      tx.currency || "EUR",
      (tx.description || tx.description_norm || "") + "_copy_" + Date.now(),
    );
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      domain: "CASHFLOW" as const,
      date: tx.date,
      description: tx.description,
      description_norm: tx.description_norm,
      amount: tx.amount,
      movement: tx.movement,
      category: tx.category,
      category_id: tx.category_id,
      account_id: tx.account_id,
      currency: tx.currency,
      fingerprint,
      category_source: "MANUAL",
      categorized_by: "user",
      is_hidden: false,
    });
    if (error) {
      toast({ title: "Couldn't duplicate row", description: error.message, variant: "destructive" });
      return;
    }
    try { await supabase.rpc("refresh_dashboard_views"); } catch { /* best-effort */ }
    queryClient.invalidateQueries({ queryKey: ["month-transactions-inline", monthKey, user?.id] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["tx-count", monthKey, user?.id] });
    sonnerToast(t("imports.rowDuplicated", "Row duplicated"));
  }, [user, monthKey, queryClient, toast, t]);

  const handleCopyRows = useCallback(() => {
    const rows = Array.from(selectedIds)
      .map((id) => transactions.find((tx) => tx.id === id))
      .filter(Boolean) as MonthTransaction[];
    if (rows.length === 0) return;
    copiedRowsRef.current = rows;
    sonnerToast(rows.length === 1 ? "Row copied" : `${rows.length} rows copied`);
  }, [selectedIds, transactions]);

  const handlePasteRows = useCallback(async () => {
    const rows = copiedRowsRef.current;
    if (rows.length === 0) return;
    for (const tx of rows) {
      await handleDuplicateRow(tx);
    }
    if (rows.length > 1) {
      sonnerToast(t("imports.rowsDuplicated", "{{count}} rows duplicated", { count: rows.length }));
    }
  }, [handleDuplicateRow, t]);

  const handleBulkDelete = useCallback(() => {
    const manual = Array.from(selectedIds)
      .map((id) => transactions.find((tx) => tx.id === id))
      .filter((tx): tx is MonthTransaction => !!tx && isManualTransaction(tx));
    for (const tx of manual) deleteWithUndo(tx);
    setSelectedIds(new Set());
  }, [selectedIds, transactions]);

  const handleBulkHide = useCallback(() => {
    selectedIds.forEach((id) => {
      const t = transactions.find((x) => x.id === id);
      if (t && !t.is_hidden) saveMutation.mutate({ id, payload: { is_hidden: true }, before: { is_hidden: false } });
    });
    setSelectedIds(new Set());
  }, [selectedIds, transactions]);

  const handleBulkShow = useCallback(() => {
    selectedIds.forEach((id) => {
      const t = transactions.find((x) => x.id === id);
      if (t && t.is_hidden) saveMutation.mutate({ id, payload: { is_hidden: false }, before: { is_hidden: true } });
    });
    setSelectedIds(new Set());
  }, [selectedIds, transactions]);

  // Bulk category assignment (toolbar action) — a single update for all selected rows,
  // then one audit_log entry per row so each keeps its own before/after diff.
  const bulkAssignCategoryMutation = useMutation({
    mutationFn: async ({
      ids,
      movement,
      category,
      categoryId,
    }: {
      ids: string[];
      movement: MovementType;
      category: string;
      categoryId: string;
    }) => {
      const { error } = await supabase
        .from("transactions")
        .update({
          movement,
          category,
          category_id: categoryId,
          category_source: "MANUAL",
          categorized_by: "user",
          user_corrected: true,
        })
        .in("id", ids);
      if (error) throw error;

      if (user?.id) {
        for (const id of ids) {
          const tx = transactions.find((t) => t.id === id);
          if (!tx || (tx.category === category && tx.movement === movement)) continue;
          await supabase.rpc("log_audit_event", {
            _entity_type: "transaction",
            _entity_id: id,
            _action: "edit",
            _diff: {
              fields: ["category", "movement"],
              before: { category: tx.category, category_id: tx.category_id, movement: tx.movement },
              after: { category, category_id: categoryId, movement },
            } as never,
          });
        }
      }
      return ids;
    },
    onSuccess: async () => {
      try { await supabase.rpc("refresh_dashboard_views"); } catch { /* best-effort */ }
      queryClient.invalidateQueries({ queryKey: ["month-transactions-inline", monthKey, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["tx-audit", monthKey, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-period-series"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-opening-balances"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-aggregates"] });
      queryClient.invalidateQueries({ queryKey: ["account-period-summary"] });
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't update categories",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleBulkAssignCategory = useCallback((cat: Category) => {
    const ids = Array.from(selectedIds);
    bulkAssignCategoryMutation.mutate({
      ids,
      movement: (cat.movement_type || "EXPENSE") as MovementType,
      category: cat.slug || "",
      categoryId: cat.id,
    });
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  // Hard-delete with undo — only ever offered for manual entries (no import_id).
  const deleteWithUndo = async (tx: MonthTransaction) => {
    if (!user || !isManualTransaction(tx)) return;
    // Fetch the full row before deleting so we can re-insert on undo.
    const { data: fullRow } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", tx.id)
      .single();
    if (!fullRow) return;

    const { error } = await supabase.from("transactions").delete().eq("id", tx.id);
    if (error) {
      toast({ title: "Couldn't delete entry", description: error.message, variant: "destructive" });
      return;
    }

    try { await supabase.rpc("refresh_dashboard_views"); } catch { /* best-effort */ }
    queryClient.invalidateQueries({ queryKey: ["month-transactions-inline", monthKey, user?.id] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["tx-count", monthKey, user?.id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-period-series"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-opening-balances"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-aggregates"] });
    queryClient.invalidateQueries({ queryKey: ["account-period-summary"] });

    const { id: _id, created_at: _c, updated_at: _u, ...insertPayload } = fullRow;

    const undoId = sonnerToast("Entry deleted", {
      duration: 5000,
      action: {
        label: "undo",
        onClick: async () => {
          await supabase.from("transactions").insert(insertPayload);
          try { await supabase.rpc("refresh_dashboard_views"); } catch { /* best-effort */ }
          queryClient.invalidateQueries({ queryKey: ["month-transactions-inline", monthKey, user?.id] });
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
          queryClient.invalidateQueries({ queryKey: ["tx-count", monthKey, user?.id] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-period-series"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-opening-balances"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-aggregates"] });
          queryClient.invalidateQueries({ queryKey: ["account-period-summary"] });
          sonnerToast.dismiss(undoId);
          sonnerToast("Entry restored");
        },
      },
    });
  };

  // ─── Auto-save edit handlers ──────────────────────────────────────────
  // Every edit saves immediately to the database and pushes to the undo
  // stack. No pending buffer, no confirmation step.

  const applyMovementChange = (tx: MonthTransaction, newMovement: MovementType) => {
    const defaultCat = getCategoriesForMovement(newMovement, tx.amount)[0];
    const cat = categories.find((c) => c.slug === defaultCat);
    const payload = {
      movement: newMovement,
      category: defaultCat,
      category_id: cat?.id || null,
      category_source: "MANUAL",
      categorized_by: "user",
      user_corrected: true,
    };
    const before = {
      movement: tx.movement,
      category: tx.category,
      category_id: tx.category_id,
    };
    saveMutation.mutate({ id: tx.id, payload, before });
    undoRedo.push({
      txId: tx.id,
      field: "movement+category",
      oldValue: { movement: tx.movement, category: tx.category },
      newValue: { movement: newMovement, category: defaultCat },
      meta: { category_id: cat?.id || null, category_source: "MANUAL", categorized_by: "user", user_corrected: true },
      metaOld: { category_id: tx.category_id },
    });
  };

  const handleMovementChange = (tx: MonthTransaction, newMovement: MovementType) => {
    if (newMovement === tx.movement) return;
    const looksWrong =
      (tx.amount > 0 && newMovement === "EXPENSE") ||
      (tx.amount < 0 && newMovement === "INCOME");
    if (looksWrong) {
      setMovementConfirm({ tx, newMovement });
      return;
    }
    applyMovementChange(tx, newMovement);
  };

  const maybeNudgeRule = (tx: MonthTransaction, newSlug: string, newCategoryId: string | null, targetMovement: MovementType) => {
    if (!user) return;
    const now = Date.now();
    const lastNudge = recentlyNudgedRef.current.get(tx.id);
    if (lastNudge && now - lastNudge < 10_000) return;
    recentlyNudgedRef.current.set(tx.id, now);

    const cleanDesc = (tx.description || tx.description_norm || "")
      .replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, "")
      .trim();
    if (!cleanDesc) return;

    const categoryName = getCategoryLabel(newSlug);
    toast({
      title: t("imports.ruleNudgeTitle2", "Create rule for «{{category}}»?", { category: categoryName }),
      description: (
        <div className="space-y-1">
          <p className="text-xs opacity-80">
            {t("imports.ruleNudgeBody2", "Future transactions like «{{desc}}» will be categorized automatically.", { desc: cleanDesc.length > 40 ? cleanDesc.slice(0, 37) + "…" : cleanDesc })}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => {
              setCategoryRulePrompt({
                tx,
                newSlug,
                newCategoryId,
                cleanDesc,
                targetMovement,
              });
            }}
          >
            <Sparkles className="h-3 w-3" />
            {t("imports.ruleNudgeCta")}
          </Button>
        </div>
      ),
    });
  };

  const handleCategoryChange = (tx: MonthTransaction, newSlug: string) => {
    if (newSlug === tx.category) return;
    const cat = categories.find((c) => c.slug === newSlug);
    const categoryId = cat?.id || null;
    const movement = (tx.movement || "EXPENSE") as MovementType;
    saveMutation.mutate(
      {
        id: tx.id,
        payload: { category: newSlug, category_id: categoryId, category_source: "MANUAL", categorized_by: "user", user_corrected: true },
        before: { category: tx.category, category_id: tx.category_id },
      },
      { onSuccess: () => maybeNudgeRule(tx, newSlug, categoryId, movement) },
    );
    undoRedo.push({
      txId: tx.id,
      field: "category",
      oldValue: tx.category,
      newValue: newSlug,
      meta: { category_id: categoryId, category_source: "MANUAL", categorized_by: "user", user_corrected: true },
      metaOld: { category_id: tx.category_id },
    });
  };

  const handleAmountChange = (tx: MonthTransaction, raw: string) => {
    const sanitized = raw.replace(/\s/g, "").replace(",", ".");
    const parsed = evalArithmetic(sanitized);
    if (parsed === null) return;
    const movement = (tx.movement || "EXPENSE") as MovementType;
    const sign = movement === "EXPENSE" ? -1 : 1;
    const newAmount = sign * Math.abs(parsed);
    if (newAmount === tx.amount) return;
    const payload: Record<string, unknown> = { amount: newAmount };
    const before: Record<string, unknown> = { amount: tx.amount };
    if (tx.amount_original == null) payload.amount_original = tx.amount;
    if (movement === "TRANSFER" && newAmount !== 0) {
      const currentCat = tx.category ?? "own_transfer";
      const validCats = getCategoriesForMovement("TRANSFER", newAmount);
      if (!validCats.includes(currentCat)) {
        const defaultCat = validCats[0];
        const catObj = categories.find((c) => c.slug === defaultCat);
        payload.category = defaultCat;
        payload.category_id = catObj?.id || null;
        before.category = tx.category;
        before.category_id = tx.category_id;
      }
    }
    saveMutation.mutate({ id: tx.id, payload, before });
    undoRedo.push({
      txId: tx.id,
      field: "amount",
      oldValue: tx.amount,
      newValue: newAmount,
      meta: tx.amount_original == null ? { amount_original: tx.amount } : undefined,
      metaOld: tx.amount_original == null ? { amount_original: null } : undefined,
    });
  };

  const handleDescriptionSave = (tx: MonthTransaction, newDesc: string) => {
    if (newDesc === (tx.description || tx.description_norm || "").replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, "").trim()) return;
    saveMutation.mutate({
      id: tx.id,
      payload: { description: newDesc, description_norm: newDesc },
      before: { description: tx.description, description_norm: tx.description_norm },
    });
    undoRedo.push({ txId: tx.id, field: "description", oldValue: tx.description, newValue: newDesc });
  };

  const handleSplit = (tx: MonthTransaction, n: number) => {
    if (n < 1) return;
    const baseAmount = tx.amount;
    const newAmount = Math.sign(baseAmount || 1) * (Math.abs(baseAmount) / n);
    if (newAmount === baseAmount) return;
    const payload: Record<string, unknown> = { amount: newAmount };
    if (tx.amount_original == null) payload.amount_original = tx.amount;
    saveMutation.mutate({ id: tx.id, payload, before: { amount: tx.amount } });
    undoRedo.push({
      txId: tx.id,
      field: "amount",
      oldValue: tx.amount,
      newValue: newAmount,
      meta: tx.amount_original == null ? { amount_original: tx.amount } : undefined,
      metaOld: tx.amount_original == null ? { amount_original: null } : undefined,
    });
  };

  const handleToggleHidden = (tx: MonthTransaction) => {
    saveMutation.mutate({
      id: tx.id,
      payload: { is_hidden: !tx.is_hidden },
      before: { is_hidden: tx.is_hidden },
    });
  };

  // handleDrawerSave — converts the drawer's local edits into direct saves
  const handleDrawerSave = (tx: MonthTransaction, edits: PendingEditShape, withRule = false, isRevert = false) => {
    const payload: Record<string, unknown> = {};
    const before: Record<string, unknown> = {};
    if (edits.movement && edits.movement !== tx.movement) {
      payload.movement = edits.movement;
      before.movement = tx.movement;
    }
    if (edits.category && edits.category !== tx.category) {
      payload.category = edits.category;
      payload.category_id = edits.category_id ?? null;
      payload.category_source = "MANUAL";
      payload.categorized_by = "user";
      payload.user_corrected = true;
      before.category = tx.category;
      before.category_id = tx.category_id;
    }
    if (edits.amount !== undefined && edits.amount !== tx.amount) {
      payload.amount = edits.amount;
      before.amount = tx.amount;
      if (tx.amount_original == null) payload.amount_original = tx.amount;
    }
    if (edits.description !== undefined) {
      payload.description = edits.description;
      payload.description_norm = edits.description;
      before.description = tx.description;
      before.description_norm = tx.description_norm;
    }
    if (edits.date !== undefined && edits.date !== tx.date) {
      payload.date = edits.date;
      before.date = tx.date;
    }
    if (edits.account_id !== undefined && edits.account_id !== tx.account_id) {
      payload.account_id = edits.account_id;
      before.account_id = tx.account_id;
      if (edits.currency) payload.currency = edits.currency;
    }
    if (edits.is_hidden !== undefined && edits.is_hidden !== tx.is_hidden) {
      payload.is_hidden = edits.is_hidden;
      before.is_hidden = tx.is_hidden;
    }
    if (isRevert) {
      payload.__action = "revert";
      if ("amount" in payload) payload.amount_original = null;
      if ("category" in payload) {
        payload.category_source = "DEFAULT";
        payload.user_corrected = false;
      }
    }
    if (Object.keys(payload).length === 0) return;

    const movementForRule = ((edits.movement ?? tx.movement) || "EXPENSE") as MovementType;
    saveMutation.mutate(
      { id: tx.id, payload, before },
      {
        onSuccess: () => {
          if (withRule && edits.category && edits.category !== tx.category && user) {
            const cleanDesc = (tx.description || tx.description_norm || "")
              .replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, "")
              .trim();
            if (cleanDesc) {
              const ruleCategory = edits.category;
              const ruleCategoryId = edits.category_id ?? null;
              setCategoryRulePrompt({ tx, newSlug: ruleCategory, newCategoryId: ruleCategoryId, cleanDesc, targetMovement: movementForRule });
            }
          }
        },
      },
    );
  };

  // Mismatch detection (sign vs movement)
  const mismatchedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tx of transactions) {
      if (tx.amount > 0 && tx.movement === "EXPENSE") ids.add(tx.id);
      else if (tx.amount < 0 && tx.movement === "INCOME") ids.add(tx.id);
    }
    return ids;
  }, [transactions]);

  // Summary — excludes savings accounts to stay consistent with opening/closing balance
  const summary = useMemo(() => {
    const visible = transactions.filter((t) => !t.is_hidden);
    const nonSavings = visible.filter((t) => !savingsAccountIds.has(t.account_id ?? ""));
    const income = nonSavings
      .filter((t) => t.movement === "INCOME")
      .reduce((s, t) => s + Math.abs(splitAmt(t.amount, t.account_id)), 0);
    const expenses = nonSavings
      .filter((t) => t.movement === "EXPENSE")
      .reduce((s, t) => s + Math.abs(splitAmt(t.amount, t.account_id)), 0);
    const transferTxs = nonSavings.filter((t) => t.movement === "TRANSFER");
    const transfers = transferTxs.length;
    const transfersNet = transferTxs.reduce((s, t) => s + splitAmt(t.amount, t.account_id), 0);
    const hidden = transactions.filter((t) => t.is_hidden).length;
    return { income, expenses, transfers, transfersNet, hidden, total: transactions.length };
  }, [transactions, splitAmt, savingsAccountIds]);

  const hasAccountBalances = accountOpeningBalances && Object.keys(accountOpeningBalances).length > 0;

  const visibleTransactions = useMemo(
    () => transactions.filter((t) => !t.is_hidden),
    [transactions],
  );

  const runningBalanceMap = useMemo(() => {
    const map = new Map<string, number>();
    if (hasAccountBalances) {
      const byAccount = new Map<string, MonthTransaction[]>();
      for (const tx of visibleTransactions) {
        const key = tx.account_id ?? "__unassigned__";
        if (!byAccount.has(key)) byAccount.set(key, []);
        byAccount.get(key)!.push(tx);
      }
      for (const [acctId, txs] of byAccount) {
        const sorted = [...txs].sort((a, b) => {
          const dateCmp = a.date.localeCompare(b.date);
          if (dateCmp !== 0) return dateCmp;
          return (a.fingerprint ?? a.id).localeCompare(b.fingerprint ?? b.id);
        });
        let balance = acctId === "__unassigned__" ? 0 : (accountOpeningBalances![acctId] ?? 0);
        for (const tx of sorted) {
          balance += splitAmt(tx.amount, tx.account_id);
          map.set(tx.id, Math.round(balance * 100) / 100);
        }
      }
    } else if (openingBalance != null) {
      const sorted = [...visibleTransactions].sort((a, b) => {
        const dateCmp = a.date.localeCompare(b.date);
        if (dateCmp !== 0) return dateCmp;
        return (a.fingerprint ?? a.id).localeCompare(b.fingerprint ?? b.id);
      });
      let balance = openingBalance;
      for (const tx of sorted) {
        balance += splitAmt(tx.amount, tx.account_id);
        map.set(tx.id, Math.round(balance * 100) / 100);
      }
    }
    return map;
  }, [visibleTransactions, openingBalance, hasAccountBalances, accountOpeningBalances, splitAmt]);

  const filteredSorted = useMemo(() => {
    let result = [...transactions];
    if (filtersProp) {
      if (filtersProp.accounts.length > 0) {
        result = result.filter((tx) => tx.account_id && filtersProp.accounts.includes(tx.account_id));
      }
      if (filtersProp.movements.length > 0) {
        result = result.filter((tx) => tx.movement && filtersProp.movements.includes(tx.movement));
      }
      if (filtersProp.categories.length > 0) {
        result = result.filter((tx) => filtersProp.categories.includes(normalizeCategory(tx.category || "other_expense")));
      }
    }
    result.sort((a, b) => {
      const dir = sortDirectionProp === "asc" ? 1 : -1;
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dir * dateCmp;
      return dir * (a.fingerprint ?? a.id).localeCompare(b.fingerprint ?? b.id);
    });
    return result;
  }, [transactions, sortColumnProp, sortDirectionProp, filtersProp]);

  type AccountGroup = {
    accountId: string | null;
    accountName: string;
    accountColor: string | null;
    openingBalance: number;
    closingBalance: number;
    transactions: MonthTransaction[];
  };

  const accountGroups: AccountGroup[] | null = useMemo(() => {
    if (!hasAccountBalances) return null;
    const byAccount = new Map<string | null, MonthTransaction[]>();
    for (const tx of filteredSorted) {
      const key = tx.account_id ?? null;
      if (!byAccount.has(key)) byAccount.set(key, []);
      byAccount.get(key)!.push(tx);
    }
    const groups: AccountGroup[] = [];
    for (const [acctId, txs] of byAccount) {
      const acct = acctId ? accounts.find((a) => a.id === acctId) : null;
      const name = acct ? getAccountDisplayName(acct) : t("imports.unassignedAccount", "Unassigned");
      const color = acct?.color ?? null;
      const opening = acctId ? (accountOpeningBalances![acctId] ?? 0) : 0;
      const closing = acctId && accountClosingBalances?.[acctId] != null
        ? accountClosingBalances[acctId]
        : (() => {
            const visibleTxs = txs.filter((tx) => !tx.is_hidden);
            const totalAmount = visibleTxs.reduce((sum, tx) => sum + splitAmt(tx.amount, tx.account_id), 0);
            return Math.round((opening + totalAmount) * 100) / 100;
          })();
      groups.push({ accountId: acctId, accountName: name, accountColor: color, openingBalance: opening, closingBalance: closing, transactions: txs });
    }
    groups.sort((a, b) => {
      if (a.accountId === null) return 1;
      if (b.accountId === null) return -1;
      return a.accountName.localeCompare(b.accountName);
    });
    return groups;
  }, [filteredSorted, hasAccountBalances, accountOpeningBalances, accountClosingBalances, accounts, splitAmt, t]);

  const accountTabsData: AccountTab[] = useMemo(() => {
    if (!accountGroups) return [];
    return accountGroups.map((g) => ({
      id: g.accountId ?? "__unassigned__",
      name: g.accountName,
      color: g.accountColor ?? "hsl(var(--muted-foreground))",
      txCount: g.transactions.length,
    }));
  }, [accountGroups]);
  const showAccountTabs = accountTabsData.length > 1;

  // Auto-select first account when tabs load or month changes (no "All" view)
  useEffect(() => {
    if (accountTabsData.length > 0 && (activeAccountId === null || !accountTabsData.some((a) => a.id === activeAccountId))) {
      setActiveAccountId(accountTabsData[0].id);
    }
  }, [accountTabsData, monthKey]);

  const rowsToRender = useMemo(() => {
    if (activeAccountId === null) return filteredSorted;
    return filteredSorted.filter((tx) => tx.account_id === activeAccountId);
  }, [filteredSorted, activeAccountId]);
  const allVisibleIds = rowsToRender.map((tx) => tx.id);

  const { focusedCell, setFocusedCell } = useKeyboardShortcuts({
    containerRef,
    visibleTxIds: allVisibleIds,
    onUndo: undoRedo.undo,
    onRedo: undoRedo.redo,
    onCopy: handleCopyRows,
    onPaste: handlePasteRows,
    onDelete: handleBulkDelete,
    onEditCell: (cell) => {
      if (cell.column === "description") {
        const tx = rowsToRender.find((t) => t.id === cell.txId);
        if (!tx) return;
        setEditingDescId(tx.id);
        setEditingDescValue((tx.description || tx.description_norm || "").replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, "").trim());
        setTimeout(() => descInputRef.current?.focus(), 50);
      } else if (cell.column === "amount") {
        const tx = rowsToRender.find((t) => t.id === cell.txId);
        if (!tx) return;
        setEditingAmountId(tx.id);
        setEditingAmountValue(String(Math.abs(tx.amount)).replace(".", ","));
        setTimeout(() => amountInputRef.current?.focus(), 50);
      }
    },
    onCancelEdit: () => {
      setEditingDescId(null);
      setEditingAmountId(null);
    },
    isEditing: editingDescId !== null || editingAmountId !== null,
    hasSelection: selectedIds.size > 0,
  });

  const tabSummary = useMemo(() => {
    if (activeAccountId === null) return summary;
    const visible = rowsToRender.filter((t) => !t.is_hidden);
    const nonSavings = visible.filter((t) => !savingsAccountIds.has(t.account_id ?? ""));
    const income = nonSavings
      .filter((t) => t.movement === "INCOME")
      .reduce((s, t) => s + Math.abs(splitAmt(t.amount, t.account_id)), 0);
    const expenses = nonSavings
      .filter((t) => t.movement === "EXPENSE")
      .reduce((s, t) => s + Math.abs(splitAmt(t.amount, t.account_id)), 0);
    const transferTxs = nonSavings.filter((t) => t.movement === "TRANSFER");
    const transfers = transferTxs.length;
    const transfersNet = transferTxs.reduce((s, t) => s + splitAmt(t.amount, t.account_id), 0);
    const hidden = rowsToRender.filter((t) => t.is_hidden).length;
    return { income, expenses, transfers, transfersNet, hidden, total: rowsToRender.length };
  }, [activeAccountId, summary, rowsToRender, savingsAccountIds, splitAmt]);

  // Report account tabs + summary to parent for the toolbar
  const tabsCallbackRef = useRef(onTabsDataChange);
  tabsCallbackRef.current = onTabsDataChange;
  useEffect(() => {
    tabsCallbackRef.current?.({ tabs: accountTabsData, summary: tabSummary, globalSummary: summary });
  }, [accountTabsData, tabSummary, summary]);

  const tabOpeningBalance = activeAccountId !== null && accountOpeningBalances
    ? (accountOpeningBalances[activeAccountId] ?? null)
    : openingBalance;
  const tabClosingBalance = activeAccountId !== null && accountClosingBalances
    ? (accountClosingBalances[activeAccountId] ?? null)
    : closingBalanceProp;

  if (isLoading) {
    return (
      <div className="bg-card py-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-card py-12 px-6 text-center">
        <FileSpreadsheet className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          {imports.length > 0
            ? "File uploaded but no transactions detected yet. They will appear here once processing finishes."
            : "No transactions yet. Upload a file or add entries manually."}
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} tabIndex={0} className="flex flex-col flex-1 min-h-0 outline-none">
      {selectedIds.size > 0 && (() => {
        const hasVisible = Array.from(selectedIds).some(id => { const r = transactions.find(x => x.id === id); return r && !r.is_hidden; });
        const hasHidden = Array.from(selectedIds).some(id => transactions.find(x => x.id === id)?.is_hidden);
        return (
          <BulkActionsToolbar
            count={selectedIds.size}
            categories={categories}
            getCategoryIcon={getCategoryIcon}
            getCategoryColor={getCategoryColor}
            getCategoryLabel={getCategoryLabel}
            onClear={() => setSelectedIds(new Set())}
            onHide={hasVisible ? handleBulkHide : undefined}
            onShow={hasHidden ? handleBulkShow : undefined}
            onAssignCategory={handleBulkAssignCategory}
          />
        );
      })()}

      {/* Mismatch warning */}
      {mismatchedIds.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-300 dark:border-amber-700 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <strong>{mismatchedIds.size}</strong>
          {mismatchedIds.size === 1
            ? " transaction has a sign-movement mismatch."
            : " transactions have sign-movement mismatches."}
          {" "}Review the highlighted rows.
        </div>
      )}

      {/* The spreadsheet — flush, no padding, no inner card */}
      <div className="bg-card flex-1 flex flex-col min-h-0">
        {/* Desktop / tablet: CSS grid spreadsheet */}
        <div className="hidden md:block overflow-auto flex-1 min-h-0">
          {/* Sticky header */}
          <div
            className="sticky top-0 z-10 grid items-center bg-card border-b border-border"
            style={{
              gridTemplateColumns: "34px 94px 54px 66px 96px 102px minmax(0,1fr) 180px 108px 36px",
              gap: 14,
              padding: "11px 34px",
            }}
          >
            <span className="flex items-center justify-center">
              <Checkbox
                checked={selectedIds.size > 0 ? (selectedIds.size === allVisibleIds.length ? true : "indeterminate") : false}
                onCheckedChange={() => toggleSelectAll(allVisibleIds)}
                aria-label="Select all"
                className="w-4 h-4 rounded border-muted-foreground/40"
              />
            </span>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
              {t("imports.date")}
            </span>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
              {t("imports.week")}
            </span>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
              {t("imports.source")}
            </span>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
              {t("imports.movement")}
            </span>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground text-right">
              {t("imports.amount")}
            </span>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
              {t("imports.description")}
            </span>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
              {t("imports.category")}
            </span>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground text-right">
              {t("imports.balance")}
            </span>
            <span />
          </div>

          {/* Rows */}
          <div>
              {rowsToRender.map((tx) => {
                const isMismatch = mismatchedIds.has(tx.id);
                const isHidden = tx.is_hidden;
                const isManual = isManualTransaction(tx);
                const isSelected = selectedIds.has(tx.id);
                const txHistory = auditByTx[tx.id] || [];
                const editEntries = txHistory.filter((h) => h.action !== "revert");
                const hasEditHistory = editEntries.length > 0;
                const snapshot = hasEditHistory ? buildOriginalSnapshot(txHistory) : null;
                const isEdited =
                  !isManual &&
                  hasEditHistory &&
                  !(snapshot && isBackToOriginal(tx as unknown as Record<string, unknown>, snapshot.values));
                const originalSnapshot = isEdited ? snapshot : null;
                const cleanDescription = (tx.description || tx.description_norm || "")
                  .replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, "")
                  .trim();
                const movement = (tx.movement ?? "EXPENSE") as MovementType;
                const category = normalizeCategory(tx.category ?? "other_expense");
                const rawAmount = tx.amount;
                const displayAmount = splitAmt(rawAmount, tx.account_id);
                const hasSplit = !!(tx.account_id && splitMap[tx.account_id] != null);
                const availableCategories = getCategoriesForMovement(movement, rawAmount);

                const amountColor =
                  displayAmount === 0
                    ? "text-muted-foreground"
                    : movement === "TRANSFER"
                      ? "text-muted-foreground"
                      : "text-foreground";

                const rowContextActions = {
                  onToggleHidden: () => handleToggleHidden(tx),
                  onDelete: () => deleteWithUndo(tx),
                  onEditDescription: () => {
                    setEditingDescId(tx.id);
                    setEditingDescValue(cleanDescription);
                    setTimeout(() => descInputRef.current?.focus(), 50);
                  },
                  onCopyAmount: () => {
                    navigator.clipboard.writeText(formatCurrency(displayAmount, undefined, true));
                    sonnerToast("Amount copied");
                  },
                  onCopyDescription: () => {
                    navigator.clipboard.writeText(cleanDescription);
                    sonnerToast("Description copied");
                  },
                  onSplit: () => handleSplit(tx, 2),
                  onDuplicate: () => handleDuplicateRow(tx),
                  onRevert: () => {
                    if (originalSnapshot) {
                      const filtered = filterRevertableSnapshot(originalSnapshot);
                      if (filtered.fields.length === 0) return;
                      const payload: Record<string, unknown> = withAmountOriginalReset({
                        ...filtered.values,
                        __action: "revert",
                      });
                      const before: Record<string, unknown> = {};
                      for (const f of filtered.fields) {
                        before[f] = (tx as unknown as Record<string, unknown>)[f];
                      }
                      saveMutation.mutate({ id: tx.id, payload, before });
                    }
                  },
                  onSaveWithRule: () => {
                    if (!user || !tx.user_corrected) return;
                    const cleanDesc = (tx.description || tx.description_norm || "")
                      .replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, "")
                      .trim();
                    if (!cleanDesc) return;
                    setCategoryRulePrompt({
                      tx,
                      newSlug: tx.category ?? "other_expense",
                      newCategoryId: tx.category_id ?? null,
                      cleanDesc,
                      targetMovement: movement,
                    });
                  },
                  onBulkHide: selectedIds.size > 1 && Array.from(selectedIds).some(id => { const r = transactions.find(x => x.id === id); return r && !r.is_hidden; }) ? handleBulkHide : undefined,
                  onBulkShow: selectedIds.size > 1 && Array.from(selectedIds).some(id => { const r = transactions.find(x => x.id === id); return r?.is_hidden; }) ? handleBulkShow : undefined,
                  onBulkAssignCategory: selectedIds.size > 1 ? handleBulkAssignCategory : undefined,
                  bulkCategories: selectedIds.size > 1 ? categories : undefined,
                  getCategoryIcon: selectedIds.size > 1 ? getCategoryIcon : undefined,
                  getCategoryColor: selectedIds.size > 1 ? getCategoryColor : undefined,
                  getCategoryLabel: selectedIds.size > 1 ? getCategoryLabel : undefined,
                };

                return (
                  <TransactionContextMenu
                    key={tx.id}
                    isHidden={isHidden}
                    isManual={isManual}
                    isEdited={isEdited}
                    isPending={false}
                    hasCategoryChange={!!tx.user_corrected}
                    selectedCount={selectedIds.size}
                    {...rowContextActions}
                  >
                    <div
                      className={cn(
                        "grid items-center cursor-pointer transition-[background] duration-100",
                        isMismatch && "bg-amber-50/60 border-l-2 border-l-amber-400",
                        isHidden && "opacity-50 bg-muted/20",
                        isSelected && "bg-primary/[0.08]",
                      )}
                      style={{
                        gridTemplateColumns: "34px 94px 54px 66px 128px 102px minmax(0,1fr) 168px 108px 36px",
                        gap: 14,
                        padding: "12px 34px",
                        borderBottom: "1px solid hsl(var(--border) / 0.5)",
                      }}
                      onMouseEnter={(e) => {
                        if (!isMismatch && !isHidden && !isSelected)
                          e.currentTarget.style.background = "hsl(var(--muted) / 0.4)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isMismatch && !isHidden && !isSelected)
                          e.currentTarget.style.background = "";
                      }}
                    >
                      {/* Checkbox */}
                      <span className="flex items-center justify-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelected(tx.id)}
                          aria-label="Select row"
                          className="w-4 h-4 rounded border-muted-foreground/40 bg-card"
                        />
                      </span>

                      {/* Date */}
                      <span className="tabular-nums whitespace-nowrap text-xs font-medium text-foreground">
                        {formatDate(new Date(tx.date))}
                      </span>

                      {/* Week */}
                      <span className="whitespace-nowrap text-[11.5px] font-medium text-muted-foreground tracking-wide">
                        W{getISOWeek(tx.date)}
                      </span>

                      {/* Source — pill */}
                      <span>
                        <span className="inline-block w-fit bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[10.5px] font-semibold tracking-wide lowercase">
                          {getSourceLabel(tx)}
                        </span>
                      </span>

                      {/* Movement — native select */}
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-[7px] h-[7px] rounded-full shrink-0"
                          style={{ backgroundColor: movement === 'INCOME' ? 'hsl(var(--success))' : movement === 'EXPENSE' ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))' }}
                        />
                        <div className="pk-select-wrap pk-select-wrap--sm flex-1 min-w-0">
                          <select
                            value={movement}
                            onChange={(e) => handleMovementChange(tx, e.target.value as MovementType)}
                            disabled={isHidden}
                            className="h-auto w-full border-0 bg-transparent text-xs font-semibold cursor-pointer"
                            style={{ color: movement === 'INCOME' ? 'hsl(var(--success))' : movement === 'EXPENSE' ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))' }}
                          >
                            <option value="INCOME">{getMovementLabel("INCOME")}</option>
                            <option value="EXPENSE">{getMovementLabel("EXPENSE")}</option>
                            <option value="TRANSFER">{getMovementLabel("TRANSFER")}</option>
                          </select>
                        </div>
                      </span>

                      {/* Amount — double-click to edit */}
                      <span
                        className={cn(
                          "tabular-nums whitespace-nowrap text-right text-xs font-medium",
                          movement === "TRANSFER" ? "text-muted-foreground" : "text-foreground",
                        )}
                        onDoubleClick={() => {
                          if (isHidden) return;
                          setEditingAmountId(tx.id);
                          setEditingAmountValue(String(Math.abs(rawAmount)).replace(".", ","));
                          setTimeout(() => amountInputRef.current?.focus(), 50);
                        }}
                      >
                        {editingAmountId === tx.id ? (
                          <Input
                            ref={amountInputRef}
                            value={editingAmountValue}
                            onChange={(e) => setEditingAmountValue(e.target.value)}
                            onBlur={() => {
                              handleAmountChange(tx, editingAmountValue);
                              setEditingAmountId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              if (e.key === "Escape") setEditingAmountId(null);
                            }}
                            inputMode="decimal"
                            className="h-6 text-[12.5px] px-1 py-0 text-right tabular-nums border-primary/40 w-24 ml-auto"
                          />
                        ) : hasSplit ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-4">
                                {formatCurrency(displayAmount, undefined, true)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              {t("imports.originalAmount", {
                                amount: formatCurrency(rawAmount, undefined, true),
                              })}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span>{formatCurrency(displayAmount, undefined, true)}</span>
                        )}
                      </span>

                      {/* Description — double-click to edit */}
                      <span
                        className="min-w-0"
                        onDoubleClick={() => {
                          if (isHidden) return;
                          setEditingDescId(tx.id);
                          setEditingDescValue(cleanDescription);
                          setTimeout(() => descInputRef.current?.focus(), 50);
                        }}
                      >
                        {editingDescId === tx.id ? (
                          <Input
                            ref={descInputRef}
                            value={editingDescValue}
                            onChange={(e) => setEditingDescValue(e.target.value)}
                            onBlur={() => {
                              if (editingDescValue !== cleanDescription) {
                                handleDescriptionSave(tx, editingDescValue);
                              }
                              setEditingDescId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              if (e.key === "Escape") { setEditingDescId(null); }
                            }}
                            className="h-6 text-xs px-1 py-0 border-primary/40"
                            placeholder={t("imports.editDescription")}
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={cn(
                                "truncate text-xs font-normal text-foreground",
                                isHidden && "line-through",
                              )}
                              title={cleanDescription}
                            >
                              {cleanDescription}
                            </span>
                          </div>
                        )}
                      </span>

                      {/* Category — native select pill */}
                      <span className="min-w-0">
                        <span
                          className="flex items-center gap-1.5 rounded-full pl-1 pr-0.5 py-0.5 w-full"
                          style={{ backgroundColor: `hsl(var(--${getCategoryColor(category)}) / 0.13)` }}
                        >
                          <CategoryIcon
                            iconName={getCategoryIcon(category)}
                            colorVar={getCategoryColor(category)}
                            size="sm"
                            showBackground={false}
                            className="shrink-0"
                          />
                          <div className="pk-select-wrap pk-select-wrap--sm flex-1 min-w-0">
                            <select
                              value={category}
                              onChange={(e) => handleCategoryChange(tx, e.target.value)}
                              disabled={isHidden}
                              className="h-auto w-full border-0 bg-transparent text-[11px] font-semibold cursor-pointer truncate"
                              style={{ color: `hsl(var(--${getCategoryColor(category)}))` }}
                            >
                              {availableCategories.map((slug) => (
                                <option key={slug} value={slug}>{getCategoryLabel(slug)}</option>
                              ))}
                            </select>
                          </div>
                        </span>
                      </span>

                      {/* Balance */}
                      <span className="tabular-nums whitespace-nowrap text-right text-xs font-medium text-muted-foreground">
                        {runningBalanceMap.has(tx.id) ? formatCurrency(runningBalanceMap.get(tx.id)!, undefined, true) : "—"}
                      </span>

                      {/* Actions: kebab menu */}
                      <span className="flex items-center justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center cursor-pointer text-muted-foreground/50"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" /></svg>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => setEditingTx(tx)}
                                  className="gap-2 text-[13px]"
                                >
                                  <Pencil className="w-4 h-4" />
                                  {t("imports.editTransaction")}
                                </DropdownMenuItem>
                              {!isHidden && (
                                <DropdownMenuItem
                                  onClick={() => handleSplit(tx, 2)}
                                  className="gap-2 text-[13px]"
                                >
                                  <SplitIcon className="w-4 h-4" />
                                  {t("imports.splitAmount")}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleToggleHidden(tx)} className="gap-2 text-[13px]">
                                  {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                  {isHidden ? t("imports.showEntry") : t("imports.hideEntry")}
                                </DropdownMenuItem>
                              {isEdited && originalSnapshot && !isManual && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    const payload: Record<string, unknown> = withAmountOriginalReset({ ...originalSnapshot.values, __action: "revert" });
                                    if ("category" in originalSnapshot.values) {
                                      payload.category_source = "DEFAULT";
                                      payload.user_corrected = false;
                                    }
                                    saveMutation.mutate({
                                      id: tx.id,
                                      payload,
                                      before: { movement: tx.movement, category: tx.category, category_id: tx.category_id, amount: tx.amount, is_hidden: tx.is_hidden },
                                    });
                                  }}
                                  className="gap-2 text-[13px]"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                  {t("imports.revertToOriginal")}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  navigator.clipboard.writeText(cleanDescription);
                                  sonnerToast("Copied");
                                }}
                                className="gap-2 text-[13px]"
                              >
                                <Copy className="w-4 h-4" />
                                {t("imports.copyDescription")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  navigator.clipboard.writeText(formatCurrency(displayAmount, undefined, true));
                                  sonnerToast("Copied");
                                }}
                                className="gap-2 text-[13px]"
                              >
                                <Copy className="w-4 h-4" />
                                {t("imports.copyAmount")}
                              </DropdownMenuItem>
                              {isManual && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => deleteWithUndo(tx)}
                                    className="gap-2 text-[13px] text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    {t("imports.deleteEntry")}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </span>
                    </div>
                  </TransactionContextMenu>
                );
              })}
          </div>
        </div>

        {/* Phones: read-only cards with pencil → edit drawer */}
        <div className="md:hidden flex-1 overflow-y-auto min-h-0 overscroll-contain touch-pan-y" style={{ WebkitOverflowScrolling: "touch" }}>
          {(() => {
            const mobileDayGroups: { dateKey: string; rows: MonthTransaction[] }[] = [];
            for (const tx of rowsToRender) {
              const last = mobileDayGroups[mobileDayGroups.length - 1];
              if (last && last.dateKey === tx.date) last.rows.push(tx);
              else mobileDayGroups.push({ dateKey: tx.date, rows: [tx] });
            }
            return mobileDayGroups.map((group) => (
            <div key={group.dateKey}>
              <div className="flex items-baseline gap-1.5 bg-muted/40 px-3 py-1.5">
                <span className="text-[13px] font-semibold tabular-nums text-foreground">
                  {group.dateKey.slice(8, 10)}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground capitalize">
                  {formatWeekday(group.dateKey)}
                </span>
              </div>

              <div className="divide-y divide-border/40">
                {group.rows.map((tx) => {
                  const isMismatch = mismatchedIds.has(tx.id);
                  const isHidden = tx.is_hidden;
                  const isManual = isManualTransaction(tx);
                  const txHistory = auditByTx[tx.id] || [];
                  const editEntries = txHistory.filter((h) => h.action !== "revert");
                  const hasEditHistory = editEntries.length > 0;
                  const snapshot = hasEditHistory ? buildOriginalSnapshot(txHistory) : null;
                  const isEdited =
                    !isManual &&
                    hasEditHistory &&
                    !(snapshot && isBackToOriginal(tx as unknown as Record<string, unknown>, snapshot.values));
                  const originalSnapshot = isEdited ? snapshot : null;
                  const cleanDescription = (tx.description || tx.description_norm || "")
                  .replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, "")
                  .trim();
                  const movement = (tx.movement || "EXPENSE") as MovementType;
                  const category = normalizeCategory(tx.category || "other_expense");
                  const amountColor =
                    tx.amount === 0
                      ? "text-muted-foreground"
                      : movement === "INCOME"
                        ? "text-success"
                        : movement === "TRANSFER"
                          ? "text-muted-foreground"
                          : "text-destructive";
                  const isSelected = selectedIds.has(tx.id);
                  const selecting = selectedIds.size > 0;

                  return (
                    <SwipeableRow
                      key={tx.id}
                      onSwipeLeft={
                        !selecting
                          ? isManual
                            ? () => deleteWithUndo(tx)
                            : () => handleToggleHidden(tx)
                          : undefined
                      }
                      leftAction={isManual ? "delete" : "hide"}
                      onSwipeRight={!selecting ? () => setEditingTx(tx) : undefined}
                    >
                      <div
                        className={cn(
                          "relative flex items-center gap-2.5 px-3 py-2.5 bg-card select-none [-webkit-touch-callout:none]",
                          isMismatch && "bg-amber-50/60 dark:bg-amber-950/20 border-l-2 border-l-amber-400",
                          isHidden && "opacity-60 bg-muted/20",
                          actionMenu?.tx.id === tx.id && "z-20 bg-accent ring-2 ring-primary",
                          isSelected && "bg-primary/[0.08]",
                        )}
                        onContextMenu={(e) => e.preventDefault()}
                        onTouchStart={(e) => {
                          if (selecting) return;
                          const target = e.currentTarget;
                          const touch = e.touches[0];
                          longPressStartRef.current = { x: touch.clientX, y: touch.clientY };
                          longPressFiredRef.current = false;
                          longPressTimerRef.current = setTimeout(() => {
                            longPressFiredRef.current = true;
                            if (navigator.vibrate) navigator.vibrate(10);
                            setActionMenu({ tx, rect: target.getBoundingClientRect() });
                          }, 450);
                        }}
                        onTouchMove={(e) => {
                          if (!longPressStartRef.current || !longPressTimerRef.current) return;
                          const touch = e.touches[0];
                          const dx = Math.abs(touch.clientX - longPressStartRef.current.x);
                          const dy = Math.abs(touch.clientY - longPressStartRef.current.y);
                          if (dx > 10 || dy > 10) {
                            clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                        }}
                        onTouchEnd={() => {
                          if (longPressTimerRef.current) {
                            clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                        }}
                        onClick={() => {
                          if (longPressFiredRef.current) {
                            longPressFiredRef.current = false;
                            return;
                          }
                          if (selecting) {
                            toggleSelected(tx.id);
                            return;
                          }
                          setEditingTx(tx);
                        }}
                      >
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: `hsl(var(--${getCategoryColor(category)}) / 0.15)` }}
                          title={getCategoryLabel(category)}
                        >
                          {selecting ? (
                            <Checkbox checked={isSelected} className="pointer-events-none" aria-label="Select row" />
                          ) : (
                            <CategoryIcon
                              iconName={getCategoryIcon(category)}
                              colorVar={getCategoryColor(category)}
                              size="sm"
                              showBackground={false}
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-[13px] text-foreground", isHidden && "line-through")}>
                            <span className="font-medium">
                              {cleanDescription}
                            </span>
                          </p>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="truncate text-[11px] text-muted-foreground">
                              {getCategoryLabel(category)}
                            </span>
                            {isHidden && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                <EyeOff className="h-2.5 w-2.5" />
                                {t("imports.excluded", "Excluded")}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                          <div className="flex items-center gap-1">
                            <span className={cn("text-[13px] tabular-nums", amountColor)}>
                              {formatCurrency(splitAmt(tx.amount, tx.account_id), undefined, true)}
                            </span>
                          </div>
                          {accountLabel(tx.account_id) && (
                            <span className="text-[11px] text-muted-foreground">
                              {accountLabel(tx.account_id)}
                            </span>
                          )}
                        </div>
                      </div>
                    </SwipeableRow>
                  );
                })}
              </div>
            </div>
                ));
          })()}
        </div>

        {/* Mobile long-press action menu */}
        {(() => {
          const atx = actionMenu?.tx ?? null;
          if (!atx) return <MobileTransactionActions tx={null} anchorRect={null} isManual={false} isHidden={false} isEdited={false} onClose={() => { setActionMenu(null); longPressFiredRef.current = false; }} onEdit={() => {}} onToggleHidden={() => {}} onDelete={() => {}} onEditDescription={() => {}} onSplit={() => {}} onRevert={() => {}} onCopyDescription={() => {}} onCopyAmount={() => {}} onSelect={() => {}} />;
          const atxManual = isManualTransaction(atx);
          const atxHist = auditByTx[atx.id] || [];
          const atxEdits = atxHist.filter((h) => h.action !== "revert");
          const atxSnap = atxEdits.length > 0 ? buildOriginalSnapshot(atxHist) : null;
          const atxIsEdited = !atxManual && atxEdits.length > 0 && !(atxSnap && isBackToOriginal(atx as unknown as Record<string, unknown>, atxSnap.values));
          const atxCleanDesc = atx.original_description || atx.description || atx.description_norm || "";
          return (
            <MobileTransactionActions
              tx={atx}
              anchorRect={actionMenu?.rect ?? null}
              isManual={atxManual}
              isHidden={atx.is_hidden}
              isEdited={atxIsEdited}
              onClose={() => { setActionMenu(null); longPressFiredRef.current = false; }}
              onEdit={() => { setActionMenu(null); setEditingTx(atx); }}
              onToggleHidden={() => handleToggleHidden(atx)}
              onDelete={() => deleteWithUndo(atx)}
              onEditDescription={() => { setActionMenu(null); setEditingTx(atx); }}
              onSplit={() => handleSplit(atx, 2)}
              onRevert={() => {
                if (atxSnap) {
                  const filtered = filterRevertableSnapshot(atxSnap);
                  if (filtered.fields.length === 0) return;
                  const payload: Record<string, unknown> = withAmountOriginalReset({ ...filtered.values, __action: "revert" });
                  const before: Record<string, unknown> = {};
                  for (const f of filtered.fields) {
                    before[f] = (atx as unknown as Record<string, unknown>)[f];
                  }
                  saveMutation.mutate({ id: atx.id, payload, before });
                }
              }}
              onCopyDescription={() => { navigator.clipboard.writeText(atxCleanDesc); sonnerToast("Description copied"); }}
              onCopyAmount={() => { navigator.clipboard.writeText(formatCurrency(splitAmt(atx.amount, atx.account_id), undefined, true)); sonnerToast("Amount copied"); }}
              onSelect={() => { setActionMenu(null); toggleSelected(atx.id); }}
            />
          );
        })()}

        {/* Mobile transaction edit drawer */}
        {(() => {
          const etx = editingTx;
          let drawerIsEdited = false;
          let drawerOriginalSnapshot: { values: Record<string, unknown>; fields: string[] } | null = null;
          if (etx && !isManualTransaction(etx)) {
            const hist = auditByTx[etx.id] || [];
            const edits = hist.filter((h) => h.action !== "revert");
            if (edits.length > 0) {
              const snap = buildOriginalSnapshot(hist);
              if (!isBackToOriginal(etx as unknown as Record<string, unknown>, snap.values)) {
                drawerIsEdited = true;
                drawerOriginalSnapshot = snap;
              }
            }
          }
          return (
            <TransactionEditDrawer
              tx={etx}
              open={!!etx}
              onOpenChange={(open) => { if (!open) setEditingTx(null); }}
              monthKey={monthKey}
              categories={categories}
              accounts={accounts}
              getCategoryIcon={getCategoryIcon}
              getCategoryColor={getCategoryColor}
              formatCurrency={formatCurrency}
              onSave={(tx, edits, withRule, isRevert) => {
                handleDrawerSave(tx, edits, withRule, isRevert);
                setEditingTx(null);
              }}
              onDelete={(tx) => deleteWithUndo(tx)}
              isEdited={drawerIsEdited}
              originalSnapshot={drawerOriginalSnapshot}
            />
          );
        })()}


        {/* Live processing panel — only rendered while files are being processed. */}
        {pendingFiles && pendingFiles.length > 0 && (
          <div className="bg-card px-6 py-6 flex items-start justify-center border-t border-border">
            <div className="w-full max-w-xl">
              <ProcessingPanel files={pendingFiles} />
            </div>
          </div>
        )}

        {/* Account sheet tabs (Excel-style, only when multiple accounts) */}
        {showAccountTabs && (
          <AccountSheetTabs
            accounts={accountTabsData}
            activeAccountId={activeAccountId}
            onSelect={setActiveAccountId}
          />
        )}

        {/* Spreadsheet footer: totals (Excel status-bar style) — sticks to the bottom */}
        <ManualEntryFooter
          monthKey={monthKey}
          monthLabel={monthLabel}
          summary={tabSummary}
          openingBalance={tabOpeningBalance}
          closingBalance={tabClosingBalance ?? (tabOpeningBalance != null ? tabOpeningBalance + rowsToRender.filter(tx => !tx.is_hidden).reduce((sum, tx) => sum + splitAmt(tx.amount, tx.account_id), 0) : null)}
          externalOpen={externalManualEntryOpen}
          onExternalOpenChange={onManualEntryOpenChange}
          defaultMovement={defaultMovement}
          defaultAccountId={activeAccountId}
        />
      </div>

      {/* Movement mismatch verification (no rule, just confirm) */}
      <AlertDialog
        open={!!movementConfirm}
        onOpenChange={(o) => !o && setMovementConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 ring-1 ring-warning/20 mb-1">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <AlertDialogTitle>Sign and movement don't match</AlertDialogTitle>
            <AlertDialogDescription>
              {movementConfirm && (
                <span className="block space-y-3">
                  <span className="block">
                    The amount is{" "}
                    <span className="font-semibold text-foreground">
                      {movementConfirm.tx.amount < 0 ? "negative" : "positive"}
                    </span>
                    , but you're marking this as{" "}
                    <span className="font-semibold text-foreground">
                      {getMovementLabel(movementConfirm.newMovement)}
                    </span>
                    .
                  </span>
                  <span className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs">
                    <span className="uppercase tracking-wide text-muted-foreground/80 font-medium">
                      Amount
                    </span>
                    <span
                      className={cn(
                        "tabular-nums font-semibold text-sm",
                        movementConfirm.tx.amount < 0 ? "text-destructive" : "text-success",
                      )}
                    >
                      {formatCurrency(splitAmt(movementConfirm.tx.amount, movementConfirm.tx.account_id), undefined, true)}
                    </span>
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Usually{" "}
                    {movementConfirm.newMovement === "INCOME"
                      ? "income is positive (money in)"
                      : "expenses are negative (money out)"}
                    . You can save it anyway if it's correct.
                  </span>
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (movementConfirm) {
                  applyMovementChange(movementConfirm.tx, movementConfirm.newMovement);
                }
                setMovementConfirm(null);
              }}
            >
              Save anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Post-hoc rule editor — opened via "Edit" in the auto-rule toast */}
      <RuleEditorDialog
        open={!!categoryRulePrompt}
        onOpenChange={(o) => !o && setCategoryRulePrompt(null)}
        description={categoryRulePrompt?.cleanDesc ?? ""}
        movement={categoryRulePrompt?.targetMovement ?? "EXPENSE"}
        categorySlug={categoryRulePrompt?.newSlug ?? ""}
        categoryLabel={
          categoryRulePrompt ? getCategoryLabel(categoryRulePrompt.newSlug) : ""
        }
        categoryColorVar={
          categoryRulePrompt ? getCategoryColor(categoryRulePrompt.newSlug) : undefined
        }
        categoryIcon={
          categoryRulePrompt ? getCategoryIcon(categoryRulePrompt.newSlug) : undefined
        }
        onSkip={() => setCategoryRulePrompt(null)}
        skipLabel={categoryRulePrompt?.existingRuleId ? "Cancel" : "Don't create rule"}
        onConfirm={async (payload) => {
          if (!user || !categoryRulePrompt) {
            setCategoryRulePrompt(null);
            return;
          }
          if (!categoryRulePrompt.newCategoryId) {
            toast({ title: "Couldn't save rule", description: "Unknown category", variant: "destructive" });
            setCategoryRulePrompt(null);
            return;
          }

          try {
            if (categoryRulePrompt.existingRuleId) {
              // An identical rule already existed: update its pattern + account scope, and
              // apply retroactively — same centralized mutation the Settings "Edit rule"
              // flow uses, so behavior (cache invalidation, error handling) can't drift.
              await updateRule.mutateAsync({
                ruleId: categoryRulePrompt.existingRuleId,
                pattern: payload.pattern,
                match_type: payload.match_type,
                prebuilt: true,
                tokens: payload.tokens,
                account_id: payload.account_id,
                matchingTransactionIds: payload.matchingTransactionIds,
                category_id: categoryRulePrompt.newCategoryId,
                category: payload.category,
                movement: payload.movement,
              });
              toast({ title: "Rule updated" });
            } else {
              // Create the rule (the primary path now — the stable dialog is where the
              // user confirms the pattern, account scope and time range). `prebuilt: true`
              // because the pattern/tokens shown in the dialog's live preview must be
              // exactly what gets saved — never re-derived.
              await addRule.mutateAsync({
                category_id: categoryRulePrompt.newCategoryId,
                pattern: payload.pattern,
                match_type: payload.match_type,
                prebuilt: true,
                tokens: payload.tokens,
                account_id: payload.account_id,
                matchingTransactionIds: payload.matchingTransactionIds,
                source: "user_correction",
                original_description: payload.original_description,
              });
            }

            if (payload.matchingTransactionIds.length > 0) {
              const retroCount = payload.matchingTransactionIds.length;
              toast({
                title: `${retroCount} transaction${retroCount === 1 ? "" : "s"} updated`,
              });
            }
          } catch (err) {
            toast({
              title: "Couldn't save rule",
              description: err instanceof Error ? err.message : undefined,
              variant: "destructive",
            });
          }
          setCategoryRulePrompt(null);
        }}
      />
    </div>
  );
}
