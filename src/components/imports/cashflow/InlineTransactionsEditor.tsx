import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Check,
  X,
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
import { cn } from "@/lib/utils";
import { evalArithmetic } from "@/lib/safeMath";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  getCategoryLabel,
  getMovementLabel,
  normalizeCategory,
} from "@/lib/categoryTranslations";
import {
  buildRuleFromCorrection,
  ruleMatchesDescription,
  type MatchType,
} from "@/lib/userRules";
import { filterByScope } from "@/hooks/useRetroactiveApply";
import { findExistingActiveRule } from "@/hooks/useRulePreview";
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

const CATEGORY_PILL_COLORS: Record<string, { color: string; bg: string }> = {
  salary: { color: "#B98708", bg: "#FDF3E3" },
  refunds: { color: "#2E6FB8", bg: "#EAF2FC" },
  own_transfer: { color: "#5A6069", bg: "#EFF1F6" },
  shopping: { color: "#4F4FB5", bg: "rgba(110,110,219,.12)" },
  groceries: { color: "#217A49", bg: "rgba(48,166,100,.12)" },
  subscriptions: { color: "#5344A6", bg: "rgba(110,91,203,.12)" },
  to_joint_account: { color: "#2E6FB8", bg: "#EAF2FC" },
  transport: { color: "#2E6FB8", bg: "rgba(59,138,224,.12)" },
  other_expense: { color: "#656C75", bg: "rgba(127,134,143,.12)" },
  other_income: { color: "#656C75", bg: "rgba(127,134,143,.12)" },
  to_investment: { color: "#1F7A45", bg: "rgba(48,166,100,.12)" },
  housing: { color: "#C04F38", bg: "rgba(208,94,72,.12)" },
  restaurants: { color: "#B86B1C", bg: "rgba(204,127,42,.12)" },
  health: { color: "#B5445A", bg: "rgba(200,82,110,.12)" },
  entertainment: { color: "#8B4FAD", bg: "rgba(162,96,196,.12)" },
  education: { color: "#1F7A9E", bg: "rgba(48,150,186,.12)" },
  travel: { color: "#1F7A5E", bg: "rgba(48,150,114,.12)" },
  sports: { color: "#4A7A30", bg: "rgba(86,148,52,.12)" },
  pets: { color: "#A67A22", bg: "rgba(186,144,48,.12)" },
  freelance: { color: "#6B4FAD", bg: "rgba(130,96,196,.12)" },
  investment: { color: "#1F5A8E", bg: "rgba(48,110,168,.12)" },
  rents: { color: "#B86B1C", bg: "rgba(204,127,42,.12)" },
};

function CategoryPill({ category }: { category: string }) {
  const known = CATEGORY_PILL_COLORS[category];
  const color = known?.color ?? "#656C75";
  const bg = known?.bg ?? "rgba(127,134,143,.12)";
  return (
    <span
      className="inline-flex items-center max-w-full overflow-hidden"
      style={{
        gap: 6,
        background: bg,
        color,
        borderRadius: 999,
        padding: "3px 10px 3px 8px",
        font: "600 11.5px Inter, sans-serif",
      }}
    >
      <span className="rounded-full shrink-0" style={{ width: 5, height: 5, background: "currentColor" }} />
      <span className="truncate">{getCategoryLabel(category)}</span>
    </span>
  );
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
  pendingByTx: Record<string, PendingEditShape>;
  setPendingByTx: React.Dispatch<React.SetStateAction<Record<string, PendingEditShape>>>;
  pendingTxIds: Set<string>;
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
  pendingByTx,
  setPendingByTx,
  pendingTxIds: _pendingTxIds,
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
  const { getCategoryIcon, getCategoryColor } = useCategoryTranslations();
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

  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

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

  // Pending (unsaved) edits live in the parent (`BankStatementsTabsView`)
  // so navigating to another month tab does NOT discard them. The row
  // stays yellow until the user confirms or clears it explicitly.
  type PendingEdit = PendingEditShape;

  const setPendingFor = (txId: string, patch: PendingEdit) => {
    setPendingByTx((prev) => {
      const next = { ...prev, [txId]: { ...(prev[txId] || {}), ...patch } };
      return next;
    });
  };
  const clearPendingFor = (txId: string) => {
    setPendingByTx((prev) => {
      if (!(txId in prev)) return prev;
      const next = { ...prev };
      delete next[txId];
      return next;
    });
  };
  const hasAnyPending = Object.keys(pendingByTx).length > 0;

  // Block month / tab navigation while there are unconfirmed edits.
  useEffect(() => {
    if (!hasAnyPending) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasAnyPending]);

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
    onMutate: ({ id }) => {
      setSavingIds((prev) => new Set(prev).add(id));
    },
    onSuccess: async (id) => {
      setSavingIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      setSavedIds((prev) => new Set(prev).add(id));
      // Clear "saved" badge after 1.2s
      setTimeout(() => {
        setSavedIds((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
      }, 1200);
      try { await supabase.rpc("refresh_dashboard_views"); } catch { /* best-effort */ }
      queryClient.invalidateQueries({ queryKey: ["month-transactions-inline", monthKey, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["tx-audit", monthKey, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-period-series"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-opening-balances"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-aggregates"] });
      queryClient.invalidateQueries({ queryKey: ["account-period-summary"] });
    },
    onError: (err: any, vars) => {
      setSavingIds((prev) => {
        const n = new Set(prev);
        n.delete(vars.id);
        return n;
      });
      toast({
        title: "Couldn't save change",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

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

  // ─── Buffered edit handlers ──────────────────────────────────────────
  // Movement / category / amount edits do NOT save automatically.
  // They populate `pendingByTx[id]`. The row turns yellow until the user
  // clicks the green tick in the "Undo" column, which runs validations
  // and persists everything together.

  const applyMovementChange = (tx: MonthTransaction, newMovement: MovementType) => {
    const defaultCat = getCategoriesForMovement(newMovement, tx.amount)[0];
    const cat = categories.find((c) => c.slug === defaultCat);
    saveMutation.mutate({
      id: tx.id,
      payload: {
        movement: newMovement,
        category: defaultCat,
        category_id: cat?.id || null,
        category_source: "MANUAL",
        categorized_by: "user",
        user_corrected: true,
      },
      before: {
        movement: tx.movement,
        category: tx.category,
        category_id: tx.category_id,
      },
    });
  };

  const handleMovementChange = (tx: MonthTransaction, newMovement: MovementType) => {
    if (newMovement === tx.movement) {
      // Reverting back to the saved value clears the pending entry for this field.
      setPendingByTx((prev) => {
        if (!prev[tx.id]) return prev;
        const { movement: _m, category: _c, category_id: _cid, ...rest } = prev[tx.id];
        const next = { ...prev };
        if (Object.keys(rest).length > 0) next[tx.id] = rest;
        else delete next[tx.id];
        return next;
      });
      return;
    }
    // When movement changes, reset the category to the default of the new
    // movement so the user always sees a coherent pair while pending.
    const amount = pendingByTx[tx.id]?.amount ?? tx.amount;
    const defaultCat = getCategoriesForMovement(newMovement, amount)[0];
    const cat = categories.find((c) => c.slug === defaultCat);
    setPendingFor(tx.id, {
      movement: newMovement,
      category: defaultCat,
      category_id: cat?.id || null,
    });
  };

  const handleCategoryChange = (tx: MonthTransaction, newSlug: string) => {
    const cat = categories.find((c) => c.slug === newSlug);
    const categoryId = cat?.id || null;
    setPendingFor(tx.id, { category: newSlug, category_id: categoryId });
  };

  const handleAmountChange = (tx: MonthTransaction, raw: string) => {
    const sanitized = raw.replace(/\s/g, "").replace(",", ".");
    // Accepts a plain number or a simple arithmetic expression (e.g. "50*2"), evaluated by a
    // safe parser — no eval/Function. Returns null on anything malformed.
    const parsed = evalArithmetic(sanitized);
    if (parsed === null) return;
    const pending = pendingByTx[tx.id] || {};
    const movement = (pending.movement || tx.movement || "EXPENSE") as MovementType;
    const sign = movement === "EXPENSE" ? -1 : 1;
    const newAmount = sign * Math.abs(parsed);
    if (newAmount === tx.amount) return;
    const updates: Record<string, unknown> = { amount: newAmount };
    if (movement === "TRANSFER" && newAmount !== 0) {
      const currentCat = pending.category ?? tx.category ?? "own_transfer";
      const validCats = getCategoriesForMovement("TRANSFER", newAmount);
      if (!validCats.includes(currentCat)) {
        const defaultCat = validCats[0];
        const cat = categories.find((c) => c.slug === defaultCat);
        updates.category = defaultCat;
        updates.category_id = cat?.id || null;
      }
    }
    setPendingFor(tx.id, updates);
  };

  const handleSplit = (tx: MonthTransaction, n: number) => {
    if (n < 1) return;
    const baseAmount = pendingByTx[tx.id]?.amount ?? tx.amount;
    const newAmount = Math.sign(baseAmount || 1) * (Math.abs(baseAmount) / n);
    if (newAmount === baseAmount) return;
    setPendingFor(tx.id, { amount: newAmount });
  };

  const handleToggleHidden = (tx: MonthTransaction) => {
    // Hide/Show stays immediate — it's not part of the pending-edit flow.
    saveMutation.mutate({
      id: tx.id,
      payload: { is_hidden: !tx.is_hidden },
      before: { is_hidden: tx.is_hidden },
    });
  };

  // Commit a row's pending edits: run validations, then persist via saveMutation.
  // When `withRule` is true and the category changed, open RuleEditorDialog so the
  // user can fine-tune the pattern and confirm — that's what the second "Sparkles
  // tick" does.
  const commitRow = (tx: MonthTransaction, withRule = false, overrideEdits?: PendingEditShape, isRevert = false) => {
    const pending = overrideEdits || pendingByTx[tx.id];
    if (!pending) return;

    if (overrideEdits) {
      setPendingFor(tx.id, overrideEdits);
    }

    // 1) Sign vs movement mismatch — confirm with the user before saving.
    const finalMovement = (pending.movement ?? tx.movement) as MovementType | null;
    const finalAmount = pending.amount ?? tx.amount;
    const looksWrong =
      finalMovement &&
      ((finalAmount > 0 && finalMovement === "EXPENSE") ||
        (finalAmount < 0 && finalMovement === "INCOME"));
    if (looksWrong && pending.movement && pending.movement !== tx.movement) {
      setMovementConfirm({ tx, newMovement: pending.movement });
      return;
    }

    // 2) Build the persistence payload from pending fields.
    const payload: Record<string, unknown> = {};
    const before: Record<string, unknown> = {};
    if (pending.movement && pending.movement !== tx.movement) {
      payload.movement = pending.movement;
      before.movement = tx.movement;
    }
    if (pending.category && pending.category !== tx.category) {
      payload.category = pending.category;
      payload.category_id = pending.category_id ?? null;
      payload.category_source = "MANUAL";
      payload.categorized_by = "user";
      payload.user_corrected = true;
      before.category = tx.category;
      before.category_id = tx.category_id;
    }
    if (pending.amount !== undefined && pending.amount !== tx.amount) {
      payload.amount = pending.amount;
      before.amount = tx.amount;
      // Track the pre-edit amount, set once on the first manual edit/split — never
      // overwritten by a later edit, so it always holds the true imported value.
      // A revert (isRevert, handled below) clears it back to null instead.
      if (tx.amount_original == null) payload.amount_original = tx.amount;
    }
    if (pending.description !== undefined) {
      payload.description = pending.description;
      payload.description_norm = pending.description;
      before.description = tx.description;
      before.description_norm = tx.description_norm;
    }
    if (pending.date !== undefined && pending.date !== tx.date) {
      payload.date = pending.date;
      before.date = tx.date;
    }
    if (pending.account_id !== undefined && pending.account_id !== tx.account_id) {
      payload.account_id = pending.account_id;
      before.account_id = tx.account_id;
      if (pending.currency) payload.currency = pending.currency;
    }
    if (pending.is_hidden !== undefined && pending.is_hidden !== tx.is_hidden) {
      payload.is_hidden = pending.is_hidden;
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

    if (Object.keys(payload).length === 0) {
      clearPendingFor(tx.id);
      return;
    }

    saveMutation.mutate(
      { id: tx.id, payload, before },
      {
        onSuccess: async () => {
          try {
            const categoryChanged = pending.category && pending.category !== tx.category;
            const movementChanged = pending.movement && pending.movement !== tx.movement;

            if ((categoryChanged || movementChanged) && user) {
              const cleanDesc = (tx.description || tx.description_norm || "")
                .replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, "")
                .trim();
              const targetMovement =
                ((pending.movement ?? tx.movement) || "EXPENSE") as MovementType;
              const ruleCategory = (pending.category ?? tx.category) || (targetMovement === 'INCOME' ? 'other_income' : targetMovement === 'TRANSFER' ? 'own_transfer' : 'other_expense');
              const ruleCategoryId = pending.category_id ?? tx.category_id ?? null;

              if (cleanDesc) {
                if (withRule) {
                  const built = buildRuleFromCorrection(cleanDesc, targetMovement, ruleCategory);
                  const existingRuleId = await findExistingActiveRule({
                    userId: user.id,
                    pattern: built.pattern,
                    category: ruleCategory,
                  });
                  setCategoryRulePrompt({
                    tx,
                    newSlug: ruleCategory,
                    newCategoryId: ruleCategoryId,
                    cleanDesc,
                    targetMovement,
                    existingRuleId,
                  });
                } else {
                  const categoryName = getCategoryLabel(ruleCategory);
                  const { dismiss } = toast({
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
                            dismiss();
                            setCategoryRulePrompt({
                              tx,
                              newSlug: ruleCategory,
                              newCategoryId: ruleCategoryId,
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
                }
              }
            }
          } catch {
            // Rule nudge is best-effort — don't block the save flow
          }
          clearPendingFor(tx.id);
        },
      },
    );
  };

  // Commit ALL pending rows in this month at once (used by the
  // "Save & switch" action in the unsaved-changes toast).
  const commitAllPending = () => {
    const ids = Object.keys(pendingByTx);
    for (const id of ids) {
      const tx = transactions.find((t) => t.id === id);
      if (tx) commitRow(tx, false);
    }
  };

  // (commitAllPending is no longer exposed externally — pending edits now
  // persist across tab switches and are confirmed/discarded per row.)

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
      color: g.accountColor ?? "#9AA1AC",
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
    <div className="flex flex-col flex-1 min-h-0">
      {selectedIds.size > 0 && (
        <BulkActionsToolbar
          count={selectedIds.size}
          categories={categories}
          getCategoryIcon={getCategoryIcon}
          getCategoryColor={getCategoryColor}
          getCategoryLabel={getCategoryLabel}
          onClear={() => setSelectedIds(new Set())}
          onHide={handleBulkHide}
          onShow={handleBulkShow}
          onAssignCategory={handleBulkAssignCategory}
        />
      )}

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
            className="sticky top-0 z-10 grid items-center"
            style={{
              gridTemplateColumns: "34px 94px 54px 66px 128px 102px minmax(0,1fr) 168px 108px 36px",
              gap: 14,
              padding: "11px 34px",
              background: "#FAFBFD",
              borderBottom: "1px solid #EDEFF4",
            }}
          >
            <span className="flex items-center justify-center">
              <Checkbox
                checked={selectedIds.size > 0 ? (selectedIds.size === allVisibleIds.length ? true : "indeterminate") : false}
                onCheckedChange={() => toggleSelectAll(allVisibleIds)}
                aria-label="Select all"
                style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1.6, borderColor: "#C7CCD4" }}
              />
            </span>
            <span style={{ font: "600 10.5px Inter, sans-serif", letterSpacing: "0.09em", textTransform: "uppercase", color: "#9AA1AC" }}>
              {t("imports.date")}
            </span>
            <span style={{ font: "600 10.5px Inter, sans-serif", letterSpacing: "0.09em", textTransform: "uppercase", color: "#9AA1AC" }}>
              {t("imports.week")}
            </span>
            <span style={{ font: "600 10.5px Inter, sans-serif", letterSpacing: "0.09em", textTransform: "uppercase", color: "#9AA1AC" }}>
              {t("imports.source")}
            </span>
            <span style={{ font: "600 10.5px Inter, sans-serif", letterSpacing: "0.09em", textTransform: "uppercase", color: "#9AA1AC" }}>
              {t("imports.movement")}
            </span>
            <span style={{ font: "600 10.5px Inter, sans-serif", letterSpacing: "0.09em", textTransform: "uppercase", color: "#9AA1AC", textAlign: "right" }}>
              {t("imports.amount")}
            </span>
            <span style={{ font: "600 10.5px Inter, sans-serif", letterSpacing: "0.09em", textTransform: "uppercase", color: "#9AA1AC" }}>
              {t("imports.description")}
            </span>
            <span style={{ font: "600 10.5px Inter, sans-serif", letterSpacing: "0.09em", textTransform: "uppercase", color: "#9AA1AC" }}>
              {t("imports.category")}
            </span>
            <span style={{ font: "600 10.5px Inter, sans-serif", letterSpacing: "0.09em", textTransform: "uppercase", color: "#9AA1AC", textAlign: "right" }}>
              {t("imports.balance")}
            </span>
            <span />
          </div>

          {/* Rows */}
          <div>
              {rowsToRender.map((tx) => {
                const isMismatch = mismatchedIds.has(tx.id);
                const isSaving = savingIds.has(tx.id);
                const isSaved = savedIds.has(tx.id);
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
                const pending = pendingByTx[tx.id];
                const isPending = !!pending;
                const movement = (pending?.movement ?? tx.movement ?? "EXPENSE") as MovementType;
                const category = normalizeCategory(
                  pending?.category ?? tx.category ?? "other_expense",
                );
                const rawAmount = pending?.amount ?? tx.amount;
                const displayAmount = splitAmt(rawAmount, tx.account_id);
                // Joint accounts (split_percentage !== 100): show the statement's full
                // amount alongside the user's share, so the split is never opaque.
                const hasSplit = !!(tx.account_id && splitMap[tx.account_id] != null);
                const availableCategories = getCategoriesForMovement(movement, rawAmount);
                const hasPendingCategoryChange =
                  !!pending?.category && pending.category !== tx.category;
                const hasPendingMovementTransfer =
                  !!pending?.movement && pending.movement !== tx.movement &&
                  (tx.movement === "TRANSFER" || pending.movement === "TRANSFER");

                const amountColor =
                  displayAmount === 0
                    ? "text-muted-foreground"
                    : movement === "TRANSFER"
                      ? "text-[#8A919C]"
                      : "text-[#0C0D0E]";

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
                  onSaveWithRule: () => commitRow(tx, true),
                  onBulkHide: selectedIds.size > 1 ? handleBulkHide : undefined,
                  onBulkShow: selectedIds.size > 1 ? handleBulkShow : undefined,
                };

                return (
                  <TransactionContextMenu
                    key={tx.id}
                    isHidden={isHidden}
                    isManual={isManual}
                    isEdited={isEdited}
                    isPending={isPending}
                    hasCategoryChange={hasPendingCategoryChange || hasPendingMovementTransfer}
                    selectedCount={selectedIds.size}
                    {...rowContextActions}
                  >
                    <div
                      className={cn(
                        "grid items-center cursor-pointer transition-[background] duration-100",
                        isMismatch && "bg-amber-50/60 border-l-2 border-l-amber-400",
                        isPending && "bg-warning/10 border-l-2 border-l-warning",
                        isHidden && "opacity-50 bg-muted/20",
                        isSaved && !isMismatch && "bg-success/5",
                        isSelected && "bg-primary/[0.08]",
                      )}
                      style={{
                        gridTemplateColumns: "34px 94px 54px 66px 128px 102px minmax(0,1fr) 168px 108px 36px",
                        gap: 14,
                        padding: "12px 34px",
                        borderBottom: "1px solid #F3F5F9",
                      }}
                      onMouseEnter={(e) => {
                        if (!isMismatch && !isPending && !isHidden && !isSaved && !isSelected)
                          e.currentTarget.style.background = "#FAFBFE";
                      }}
                      onMouseLeave={(e) => {
                        if (!isMismatch && !isPending && !isHidden && !isSaved && !isSelected)
                          e.currentTarget.style.background = "";
                      }}
                    >
                      {/* Checkbox */}
                      <span className="flex items-center justify-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelected(tx.id)}
                          aria-label="Select row"
                          style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1.6, borderColor: "#C7CCD4", background: "#fff" }}
                        />
                      </span>

                      {/* Date */}
                      <span className="tabular-nums whitespace-nowrap" style={{ font: "500 12.5px Inter, sans-serif", color: "#2A303A" }}>
                        {formatDate(new Date(tx.date))}
                      </span>

                      {/* Week */}
                      <span className="whitespace-nowrap" style={{ font: "500 11.5px Inter, sans-serif", color: "#9AA1AC", letterSpacing: "0.02em" }}>
                        W{getISOWeek(tx.date)}
                      </span>

                      {/* Source — pill */}
                      <span>
                        <span
                          style={{
                            display: "inline-block", width: "fit-content",
                            background: "#F1F3F8", color: "#5A6069",
                            borderRadius: 6, padding: "3px 8px",
                            font: "600 10.5px Inter, sans-serif",
                            letterSpacing: "0.02em", textTransform: "lowercase",
                          }}
                        >
                          {getSourceLabel(tx)}
                        </span>
                      </span>

                      {/* Movement — dot + text + chevron */}
                      <span>
                        <Select
                          value={movement}
                          onValueChange={(v) => handleMovementChange(tx, v as MovementType)}
                          disabled={isHidden}
                        >
                          <SelectTrigger className="h-auto w-full border-0 bg-transparent hover:bg-transparent focus:ring-0 p-0 [&_[data-radix-select-icon]]:hidden">
                            <SelectValue>
                              <span className="flex items-center cursor-pointer whitespace-nowrap" style={{ gap: 6 }}>
                                <span
                                  className="rounded-full shrink-0"
                                  style={{
                                    width: 7, height: 7,
                                    background: movement === "INCOME" ? "#2E9E6B" : movement === "EXPENSE" ? "#E8542B" : "#A8AEB8",
                                  }}
                                />
                                <span style={{
                                  font: "500 12.5px Inter, sans-serif",
                                  color: movement === "INCOME" ? "#1F7A45" : movement === "EXPENSE" ? "#C9502A" : "#5A6069",
                                }}>
                                  {getMovementLabel(movement)}
                                </span>
                                <svg className="shrink-0 ml-auto" width="11" height="11" viewBox="0 0 24 24" fill="#C7CCD4"><path d="M7 10l5 5 5-5z" /></svg>
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INCOME">
                              <span className="flex items-center gap-1.5">
                                <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-[#2E9E6B]" />
                                <span style={{ color: "#1F7A45" }}>{getMovementLabel("INCOME")}</span>
                              </span>
                            </SelectItem>
                            <SelectItem value="EXPENSE">
                              <span className="flex items-center gap-1.5">
                                <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-[#E8542B]" />
                                <span style={{ color: "#C9502A" }}>{getMovementLabel("EXPENSE")}</span>
                              </span>
                            </SelectItem>
                            <SelectItem value="TRANSFER">
                              <span className="flex items-center gap-1.5">
                                <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-[#A8AEB8]" />
                                <span style={{ color: "#5A6069" }}>{getMovementLabel("TRANSFER")}</span>
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </span>

                      {/* Amount — double-click to edit */}
                      <span
                        className="tabular-nums whitespace-nowrap"
                        style={{
                          textAlign: "right",
                          font: "500 12.5px Inter, sans-serif",
                          color: movement === "TRANSFER" ? "#5A6069" : "#0C0D0E",
                        }}
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
                                setPendingFor(tx.id, { description: editingDescValue });
                                commitRow(tx, false, { ...pendingByTx[tx.id], description: editingDescValue });
                              }
                              setEditingDescId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              if (e.key === "Escape") { setEditingDescId(null); }
                            }}
                            className="h-6 text-[13.5px] px-1 py-0 border-primary/40"
                            placeholder={t("imports.editDescription")}
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={cn(
                                "truncate",
                                isHidden && "line-through",
                              )}
                              title={cleanDescription}
                              style={{ font: "500 13.5px Inter, sans-serif", color: "#0C0D0E" }}
                            >
                              {cleanDescription}
                            </span>
                            {isSaving && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0" />}
                            {isSaved && !isSaving && <Check className="w-3 h-3 text-success shrink-0" />}
                          </div>
                        )}
                      </span>

                      {/* Category — pill with dot + label + chevron */}
                      <span className="min-w-0">
                        <Select
                          value={category}
                          onValueChange={(v) => handleCategoryChange(tx, v)}
                          disabled={isHidden}
                        >
                          <SelectTrigger className="h-auto w-full border-0 bg-transparent hover:bg-transparent focus:ring-0 p-0 [&_[data-radix-select-icon]]:hidden">
                            <SelectValue>
                              <span className="flex items-center cursor-pointer min-w-0" style={{ gap: 6 }}>
                                <CategoryPill category={category} />
                                <svg className="shrink-0" width="11" height="11" viewBox="0 0 24 24" fill="#C7CCD4"><path d="M7 10l5 5 5-5z" /></svg>
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {availableCategories.map((slug) => (
                              <SelectItem key={slug} value={slug}>
                                <div className="flex items-center gap-2">
                                  <CategoryIcon iconName={getCategoryIcon(slug)} colorVar={getCategoryColor(slug)} size="sm" showBackground />
                                  {getCategoryLabel(slug)}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </span>

                      {/* Balance */}
                      <span className="tabular-nums whitespace-nowrap" style={{ textAlign: "right", font: "500 12.5px Inter, sans-serif", color: "#5A6069" }}>
                        {runningBalanceMap.has(tx.id) ? formatCurrency(runningBalanceMap.get(tx.id)!, undefined, true) : "—"}
                      </span>

                      {/* Actions: kebab / pending save+discard */}
                      <span className="flex items-center justify-center">
                        {isPending ? (
                          <div className="flex items-center gap-0.5 justify-center">
                            <button
                              type="button"
                              onClick={() => commitRow(tx, false)}
                              disabled={isSaving}
                              className="h-6 w-6 inline-flex items-center justify-center rounded-full bg-success/15 text-success hover:bg-success/25"
                              title={t("imports.save")}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => clearPendingFor(tx.id)}
                              className="h-6 w-6 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title={t("imports.cancel")}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center cursor-pointer"
                                style={{ color: "#C7CCD4" }}
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
                        )}
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
                  const isSaving = savingIds.has(tx.id);
                  const isSaved = savedIds.has(tx.id);
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
                          isSaved && !isMismatch && "bg-success/5",
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
                            {isSaving ? (
                              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            ) : isSaved ? (
                              <Check className="h-3 w-3 text-success" />
                            ) : null}
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
                commitRow(tx, withRule, edits, isRevert);
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
                  // User confirmed the mismatch — persist the pending edit
                  // for this row, bypassing the validation in commitRow.
                  const tx = movementConfirm.tx;
                  const pending = pendingByTx[tx.id];
                  if (pending) {
                    const payload: Record<string, unknown> = {};
                    const before: Record<string, unknown> = {};
                    if (pending.movement && pending.movement !== tx.movement) {
                      payload.movement = pending.movement;
                      before.movement = tx.movement;
                    }
                    if (pending.category && pending.category !== tx.category) {
                      payload.category = pending.category;
                      payload.category_id = pending.category_id ?? null;
                      payload.category_source = "MANUAL";
                      payload.categorized_by = "user";
                      payload.user_corrected = true;
                      before.category = tx.category;
                      before.category_id = tx.category_id;
                    }
                    if (pending.amount !== undefined && pending.amount !== tx.amount) {
                      payload.amount = pending.amount;
                      before.amount = tx.amount;
                    }
                    if (Object.keys(payload).length > 0) {
                      saveMutation.mutate(
                        { id: tx.id, payload, before },
                        { onSuccess: () => clearPendingFor(tx.id) },
                      );
                    } else {
                      clearPendingFor(tx.id);
                    }
                  } else {
                    applyMovementChange(tx, movementConfirm.newMovement);
                  }
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
