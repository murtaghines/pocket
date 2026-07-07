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
  Trash2,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useLocalization } from "@/hooks/useLocalization";
import { useToast } from "@/hooks/use-toast";
import type { Import } from "@/hooks/useImports";
import { ProcessingPanel } from "./ProcessingPanel";
import {
  INVESTMENT_TYPES,
  ASSET_TYPES,
  getTypeMeta,
} from "./types";
import type { Investment, PendingInvEdit, PendingFileInfo } from "./types";

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
}: InlineInvestmentsEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency, formatDate } = useLocalization();

  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

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

  const saveMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: PendingInvEdit }) => {
      const payload: Record<string, unknown> = {};
      if (patch.type !== undefined) payload.type = patch.type;
      if (patch.asset_type !== undefined) payload.asset_type = patch.asset_type;
      if (patch.platform !== undefined) payload.platform = patch.platform;
      if (patch.description !== undefined) payload.description = patch.description;
      if (patch.amount !== undefined) payload.amount = patch.amount;
      if (patch.date !== undefined) payload.date = patch.date;
      const { error } = await supabase.from("investments").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      queryClient.invalidateQueries({ queryKey: ["month-investments-inline"] });
    },
  });

  const commitRow = async (inv: Investment) => {
    const pending = pendingByInv[inv.id];
    if (!pending) return;
    setSavingIds((s) => new Set(s).add(inv.id));
    try {
      await saveMutation.mutateAsync({ id: inv.id, patch: pending });
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

  const deleteRow = async (inv: Investment) => {
    try {
      const { error } = await supabase.from("investments").delete().eq("id", inv.id);
      if (error) throw error;
      clearPendingFor(inv.id);
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      queryClient.invalidateQueries({ queryKey: ["month-investments-inline"] });
      toast({ title: "Deleted", description: "Movement removed." });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Could not delete", variant: "destructive" });
    }
  };

  // Distinct platforms from existing investments to populate the selector
  const knownPlatforms = useMemo(() => {
    const set = new Set<string>();
    investments.forEach((i) => i.platform && set.add(i.platform));
    return Array.from(set).sort();
  }, [investments]);

  const summary = useMemo(() => {
    let deposits = 0;
    let withdrawals = 0;
    investments.forEach((i) => {
      if (i.type === "deposit") deposits += Math.abs(i.amount);
      else if (i.type === "withdrawal") withdrawals += Math.abs(i.amount);
    });
    return { count: investments.length, deposits, withdrawals, net: deposits - withdrawals };
  }, [investments]);

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

      {investments.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">
          No movements parsed yet for {monthLabel}.
        </div>
      ) : (
        <div className="overflow-auto max-h-[calc(100vh-220px)]">
          <Table className="w-full table-fixed [&_th]:border-r [&_th]:border-border/60 [&_th:last-child]:border-r-0 [&_td]:border-r [&_td]:border-border/40 [&_td:last-child]:border-r-0">
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="w-[44px] text-center text-xs uppercase tracking-wide text-muted-foreground/60 font-medium">#</TableHead>
                <TableHead className="w-[10%] text-xs uppercase tracking-wide text-muted-foreground font-medium">Date</TableHead>
                <TableHead className="w-[24%] text-xs uppercase tracking-wide text-muted-foreground font-medium">Description</TableHead>
                <TableHead className="w-[12%] text-xs uppercase tracking-wide text-muted-foreground font-medium">Platform</TableHead>
                <TableHead className="w-[12%] text-xs uppercase tracking-wide text-muted-foreground font-medium">Type</TableHead>
                <TableHead className="w-[14%] text-xs uppercase tracking-wide text-muted-foreground font-medium">Asset</TableHead>
                <TableHead className="w-[14%] text-right text-xs uppercase tracking-wide text-muted-foreground font-medium">Amount</TableHead>
                <TableHead className="w-[88px] text-center text-xs uppercase tracking-wide text-muted-foreground font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investments.map((inv, idx) => {
                const pending = pendingByInv[inv.id];
                const isPending = !!pending;
                const isSaving = savingIds.has(inv.id);
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
                      isPending && "bg-warning/10 hover:bg-warning/15",
                    )}
                  >
                    <TableCell className="text-center text-xs text-muted-foreground/60 tabular-nums">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      <Input
                        type="date"
                        value={date}
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
                        className="h-7 px-1.5 text-sm bg-transparent border-0 hover:border focus:border focus-visible:ring-0"
                      />
                    </TableCell>
                    <TableCell className="text-sm">
                      <Input
                        list={`platforms-${monthKey}`}
                        value={platform}
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
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                title="Delete movement"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete movement?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove this investment movement.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteRow(inv)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
