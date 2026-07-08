import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Check,
  X,
  Eye,
  EyeOff,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  ArrowRightLeft,
  Plus,
  Minus,
  Split as SplitIcon,
  RotateCcw,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { evalArithmetic } from "@/lib/safeMath";
import { supabase } from "@/integrations/supabase/client";
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
import { PillBadge } from "@/components/ui/pill-badge";
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
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { useLocalization } from "@/hooks/useLocalization";
import { useToast } from "@/hooks/use-toast";
import type { Import } from "@/hooks/useImports";
import { RuleEditorDialog } from "../RuleEditorDialog";
import {
  getCategoryLabel,
  getMovementLabel,
  normalizeCategory,
} from "@/lib/categoryTranslations";
import {
  USER_TRACKED_FIELDS,
  ROW_THRESHOLD,
  getCategoriesForMovement,
  getMovementIcon,
  getMovementTone,
  buildOriginalSnapshot,
  isBackToOriginal,
} from "./helpers";
import { AmountEditButton } from "./AmountEditButton";
import { RowEditIndicator } from "./RowEditIndicator";
import { RevertToOriginalButton } from "./RevertToOriginalButton";
import { ManualEntryFooter } from "./ManualEntryFooter";
import { ProcessingPanel } from "./ProcessingPanel";
import type {
  MonthTransaction,
  AuditEntry,
  PendingEditShape,
  PendingFileInfo,
  MovementType,
} from "./types";

export interface InlineTransactionsEditorProps {
  monthKey: string;
  monthLabel: string;
  isLocked: boolean;
  imports: Import[];
  cashAccounts: ReturnType<typeof useAccounts>["accounts"];
  deleteImport: (id: string) => void;
  isDeleting: boolean;
  toggleLockImport: (args: { importId: string; locked: boolean }) => void;
  onAddMore: () => void;
  isProcessing: boolean;
  pendingFiles?: PendingFileInfo[];
  /** Pending edits map lifted to the parent so it survives tab switches. */
  pendingByTx: Record<string, PendingEditShape>;
  setPendingByTx: React.Dispatch<React.SetStateAction<Record<string, PendingEditShape>>>;
  pendingTxIds: Set<string>;
}

export function InlineTransactionsEditor({
  monthKey,
  monthLabel,
  isLocked,
  imports,
  cashAccounts,
  deleteImport,
  isDeleting,
  toggleLockImport,
  onAddMore,
  isProcessing,
  pendingFiles,
  pendingByTx,
  setPendingByTx,
  pendingTxIds: _pendingTxIds,
}: InlineTransactionsEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { categories } = useCategories("CASHFLOW");
  const { accounts } = useAccounts();
  const { formatCurrency, formatDate } = useLocalization();
  const { getCategoryIcon, getCategoryColor } = useCategoryTranslations();

  const [expanded, setExpanded] = useState(false);
  // Per-row "saving"/"saved" indicators
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Movement-mismatch confirmation (e.g. positive amount marked as EXPENSE)
  const [movementConfirm, setMovementConfirm] = useState<{
    tx: MonthTransaction;
    newMovement: MovementType;
  } | null>(null);

  // Category change → "save as rule?" prompt
  const [categoryRulePrompt, setCategoryRulePrompt] = useState<{
    tx: MonthTransaction;
    newSlug: string;
    newCategoryId: string | null;
    cleanDesc: string;
    targetMovement: MovementType;
  } | null>(null);

  // Edit-history popover open state (one tx at a time)
  const [openHistoryFor, setOpenHistoryFor] = useState<string | null>(null);

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
          "id, date, description, description_norm, amount, movement, category, category_id, account_id, is_hidden, import_id",
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
    onSuccess: (id) => {
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
      queryClient.invalidateQueries({ queryKey: ["month-transactions-inline", monthKey, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["tx-audit", monthKey, user?.id] });
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

  // ─── Buffered edit handlers ──────────────────────────────────────────
  // Movement / category / amount edits do NOT save automatically.
  // They populate `pendingByTx[id]`. The row turns yellow until the user
  // clicks the green tick in the "Undo" column, which runs validations
  // and persists everything together.

  const applyMovementChange = (tx: MonthTransaction, newMovement: MovementType) => {
    const defaultCat = getCategoriesForMovement(newMovement)[0];
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
    const defaultCat = getCategoriesForMovement(newMovement)[0];
    const cat = categories.find((c) => c.slug === defaultCat);
    setPendingFor(tx.id, {
      movement: newMovement,
      category: defaultCat,
      category_id: cat?.id || null,
    });
  };

  const applyCategoryChange = (
    tx: MonthTransaction,
    newSlug: string,
    categoryId: string | null,
  ) => {
    saveMutation.mutate({
      id: tx.id,
      payload: {
        category: newSlug,
        category_id: categoryId,
        category_source: "MANUAL",
        categorized_by: "user",
        user_corrected: true,
      },
      before: {
        category: tx.category,
        category_id: tx.category_id,
      },
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
    setPendingFor(tx.id, { amount: newAmount });
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
  const commitRow = (tx: MonthTransaction, withRule = false) => {
    const pending = pendingByTx[tx.id];
    if (!pending) return;

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
    }

    if (Object.keys(payload).length === 0) {
      clearPendingFor(tx.id);
      return;
    }

    saveMutation.mutate(
      { id: tx.id, payload, before },
      {
        onSuccess: async () => {
          // 3) After saving, offer to turn this correction into a rule. The row is
          // already saved either way — the dialog only decides whether future (and
          // matching past) transactions get the same treatment.
          if (pending.category && pending.category !== tx.category && pending.category_id) {
            const cleanDesc = (tx.description_norm || tx.description || "")
              .replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, "")
              .trim();
            const targetMovement =
              ((pending.movement ?? tx.movement) || "EXPENSE") as MovementType;

            if (cleanDesc && withRule && user) {
              setCategoryRulePrompt({
                tx,
                newSlug: pending.category,
                newCategoryId: pending.category_id,
                cleanDesc,
                targetMovement,
              });
            }
            // If withRule is false, we just save quietly — no prompt.
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

  // Summary
  const summary = useMemo(() => {
    const visible = transactions.filter((t) => !t.is_hidden);
    const income = visible
      .filter((t) => t.movement === "INCOME")
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const expenses = visible
      .filter((t) => t.movement === "EXPENSE")
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const transfers = visible.filter((t) => t.movement === "TRANSFER").length;
    const hidden = transactions.filter((t) => t.is_hidden).length;
    return { income, expenses, transfers, hidden, total: transactions.length };
  }, [transactions]);

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
          File uploaded but no transactions detected yet. They will appear here
          once processing finishes.
        </p>
      </div>
    );
  }

  // All rows always render — hidden ones are visually muted but still listed
  // so the user can clearly see what was excluded from dashboard calculations.
  const visibleAll = transactions;
  const showCollapsedHint = !expanded && visibleAll.length > ROW_THRESHOLD;
  const rowsToRender = showCollapsedHint ? visibleAll.slice(0, ROW_THRESHOLD) : visibleAll;

  return (
    <div className="flex flex-col flex-1 min-h-0">
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
      <div className="bg-card flex-1 flex flex-col">
        <div className="overflow-auto max-h-[calc(100vh-220px)]">
          <Table className="w-full table-fixed [&_th]:border-r [&_th]:border-border/60 [&_th:last-child]:border-r-0 [&_td]:border-r [&_td]:border-border/40 [&_td:last-child]:border-r-0">
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="hover:bg-transparent border-b border-border [&>th]:h-10">
                <TableHead className="w-[44px] text-center text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  #
                </TableHead>
                <TableHead className="w-[10%] text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Date
                </TableHead>
                <TableHead className="w-[25%] text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Description
                </TableHead>
                <TableHead className="w-[10%] text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Account
                </TableHead>
                <TableHead className="w-[12%] text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Movement
                </TableHead>
                <TableHead className="w-[16%] text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Category
                </TableHead>
                <TableHead className="w-[14%] text-right text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Amount
                </TableHead>
                <TableHead className="w-[52px] text-center text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Split
                </TableHead>
                <TableHead className="w-[52px]" />
                <TableHead className="w-[52px]" />

              </TableRow>

            </TableHeader>
            <TableBody>
              {rowsToRender.map((tx, idx) => {
                const isMismatch = mismatchedIds.has(tx.id);
                const isSaving = savingIds.has(tx.id);
                const isSaved = savedIds.has(tx.id);
                const isHidden = tx.is_hidden;
                const txHistory = auditByTx[tx.id] || [];
                const editEntries = txHistory.filter((h) => h.action !== "revert");
                const hasEditHistory = editEntries.length > 0;
                const snapshot = hasEditHistory ? buildOriginalSnapshot(txHistory) : null;
                // If the row has been fully reverted to its original imported
                // values, treat it as "not edited" — drop the blue highlight,
                // history dot, and revert button.
                const isEdited =
                  hasEditHistory &&
                  !(snapshot && isBackToOriginal(tx as unknown as Record<string, unknown>, snapshot.values));
                const originalSnapshot = isEdited ? snapshot : null;
                const cleanDescription = (tx.description_norm || tx.description)
                  .replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, "")
                  .trim();
                const pending = pendingByTx[tx.id];
                const isPending = !!pending;
                const movement = (pending?.movement ?? tx.movement ?? "EXPENSE") as MovementType;
                const category = normalizeCategory(
                  pending?.category ?? tx.category ?? "other_expense",
                );
                const displayAmount = pending?.amount ?? tx.amount;
                const availableCategories = getCategoriesForMovement(movement);

                return (
                  <TableRow
                    key={tx.id}
                    className={cn(
                      "transition-colors [&>td]:py-3",
                      isMismatch && "bg-amber-50/60 dark:bg-amber-950/20 border-l-2 border-l-amber-400",
                      isEdited && !isMismatch && !isPending && "bg-primary/[0.04] border-l-2 border-l-primary/60",
                      isPending && "bg-warning/10 border-l-2 border-l-warning",
                      isHidden && "opacity-50 bg-muted/20",
                      isSaved && !isMismatch && "bg-success/5",
                    )}
                  >
                    <TableCell className="w-[44px] px-0 text-center text-xs text-muted-foreground/70 font-normal tabular-nums">
                      <RowEditIndicator
                        index={idx + 1}
                        history={isEdited ? (auditByTx[tx.id] || []) : []}
                        open={openHistoryFor === tx.id}
                        onOpenChange={(o) => setOpenHistoryFor(o ? tx.id : null)}
                        onRevert={(entry) => {
                          if (!entry.diff_json?.before) return;
                          const before = entry.diff_json.before as Record<string, unknown>;
                          const after = (entry.diff_json.after || {}) as Record<string, unknown>;
                          // Restore the previous values; mark this as a revert action in audit.
                          saveMutation.mutate({
                            id: tx.id,
                            payload: { ...before, __action: "revert" },
                            before: after,
                          });
                        }}
                        formatCurrency={formatCurrency}
                        getCategoryLabel={getCategoryLabel}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-foreground tabular-nums whitespace-nowrap">
                      {formatDate(new Date(tx.date))}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-start gap-2 min-w-0">
                        <span
                          className={cn(
                            "break-words flex-1 text-foreground",
                            isHidden && "line-through",
                          )}
                          title={cleanDescription}
                        >
                          {cleanDescription}
                        </span>
                        {isSaving && (
                          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        {isSaved && !isSaving && (
                          <Check className="w-3 h-3 text-success shrink-0 mt-0.5" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {accountName(tx.account_id) || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {isLocked ? (
                        <PillBadge variant="solid" tone={getMovementTone(movement)} icon={getMovementIcon(movement)}>
                          {getMovementLabel(movement)}
                        </PillBadge>
                      ) : (
                        <Select
                          value={movement}
                          onValueChange={(v) => handleMovementChange(tx, v as MovementType)}
                          disabled={isHidden}
                        >
                          <SelectTrigger className="h-8 w-full min-w-[120px] text-sm border-0 bg-transparent hover:bg-muted/50 focus:ring-1 focus:ring-ring/40 px-1.5 [&>svg]:opacity-50 [&>svg]:ml-2 [&>svg]:flex-shrink-0">
                            <SelectValue>
                              <PillBadge variant="solid" tone={getMovementTone(movement)} icon={getMovementIcon(movement)}>
                                {getMovementLabel(movement)}
                              </PillBadge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INCOME">
                              <PillBadge variant="solid" tone="green" icon={<Plus className="w-3 h-3" />}>
                                {getMovementLabel("INCOME")}
                              </PillBadge>
                            </SelectItem>
                            <SelectItem value="EXPENSE">
                              <PillBadge variant="solid" tone="red" icon={<Minus className="w-3 h-3" />}>
                                {getMovementLabel("EXPENSE")}
                              </PillBadge>
                            </SelectItem>
                            <SelectItem value="TRANSFER">
                              <PillBadge variant="solid" tone="amber" icon={<ArrowRightLeft className="w-3 h-3" />}>
                                {getMovementLabel("TRANSFER")}
                              </PillBadge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {isLocked ? (
                        <PillBadge colorVar={getCategoryColor(category)} className="text-[13px]">
                          <CategoryIcon
                            iconName={getCategoryIcon(category)}
                            colorVar={getCategoryColor(category)}
                            size="sm"
                            showBackground={false}
                          />
                          <span className="truncate max-w-[140px]" title={getCategoryLabel(category)}>
                            {getCategoryLabel(category)}
                          </span>
                        </PillBadge>
                      ) : (
                        <Select
                          value={category}
                          onValueChange={(v) => handleCategoryChange(tx, v)}
                          disabled={isHidden}
                        >
                          <SelectTrigger className="h-8 w-full min-w-[160px] text-sm border-0 bg-transparent hover:bg-muted/50 focus:ring-1 focus:ring-ring/40 px-1.5 [&>svg]:opacity-50 [&>svg]:ml-2 [&>svg]:flex-shrink-0">
                            <SelectValue>
                              <PillBadge colorVar={getCategoryColor(category)} className="text-[13px]">
                                <CategoryIcon
                                  iconName={getCategoryIcon(category)}
                                  colorVar={getCategoryColor(category)}
                                  size="sm"
                                  showBackground={false}
                                />
                                <span className="truncate max-w-[140px]" title={getCategoryLabel(category)}>
                                  {getCategoryLabel(category)}
                                </span>
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
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums font-medium text-foreground">
                      {displayAmount < 0 ? "-" : ""}
                      {formatCurrency(Math.abs(displayAmount))}
                    </TableCell>
                    <TableCell className="text-center">
                      {!isLocked && isPending ? (
                        (() => {
                          const categoryChanged =
                            !!pending?.category && pending.category !== tx.category;
                          if (!categoryChanged) return null;
                          return (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 mx-auto rounded-full bg-primary/15 text-primary hover:bg-primary/25 hover:text-primary"
                              onClick={() => commitRow(tx, true)}
                              disabled={isSaving}
                              title="Save & create rule for this description"
                              aria-label="Save and create categorization rule"
                            >
                              <Sparkles className="w-[16px] h-[16px]" />
                            </Button>
                          );
                        })()
                      ) : !isLocked ? (
                        <AmountEditButton
                          originalAmount={displayAmount}
                          formatCurrency={formatCurrency}
                          onChangeAmount={(v) => handleAmountChange(tx, v)}
                          onApplySplit={(n) => handleSplit(tx, n)}
                          disabled={isHidden}
                        />
                      ) : (
                        <div
                          className="h-7 w-7 mx-auto inline-flex items-center justify-center text-muted-foreground/40 cursor-not-allowed"
                          title="Unlock the month to split"
                          aria-disabled="true"
                        >
                          <SplitIcon className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-0 text-center">
                      {!isLocked && isPending ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 mx-auto rounded-full bg-success/15 text-success hover:bg-success/25 hover:text-success"
                          onClick={() => commitRow(tx, false)}
                          disabled={isSaving}
                          title="Save changes"
                          aria-label="Save changes"
                        >
                          <Check className="w-[16px] h-[16px]" />
                        </Button>
                      ) : !isLocked ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 mx-auto text-muted-foreground hover:text-foreground"
                          onClick={() => handleToggleHidden(tx)}
                          title={isHidden ? "Include in totals" : "Hide from totals"}
                        >
                          {isHidden ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                        </Button>
                      ) : (
                        <div
                          className="h-7 w-7 mx-auto inline-flex items-center justify-center text-muted-foreground/40 cursor-not-allowed"
                          title="Unlock the month to edit visibility"
                          aria-disabled="true"
                        >
                          {isHidden ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="px-0 text-center">
                      {!isLocked && isPending ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 mx-auto rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => clearPendingFor(tx.id)}
                          title="Discard pending changes"
                          aria-label="Discard pending changes"
                        >
                          <X className="w-[16px] h-[16px]" />
                        </Button>
                      ) : !isLocked && isEdited && originalSnapshot ? (
                        <RevertToOriginalButton
                          original={originalSnapshot.values}
                          fields={originalSnapshot.fields}
                          current={{
                            movement: tx.movement,
                            category: tx.category,
                            category_id: tx.category_id,
                            amount: tx.amount,
                            is_hidden: tx.is_hidden,
                          }}
                          formatCurrency={formatCurrency}
                          getCategoryLabel={getCategoryLabel}
                          onConfirm={() => {
                            const payload: Record<string, unknown> = {
                              ...originalSnapshot.values,
                              __action: "revert",
                            };
                            if ("category" in originalSnapshot.values) {
                              payload.category_source = "DEFAULT";
                              payload.user_corrected = false;
                            }
                            saveMutation.mutate({
                              id: tx.id,
                              payload,
                              before: {
                                movement: tx.movement,
                                category: tx.category,
                                category_id: tx.category_id,
                                amount: tx.amount,
                                is_hidden: tx.is_hidden,
                              },
                            });
                          }}
                        />
                      ) : (
                        <div
                          className="h-7 w-7 mx-auto inline-flex items-center justify-center text-muted-foreground/30 cursor-not-allowed"
                          title="Nothing to undo"
                          aria-disabled="true"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </div>
                      )}
                    </TableCell>

                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Collapsed-rows hint */}
        {showCollapsedHint && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-border bg-muted/30 text-sm">
            <span className="text-muted-foreground">
              Showing first <strong className="text-foreground">{ROW_THRESHOLD}</strong> of{" "}
              <strong className="text-foreground">{visibleAll.length}</strong> rows
            </span>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setExpanded(true)}>
              <ChevronDown className="w-4 h-4" />
              Show all
            </Button>
          </div>
        )}
        {expanded && visibleAll.length > ROW_THRESHOLD && (
          <div className="flex items-center justify-end gap-3 px-4 py-2.5 border-t border-border bg-muted/30 text-sm">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setExpanded(false)}>
              <ChevronUp className="w-4 h-4" />
              Collapse
            </Button>
          </div>
        )}

        {/* Live processing panel — only rendered while files are being processed. */}
        {pendingFiles && pendingFiles.length > 0 && (
          <div className="bg-card px-6 py-6 flex items-start justify-center border-t border-border">
            <div className="w-full max-w-xl">
              <ProcessingPanel files={pendingFiles} />
            </div>
          </div>
        )}

        {/* Spreadsheet footer: totals (Excel status-bar style) — sticks to the bottom */}
        <ManualEntryFooter
          monthKey={monthKey}
          monthLabel={monthLabel}
          importId={imports[0]?.id ?? null}
          isLocked={isLocked}
          summary={summary}
          rightSlot={
            <button
              type="button"
              onClick={() => {
                // Toggle lock on every file of the month at once
                const nextLocked = !isLocked;
                imports.forEach((imp) => {
                  if (!!imp.locked !== nextLocked) {
                    toggleLockImport({ importId: imp.id, locked: nextLocked });
                  }
                });
                toast({
                  title: nextLocked ? "Month locked" : "Month unlocked",
                  description: nextLocked
                    ? "Editing is disabled until you unlock it."
                    : "You can edit transactions again.",
                });
              }}
              disabled={imports.length === 0}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium transition-colors",
                isLocked
                  ? "bg-foreground/90 text-background hover:bg-foreground"
                  : "bg-muted text-foreground/80 hover:bg-muted/70",
                imports.length === 0 && "opacity-50 cursor-not-allowed",
              )}
              title={isLocked ? "Unlock month — allow editing" : "Lock month — prevent edits"}
            >
              {isLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Locked
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  Lock month
                </>
              )}
            </button>
          }
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
                      {movementConfirm.tx.amount < 0 ? "−" : "+"}
                      {formatCurrency(Math.abs(movementConfirm.tx.amount))}
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

      {/* Category change → optional "save as rule" */}
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
        skipLabel="Don't create rule"
        onConfirm={async (payload) => {
          if (!user || !categoryRulePrompt) {
            setCategoryRulePrompt(null);
            return;
          }
          const { error } = await supabase.from("user_rules").insert({
            user_id: user.id,
            source: "user_correction",
            match_type: payload.match_type,
            pattern: payload.pattern,
            tokens: payload.tokens,
            movement: payload.movement,
            category: payload.category,
            confidence: 0.99,
            original_description: payload.original_description,
            is_active: true,
          });
          if (error) {
            toast({
              title: "Couldn't save rule",
              description: error.message,
              variant: "destructive",
            });
            setCategoryRulePrompt(null);
            return;
          }

          // Retroactive apply: the dialog's live preview already computed the exact
          // set of past transactions this rule matches (same matcher, same data) —
          // apply to that same set so the count shown is what actually changes.
          let retroCount = 0;
          if (payload.matchingTransactionIds.length > 0) {
            const { error: retroError } = await supabase
              .from("transactions")
              .update({
                movement: payload.movement,
                category: payload.category,
                category_id: categoryRulePrompt.newCategoryId,
                category_source: "USER_RULE",
                categorized_by: "user_rule",
              })
              .in("id", payload.matchingTransactionIds);
            if (!retroError) {
              retroCount = payload.matchingTransactionIds.length;
            } else {
              console.error("Retroactive rule apply failed:", retroError);
            }
          }

          toast({
            title: retroCount > 0 ? "✓ Rule saved + history updated" : "✓ Rule saved",
            description:
              retroCount > 0
                ? `${retroCount} past transaction${retroCount === 1 ? "" : "s"} matching “${payload.pattern.slice(0, 40)}${payload.pattern.length > 40 ? "…" : ""}” updated to ${getCategoryLabel(payload.category)}. Future ones will match too.`
                : `Future transactions matching “${payload.pattern.slice(0, 40)}${payload.pattern.length > 40 ? "…" : ""}” will be categorized as ${getCategoryLabel(payload.category)}.`,
          });
          queryClient.invalidateQueries({ queryKey: ["user_rules"] });
          queryClient.invalidateQueries({ queryKey: ["categorization_rules"] });
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
          setCategoryRulePrompt(null);
        }}
      />
    </div>
  );
}
