import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Plus,
  Check,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/hooks/useAuth";
import { useLocalization } from "@/hooks/useLocalization";
import { useToast } from "@/hooks/use-toast";
import type { Import } from "@/hooks/useImports";
import { ProcessingPanel } from "./ProcessingPanel";
import { RowEditIndicator } from "./RowEditIndicator";
import { RevertToOriginalButton } from "./RevertToOriginalButton";
import { USER_TRACKED_FIELDS, buildOriginalSnapshot, isBackToOriginal } from "./helpers";
import {
  INVESTMENT_TYPES,
  ASSET_TYPES,
  getTypeMeta,
} from "./types";
import type { Investment, PendingInvEdit, PendingFileInfo, AuditEntry } from "./types";

export interface InlineInvestmentsEditorProps {
  monthKey: string;
  monthLabel: string;
  imports: Import[];
  deleteImport: (id: string) => void;
  isDeleting: boolean;
  onAddMore: () => void;
  isProcessing: boolean;
  pendingFiles?: PendingFileInfo[];
  pendingByInv: Record<string, PendingInvEdit>;
  setPendingByInv: React.Dispatch<React.SetStateAction<Record<string, PendingInvEdit>>>;
  filterUploadIds?: Set<string>;
}

export function InlineInvestmentsEditor({
  monthKey,
  monthLabel,
  imports,
  deleteImport,
  isDeleting,
  onAddMore,
  isProcessing,
  pendingFiles,
  pendingByInv,
  setPendingByInv,
  filterUploadIds,
}: InlineInvestmentsEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency, formatDate } = useLocalization();

  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [openHistoryFor, setOpenHistoryFor] = useState<string | null>(null);

  const setPendingFor = (id: string, patch: PendingInvEdit) => {
    setPendingByInv((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), ...patch },
    }));
  };
  const clearPendingFor = (id: string) => {
    setPendingByInv((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Fetch investments for this month
  const { data: investments = [], isLoading } = useQuery({
    queryKey: ["month-investments-inline", monthKey, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const [year, month] = monthKey.split("-").map(Number);
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = new Date(year, month, 0);
      const end = `${year}-${String(month).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data || []) as Investment[];
    },
    enabled: !!user,
  });

  const displayedInvestments = filterUploadIds
    ? investments.filter((inv) => inv.upload_id != null && filterUploadIds.has(inv.upload_id))
    : investments;

  // Edit history for every investment in this month, grouped by row id (newest first).
  // Mirrors InlineTransactionsEditor's tx-audit query.
  const { data: auditByInv = {} } = useQuery({
    queryKey: ["inv-audit", monthKey, user?.id],
    queryFn: async () => {
      if (!user || investments.length === 0) return {};
      const ids = investments.map((i) => i.id);
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, entity_id, action, created_at, diff_json")
        .eq("user_id", user.id)
        .eq("entity_type", "investment")
        .in("entity_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const grouped: Record<string, AuditEntry[]> = {};
      for (const row of (data || []) as AuditEntry[]) {
        (grouped[row.entity_id] ||= []).push(row);
      }
      return grouped;
    },
    enabled: !!user && investments.length > 0,
  });

  // Single auto-save mutation: applies a partial update and logs the diff to audit_log,
  // same shape as InlineTransactionsEditor's saveMutation.
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
      const action = (payload as { __action?: string }).__action ?? "edit";
      const updatePayload: Record<string, unknown> = {};
      for (const key of Object.keys(payload)) {
        if (key.startsWith("__")) continue;
        updatePayload[key] = payload[key];
      }
      // Same invariant as transactions: never write transaction_hash here — it's frozen at
      // import and re-upload dedup depends on it staying that way. See docs/epics/uploads.md.
      const { error } = await supabase.from("investments").update(updatePayload).eq("id", id);
      if (error) throw error;

      if (user?.id && before) {
        const fields: string[] = [];
        const beforeDiff: Record<string, unknown> = {};
        const afterDiff: Record<string, unknown> = {};
        for (const key of Object.keys(updatePayload)) {
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
            _entity_type: "investment",
            _entity_id: id,
            _action: action,
            _diff: { fields, before: beforeDiff, after: afterDiff } as never,
          });
        }
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      queryClient.invalidateQueries({ queryKey: ["month-investments-inline"] });
      queryClient.invalidateQueries({ queryKey: ["inv-audit", monthKey, user?.id] });
    },
  });

  const commitRow = async (inv: Investment) => {
    const pending = pendingByInv[inv.id];
    if (!pending) return;
    setSavingIds((s) => new Set(s).add(inv.id));
    try {
      const before: Record<string, unknown> = {};
      for (const key of Object.keys(pending)) {
        before[key] = (inv as unknown as Record<string, unknown>)[key];
      }
      await saveMutation.mutateAsync({ id: inv.id, payload: pending, before });
      clearPendingFor(inv.id);
      toast({ title: "Saved", description: "Movement updated." });
    } catch (e: any) {
      toast({
        title: "Could not save",
        description: e?.message || "Try again.",
        variant: "destructive",
      });
    } finally {
      setSavingIds((s) => {
        const n = new Set(s);
        n.delete(inv.id);
        return n;
      });
    }
  };

  // Hide/show stays immediate — not part of the pending-edit flow, same as
  // InlineTransactionsEditor's handleToggleHidden. Reversible (audited above), and excluded
  // from all dashboard aggregates in useInvestments.tsx once hidden.
  const handleToggleHidden = (inv: Investment) => {
    saveMutation.mutate({
      id: inv.id,
      payload: { is_hidden: !inv.is_hidden },
      before: { is_hidden: inv.is_hidden },
    });
  };

  // Distinct platforms from existing investments to populate the selector
  const knownPlatforms = useMemo(() => {
    const set = new Set<string>();
    displayedInvestments.forEach((i) => i.platform && set.add(i.platform));
    return Array.from(set).sort();
  }, [displayedInvestments]);

  const summary = useMemo(() => {
    const visible = displayedInvestments.filter((i) => !i.is_hidden);
    let deposits = 0;
    let withdrawals = 0;
    visible.forEach((i) => {
      if (i.type === "deposit") deposits += Math.abs(i.amount);
      else if (i.type === "withdrawal") withdrawals += Math.abs(i.amount);
    });
    const hidden = displayedInvestments.length - visible.length;
    return { count: visible.length, deposits, withdrawals, net: deposits - withdrawals, hidden };
  }, [displayedInvestments]);

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 border-b border-border bg-muted/20 text-sm">
        <div className="inline-flex items-center gap-1.5">
          <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-semibold text-foreground tabular-nums">
            {summary.count}
          </span>
          <span className="text-muted-foreground">movements</span>
        </div>
        <div className="inline-flex items-center gap-1.5 text-success">
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="tabular-nums font-medium">
            {formatCurrency(summary.deposits)}
          </span>
          <span className="text-muted-foreground text-xs">deposits</span>
        </div>
        <div className="inline-flex items-center gap-1.5 text-destructive">
          <TrendingDown className="w-3.5 h-3.5" />
          <span className="tabular-nums font-medium">
            {formatCurrency(summary.withdrawals)}
          </span>
          <span className="text-muted-foreground text-xs">withdrawals</span>
        </div>
        <div className="ml-auto inline-flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onAddMore} disabled={isProcessing} className="h-8 gap-1.5">
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add file
          </Button>
        </div>
      </div>

      {pendingFiles && pendingFiles.length > 0 && (
        <div className="px-6 py-3 border-b border-border">
          <ProcessingPanel files={pendingFiles} />
        </div>
      )}

      {displayedInvestments.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">
          No movements parsed yet for {monthLabel}.
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)]">
          {/* min-width keeps the fixed columns from collapsing/overlapping on
              narrow screens — the container scrolls horizontally instead. */}
          <Table className="w-full min-w-[760px] table-fixed [&_th]:border-r [&_th]:border-border/60 [&_th:last-child]:border-r-0 [&_td]:border-r [&_td]:border-border/40 [&_td:last-child]:border-r-0">
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="w-[44px] text-center text-xs uppercase tracking-wide text-muted-foreground/60 font-medium">#</TableHead>
                <TableHead className="w-[10%] text-xs uppercase tracking-wide text-muted-foreground font-medium">Date</TableHead>
                <TableHead className="w-[24%] text-xs uppercase tracking-wide text-muted-foreground font-medium">Description</TableHead>
                <TableHead className="w-[12%] text-xs uppercase tracking-wide text-muted-foreground font-medium">Platform</TableHead>
                <TableHead className="w-[12%] text-xs uppercase tracking-wide text-muted-foreground font-medium">Type</TableHead>
                <TableHead className="w-[14%] text-xs uppercase tracking-wide text-muted-foreground font-medium">Asset</TableHead>
                <TableHead className="w-[14%] text-right text-xs uppercase tracking-wide text-muted-foreground font-medium">Amount</TableHead>
                <TableHead className="w-[104px] text-center text-xs uppercase tracking-wide text-muted-foreground font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedInvestments.map((inv, idx) => {
                const pending = pendingByInv[inv.id];
                const isPending = !!pending;
                const isSaving = savingIds.has(inv.id);
                const isHidden = inv.is_hidden;
                const invHistory = auditByInv[inv.id] || [];
                const editEntries = invHistory.filter((h) => h.action !== "revert");
                const hasEditHistory = editEntries.length > 0;
                const snapshot = hasEditHistory ? buildOriginalSnapshot(invHistory) : null;
                const isEdited =
                  hasEditHistory &&
                  !(snapshot && isBackToOriginal(inv as unknown as Record<string, unknown>, snapshot.values));
                const originalSnapshot = isEdited ? snapshot : null;
                const type = (pending?.type ?? inv.type) || "deposit";
                const meta = getTypeMeta(type);
                const TypeIcon = meta.icon;
                const platform = pending?.platform ?? inv.platform ?? "";
                const asset = (pending?.asset_type ?? inv.asset_type) || "";
                const description = pending?.description ?? inv.description ?? "";
                const amount = pending?.amount ?? inv.amount;
                const date = pending?.date ?? inv.date;

                return (
                  <TableRow
                    key={inv.id}
                    className={cn(
                      "border-b border-border/40 hover:bg-muted/30 transition-colors",
                      isEdited && !isPending && "bg-primary/[0.04] border-l-2 border-l-primary/60",
                      isPending && "bg-warning/10 hover:bg-warning/15",
                      isHidden && "opacity-50 bg-muted/20",
                    )}
                  >
                    <TableCell className="text-center text-xs text-muted-foreground/60 tabular-nums">
                      <RowEditIndicator
                        index={idx + 1}
                        history={isEdited ? invHistory : []}
                        open={openHistoryFor === inv.id}
                        onOpenChange={(o) => setOpenHistoryFor(o ? inv.id : null)}
                        onRevert={(entry) => {
                          if (!entry.diff_json?.before) return;
                          const before = entry.diff_json.before as Record<string, unknown>;
                          const after = (entry.diff_json.after || {}) as Record<string, unknown>;
                          saveMutation.mutate({
                            id: inv.id,
                            payload: { ...before, __action: "revert" },
                            before: after,
                          });
                        }}
                        formatCurrency={formatCurrency}
                      />
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      <Input
                        type="date"
                        value={date}
                        disabled={isHidden}
                        onChange={(e) => {
                          if (e.target.value === inv.date) {
                            const next = { ...(pendingByInv[inv.id] || {}) };
                            delete next.date;
                            if (Object.keys(next).length === 0) clearPendingFor(inv.id);
                            else setPendingByInv((p) => ({ ...p, [inv.id]: next }));
                          } else {
                            setPendingFor(inv.id, { date: e.target.value });
                          }
                        }}
                        className="h-7 px-1.5 text-xs bg-transparent border-0 hover:border focus:border focus-visible:ring-0"
                      />
                    </TableCell>
                    <TableCell className="text-sm">
                      <Input
                        value={description}
                        disabled={isHidden}
                        onChange={(e) => {
                          if (e.target.value === (inv.description || "")) {
                            const next = { ...(pendingByInv[inv.id] || {}) };
                            delete next.description;
                            if (Object.keys(next).length === 0) clearPendingFor(inv.id);
                            else setPendingByInv((p) => ({ ...p, [inv.id]: next }));
                          } else {
                            setPendingFor(inv.id, { description: e.target.value });
                          }
                        }}
                        className={cn(
                          "h-7 px-1.5 text-sm bg-transparent border-0 hover:border focus:border focus-visible:ring-0",
                          isHidden && "line-through",
                        )}
                      />
                    </TableCell>
                    <TableCell className="text-sm">
                      <Input
                        list={`platforms-${monthKey}`}
                        value={platform}
                        disabled={isHidden}
                        onChange={(e) => {
                          if (e.target.value === (inv.platform || "")) {
                            const next = { ...(pendingByInv[inv.id] || {}) };
                            delete next.platform;
                            if (Object.keys(next).length === 0) clearPendingFor(inv.id);
                            else setPendingByInv((p) => ({ ...p, [inv.id]: next }));
                          } else {
                            setPendingFor(inv.id, { platform: e.target.value });
                          }
                        }}
                        className="h-7 px-1.5 text-sm bg-transparent border-0 hover:border focus:border focus-visible:ring-0"
                      />
                      <datalist id={`platforms-${monthKey}`}>
                        {knownPlatforms.map((p) => (
                          <option key={p} value={p} />
                        ))}
                      </datalist>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={type}
                        disabled={isHidden}
                        onValueChange={(v) => {
                          if (v === inv.type) {
                            const next = { ...(pendingByInv[inv.id] || {}) };
                            delete next.type;
                            if (Object.keys(next).length === 0) clearPendingFor(inv.id);
                            else setPendingByInv((p) => ({ ...p, [inv.id]: next }));
                          } else {
                            setPendingFor(inv.id, { type: v });
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 px-1.5 border-0 bg-transparent hover:border focus:border focus-visible:ring-0 gap-1.5">
                          <span className="inline-flex items-center gap-1.5">
                            <TypeIcon className="w-3 h-3" />
                            <PillBadge tone={meta.tone}>{meta.label}</PillBadge>
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {INVESTMENT_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={asset || "__none__"}
                        disabled={isHidden}
                        onValueChange={(v) => {
                          const next = v === "__none__" ? null : v;
                          if (next === (inv.asset_type || null)) {
                            const cur = { ...(pendingByInv[inv.id] || {}) };
                            delete cur.asset_type;
                            if (Object.keys(cur).length === 0) clearPendingFor(inv.id);
                            else setPendingByInv((p) => ({ ...p, [inv.id]: cur }));
                          } else {
                            setPendingFor(inv.id, { asset_type: next });
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 px-1.5 text-xs border-0 bg-transparent hover:border focus:border focus-visible:ring-0">
                          <SelectValue placeholder="—">
                            {asset || <span className="text-muted-foreground">—</span>}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          {ASSET_TYPES.map((a) => (
                            <SelectItem key={a} value={a}>
                              {a}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      <Input
                        type="number"
                        step="0.01"
                        value={amount}
                        disabled={isHidden}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (Number.isNaN(v)) return;
                          if (v === inv.amount) {
                            const next = { ...(pendingByInv[inv.id] || {}) };
                            delete next.amount;
                            if (Object.keys(next).length === 0) clearPendingFor(inv.id);
                            else setPendingByInv((p) => ({ ...p, [inv.id]: next }));
                          } else {
                            setPendingFor(inv.id, { amount: v });
                          }
                        }}
                        className="h-7 px-1.5 text-sm text-right tabular-nums bg-transparent border-0 hover:border focus:border focus-visible:ring-0"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-0.5">
                        {isPending ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 bg-success/15 text-success hover:bg-success/25"
                              onClick={() => commitRow(inv)}
                              disabled={isSaving}
                              title="Save changes"
                            >
                              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              onClick={() => clearPendingFor(inv.id)}
                              disabled={isSaving}
                              title="Discard changes"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleToggleHidden(inv)}
                              title={isHidden ? "Show — include in totals again" : "Hide from totals"}
                            >
                              {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </Button>
                            {originalSnapshot && (
                              <RevertToOriginalButton
                                original={originalSnapshot.values}
                                fields={originalSnapshot.fields}
                                current={inv as unknown as Record<string, unknown>}
                                formatCurrency={formatCurrency}
                                onConfirm={() => {
                                  const payload: Record<string, unknown> = {
                                    ...originalSnapshot.values,
                                    __action: "revert",
                                  };
                                  const before: Record<string, unknown> = {};
                                  for (const key of originalSnapshot.fields) {
                                    before[key] = (inv as unknown as Record<string, unknown>)[key];
                                  }
                                  saveMutation.mutate({ id: inv.id, payload, before });
                                }}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
