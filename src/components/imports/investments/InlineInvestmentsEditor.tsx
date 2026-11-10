import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
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
  Pencil,
  RotateCcw,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useLocalization } from "@/hooks/useLocalization";
import { useToast } from "@/hooks/use-toast";
import type { Import } from "@/hooks/useImports";
import type { Account } from "@/hooks/useAccounts";
import { getAccountDisplayName } from "@/lib/accountColors";
import { ProcessingPanel } from "./ProcessingPanel";
import type { InvestmentSummary, InvestmentAccountTab } from "./InvestmentDataToolbar";
import { InvestmentEditDrawer } from "./InvestmentEditDrawer";
import { RowEditIndicator } from "./RowEditIndicator";
import { RevertToOriginalButton } from "./RevertToOriginalButton";
import { USER_TRACKED_FIELDS, buildOriginalSnapshot, isBackToOriginal } from "./helpers";
import {
  INVESTMENT_TYPES,
  ASSET_TYPES,
  getTypeMeta,
} from "./types";
import type { Investment, PendingInvEdit, PendingFileInfo, AuditEntry } from "./types";
import { toast as sonnerToast } from "sonner";

function getISOWeek(dateStr: string): number {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

const TYPE_DOT_COLOR: Record<string, string> = {
  green: "hsl(var(--success))",
  red: "hsl(var(--destructive))",
  amber: "hsl(var(--warning))",
  neutral: "hsl(var(--muted-foreground))",
};

const TYPE_TEXT_COLOR: Record<string, string> = {
  green: "hsl(var(--success))",
  red: "hsl(var(--destructive))",
  amber: "hsl(var(--warning))",
  neutral: "hsl(var(--muted-foreground))",
};

const TYPE_ICON_BG: Record<string, string> = {
  green: "bg-success/15 text-success",
  red: "bg-destructive/15 text-destructive",
  amber: "bg-warning/15 text-warning",
  neutral: "bg-muted text-muted-foreground",
};

const ASSET_TYPE_COLORS: Record<string, string> = {
  Stock: "category-investment",
  ETF: "category-transport",
  Bond: "category-other-income",
  Crypto: "category-entertainment",
  "Mutual Fund": "category-education",
  "Index Fund": "category-subscriptions",
  "Real Estate": "category-housing",
  Commodity: "category-restaurants",
  Cash: "category-own-transfer",
  Other: "category-other-expense",
};

export interface InlineInvestmentsEditorProps {
  monthKey: string;
  monthLabel: string;
  imports: Import[];
  investmentAccounts: Account[];
  deleteImport: (id: string) => void;
  isDeleting: boolean;
  onAddMore: () => void;
  isProcessing: boolean;
  pendingFiles?: PendingFileInfo[];
  pendingByInv: Record<string, PendingInvEdit>;
  setPendingByInv: React.Dispatch<React.SetStateAction<Record<string, PendingInvEdit>>>;
  filterUploadIds?: Set<string>;
  onTabsDataChange?: (data: { tabs: InvestmentAccountTab[]; globalSummary: InvestmentSummary }) => void;
}

export function InlineInvestmentsEditor({
  monthKey,
  monthLabel,
  imports,
  investmentAccounts,
  deleteImport,
  isDeleting,
  onAddMore,
  isProcessing,
  pendingFiles,
  pendingByInv,
  setPendingByInv,
  filterUploadIds,
  onTabsDataChange,
}: InlineInvestmentsEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency, formatDate, formatWeekday } = useLocalization();
  const { t } = useTranslation("common");

  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [openHistoryFor, setOpenHistoryFor] = useState<string | null>(null);
  const [editingInv, setEditingInv] = useState<Investment | null>(null);
  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [editingDescValue, setEditingDescValue] = useState("");
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [editingAmountValue, setEditingAmountValue] = useState("");

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

  const dayGroups: { dateKey: string; rows: Investment[] }[] = [];
  for (const inv of displayedInvestments) {
    const last = dayGroups[dayGroups.length - 1];
    if (last && last.dateKey === inv.date) last.rows.push(inv);
    else dayGroups.push({ dateKey: inv.date, rows: [inv] });
  }

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

  const commitRow = async (inv: Investment, overrideEdits?: PendingInvEdit) => {
    const pending = overrideEdits || pendingByInv[inv.id];
    if (!pending) return;
    if (overrideEdits) {
      setPendingFor(inv.id, overrideEdits);
    }
    setSavingIds((s) => new Set(s).add(inv.id));
    try {
      const before: Record<string, unknown> = {};
      for (const key of Object.keys(pending)) {
        before[key] = (inv as unknown as Record<string, unknown>)[key];
      }
      await saveMutation.mutateAsync({ id: inv.id, payload: pending, before });
      clearPendingFor(inv.id);
      setSavedIds((s) => new Set(s).add(inv.id));
      setTimeout(() => setSavedIds((s) => { const n = new Set(s); n.delete(inv.id); return n; }), 1500);
      toast({ title: t("imports.saved"), description: t("imports.movementUpdated") });
    } catch (e: any) {
      toast({
        title: t("imports.couldNotSave"),
        description: e?.message || t("imports.tryAgain"),
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

  const handleToggleHidden = (inv: Investment) => {
    saveMutation.mutate({
      id: inv.id,
      payload: { is_hidden: !inv.is_hidden },
      before: { is_hidden: inv.is_hidden },
    });
  };

  const handleDescriptionSave = (inv: Investment, newDesc: string) => {
    if (newDesc === (inv.description || "")) return;
    saveMutation.mutate({
      id: inv.id,
      payload: { description: newDesc },
      before: { description: inv.description },
    });
  };

  const handleAmountSave = (inv: Investment, raw: string) => {
    const sanitized = raw.replace(/\s/g, "").replace(",", ".");
    const parsed = parseFloat(sanitized);
    if (Number.isNaN(parsed)) return;
    if (parsed === inv.amount) return;
    saveMutation.mutate({
      id: inv.id,
      payload: { amount: parsed },
      before: { amount: inv.amount },
    });
  };

  const handleTypeChange = (inv: Investment, newType: string) => {
    if (newType === inv.type) return;
    saveMutation.mutate({
      id: inv.id,
      payload: { type: newType },
      before: { type: inv.type },
    });
  };

  const handleAssetTypeChange = (inv: Investment, newAsset: string | null) => {
    if (newAsset === (inv.asset_type || null)) return;
    saveMutation.mutate({
      id: inv.id,
      payload: { asset_type: newAsset },
      before: { asset_type: inv.asset_type },
    });
  };

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

  const accountTabsData = useMemo<InvestmentAccountTab[]>(() => {
    const map = new Map<string, { id: string; name: string; color: string | null; count: number }>();
    for (const inv of investments) {
      if (!inv.upload_id) continue;
      const imp = imports.find((i) => i.id === inv.upload_id);
      if (!imp?.account_id) continue;
      const existing = map.get(imp.account_id);
      if (existing) {
        existing.count++;
      } else {
        const acct = investmentAccounts.find((a) => a.id === imp.account_id);
        map.set(imp.account_id, {
          id: imp.account_id,
          name: acct ? getAccountDisplayName(acct) : imp.account_id,
          color: null,
          count: 1,
        });
      }
    }
    return Array.from(map.values());
  }, [investments, imports, investmentAccounts]);

  const tabsCallbackRef = useRef(onTabsDataChange);
  tabsCallbackRef.current = onTabsDataChange;
  useEffect(() => {
    tabsCallbackRef.current?.({ tabs: accountTabsData, globalSummary: summary });
  }, [accountTabsData, summary]);

  if (isLoading) {
    return (
      <div className="bg-card py-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
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
          <span className="text-muted-foreground">{t("imports.movementsCount")}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 text-success">
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="tabular-nums font-medium">
            {formatCurrency(summary.deposits)}
          </span>
          <span className="text-muted-foreground text-xs">{t("imports.depositsLabel")}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 text-destructive">
          <TrendingDown className="w-3.5 h-3.5" />
          <span className="tabular-nums font-medium">
            {formatCurrency(summary.withdrawals)}
          </span>
          <span className="text-muted-foreground text-xs">{t("imports.withdrawalsLabel")}</span>
        </div>
        <div className="ml-auto inline-flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onAddMore} disabled={isProcessing} className="h-8 gap-1.5">
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {t("imports.addFile")}
          </Button>
        </div>
      </div>

      {pendingFiles && pendingFiles.length > 0 && (
        <div className="px-6 py-3 border-b border-border">
          <ProcessingPanel files={pendingFiles} />
        </div>
      )}

      {displayedInvestments.length === 0 ? (
        <div className="bg-card py-12 px-6 text-center">
          <FileSpreadsheet className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {t("imports.noMovementsYet", { month: monthLabel })}
          </p>
        </div>
      ) : (
        <>
        {/* Desktop / tablet: CSS grid spreadsheet */}
        <div className="bg-card flex-1 flex flex-col min-h-0">
          <div className="hidden md:block overflow-auto flex-1 min-h-0">
            {/* Sticky header */}
            <div
              className="sticky top-0 z-10 grid items-center bg-card border-b border-border"
              style={{
                gridTemplateColumns: "34px 94px 54px 72px 108px 102px minmax(0,1fr) 120px 36px",
                gap: 14,
                padding: "11px 34px",
              }}
            >
              <span />
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
                {t("imports.fieldType")}
              </span>
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground text-right">
                {t("imports.amount")}
              </span>
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
                {t("imports.description")}
              </span>
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
                {t("imports.fieldAssetType")}
              </span>
              <span />
            </div>

            {/* Rows */}
            <div>
              {displayedInvestments.map((inv, idx) => {
                const isHidden = inv.is_hidden;
                const invHistory = auditByInv[inv.id] || [];
                const editEntries = invHistory.filter((h) => h.action !== "revert");
                const hasEditHistory = editEntries.length > 0;
                const snapshot = hasEditHistory ? buildOriginalSnapshot(invHistory) : null;
                const isEdited =
                  hasEditHistory &&
                  !(snapshot && isBackToOriginal(inv as unknown as Record<string, unknown>, snapshot.values));
                const originalSnapshot = isEdited ? snapshot : null;
                const type = inv.type || "deposit";
                const meta = getTypeMeta(type);
                const dotColor = TYPE_DOT_COLOR[meta.tone] ?? TYPE_DOT_COLOR.neutral;
                const textColor = TYPE_TEXT_COLOR[meta.tone] ?? TYPE_TEXT_COLOR.neutral;
                const description = inv.description ?? "";
                const asset = inv.asset_type || "";
                const assetColorVar = ASSET_TYPE_COLORS[asset] || "category-other-expense";

                return (
                  <div
                    key={inv.id}
                    className={cn(
                      "grid items-center cursor-pointer transition-[background] duration-100",
                      isEdited && "bg-primary/[0.04] border-l-2 border-l-primary/60",
                      isHidden && "opacity-50 bg-muted/20",
                    )}
                    style={{
                      gridTemplateColumns: "34px 94px 54px 72px 108px 102px minmax(0,1fr) 120px 36px",
                      gap: 14,
                      padding: "12px 34px",
                      borderBottom: "1px solid hsl(var(--border) / 0.5)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isHidden)
                        e.currentTarget.style.background = "hsl(var(--muted) / 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isHidden)
                        e.currentTarget.style.background = "";
                    }}
                  >
                    {/* Row # / edit indicator */}
                    <span className="flex items-center justify-center text-xs text-muted-foreground/60 tabular-nums">
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
                    </span>

                    {/* Date */}
                    <span className="tabular-nums whitespace-nowrap text-xs font-medium text-foreground">
                      {formatDate(new Date(inv.date))}
                    </span>

                    {/* Week */}
                    <span className="whitespace-nowrap text-[11.5px] font-medium text-muted-foreground tracking-wide">
                      W{getISOWeek(inv.date)}
                    </span>

                    {/* Platform — source pill */}
                    <span>
                      {inv.platform ? (
                        <span className="inline-block w-fit bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[10.5px] font-semibold tracking-wide lowercase truncate max-w-full">
                          {inv.platform}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </span>

                    {/* Type — colored dot + native select */}
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-[7px] h-[7px] rounded-full shrink-0"
                        style={{ backgroundColor: dotColor }}
                      />
                      <div className="pk-select-wrap pk-select-wrap--sm flex-1 min-w-0 flex items-center">
                        <select
                          value={type}
                          onChange={(e) => handleTypeChange(inv, e.target.value)}
                          disabled={isHidden}
                          className="h-auto w-full border-0 bg-transparent text-xs font-semibold cursor-pointer leading-none"
                          style={{ color: textColor, paddingBlock: 0 }}
                        >
                          {INVESTMENT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                    </span>

                    {/* Amount — double-click to edit */}
                    <span
                      className="tabular-nums whitespace-nowrap text-right text-xs font-medium text-foreground"
                      onDoubleClick={() => {
                        if (isHidden) return;
                        setEditingAmountId(inv.id);
                        setEditingAmountValue(String(inv.amount).replace(".", ","));
                      }}
                    >
                      {editingAmountId === inv.id ? (
                        <Input
                          value={editingAmountValue}
                          onChange={(e) => setEditingAmountValue(e.target.value)}
                          onBlur={() => {
                            handleAmountSave(inv, editingAmountValue);
                            setEditingAmountId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            if (e.key === "Escape") setEditingAmountId(null);
                          }}
                          inputMode="decimal"
                          className="h-6 text-[12.5px] px-1 py-0 text-right tabular-nums border-primary/40 w-24 ml-auto"
                          autoFocus
                        />
                      ) : (
                        <span>{formatCurrency(type === "deposit" ? inv.amount : -inv.amount, undefined, true)}</span>
                      )}
                    </span>

                    {/* Description — double-click to edit */}
                    <span
                      className="min-w-0"
                      onDoubleClick={() => {
                        if (isHidden) return;
                        setEditingDescId(inv.id);
                        setEditingDescValue(description);
                      }}
                    >
                      {editingDescId === inv.id ? (
                        <Input
                          value={editingDescValue}
                          onChange={(e) => setEditingDescValue(e.target.value)}
                          onBlur={() => {
                            if (editingDescValue !== description) {
                              handleDescriptionSave(inv, editingDescValue);
                            }
                            setEditingDescId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            if (e.key === "Escape") setEditingDescId(null);
                          }}
                          className="h-6 text-xs px-1 py-0 border-primary/40"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={cn(
                              "truncate text-xs font-normal text-foreground",
                              isHidden && "line-through",
                            )}
                            title={description}
                          >
                            {description || "—"}
                          </span>
                        </div>
                      )}
                    </span>

                    {/* Asset Type — tinted pill */}
                    <span className="min-w-0">
                      {asset ? (
                        <span
                          className="flex items-center gap-1 rounded-full px-2.5 py-[4px] w-fit max-w-full"
                          style={{ backgroundColor: `hsl(var(--${assetColorVar}) / 0.13)` }}
                        >
                          <span
                            className="w-[6px] h-[6px] rounded-full shrink-0"
                            style={{ backgroundColor: `hsl(var(--${assetColorVar}))` }}
                          />
                          <span
                            className="text-[11px] font-semibold truncate"
                            style={{ color: `hsl(var(--${assetColorVar}))` }}
                          >
                            {asset}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </span>

                    {/* Actions — kebab menu */}
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
                            onClick={() => setEditingInv(inv)}
                            className="gap-2 text-[13px]"
                          >
                            <Pencil className="w-4 h-4" />
                            {t("imports.editTransaction")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleToggleHidden(inv)}
                            className="gap-2 text-[13px]"
                          >
                            {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            {isHidden ? t("imports.showEntry") : t("imports.hideEntry")}
                          </DropdownMenuItem>
                          {isEdited && originalSnapshot && (
                            <DropdownMenuItem
                              onClick={() => {
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
                              className="gap-2 text-[13px]"
                            >
                              <RotateCcw className="w-4 h-4" />
                              {t("imports.revertToOriginal")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              navigator.clipboard.writeText(description);
                              sonnerToast("Copied");
                            }}
                            className="gap-2 text-[13px]"
                          >
                            <Copy className="w-4 h-4" />
                            {t("imports.copyDescription")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              navigator.clipboard.writeText(formatCurrency(inv.amount, undefined, true));
                              sonnerToast("Copied");
                            }}
                            className="gap-2 text-[13px]"
                          >
                            <Copy className="w-4 h-4" />
                            {t("imports.copyAmount")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Phones: day-grouped cards with tap → drawer */}
          <div className="md:hidden">
            {dayGroups.map((group) => (
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
                  {group.rows.map((inv) => {
                    const isSaving = savingIds.has(inv.id);
                    const isSaved = savedIds.has(inv.id);
                    const isHidden = inv.is_hidden;
                    const invHistory = auditByInv[inv.id] || [];
                    const editEntries = invHistory.filter((h) => h.action !== "revert");
                    const hasEditHistory = editEntries.length > 0;
                    const snapshot = hasEditHistory ? buildOriginalSnapshot(invHistory) : null;
                    const isEdited =
                      hasEditHistory &&
                      !(snapshot && isBackToOriginal(inv as unknown as Record<string, unknown>, snapshot.values));
                    const type = inv.type || "deposit";
                    const meta = getTypeMeta(type);
                    const TypeIcon = meta.icon;

                    return (
                      <div
                        key={inv.id}
                        className={cn(
                          "relative flex items-center gap-2.5 px-3 py-2.5 bg-card select-none",
                          isEdited && "bg-primary/[0.04] border-l-2 border-l-primary/60",
                          isHidden && "opacity-60 bg-muted/20",
                          isSaved && "bg-success/5",
                        )}
                        onClick={() => setEditingInv(inv)}
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                            TYPE_ICON_BG[meta.tone] ?? TYPE_ICON_BG.neutral,
                          )}
                        >
                          <TypeIcon className="h-3.5 w-3.5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-[13px] text-foreground", isHidden && "line-through")}>
                            <span className="font-medium">{inv.description || "—"}</span>
                            {inv.platform && (
                              <>
                                <span className="text-muted-foreground/50 mx-1">&middot;</span>
                                <span className="text-[12px] text-muted-foreground">{inv.platform}</span>
                              </>
                            )}
                          </p>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            {inv.asset_type && (
                              <span className="truncate text-[11px] text-muted-foreground">
                                {inv.asset_type}
                              </span>
                            )}
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
                            <span className={cn("text-[13px] font-semibold tabular-nums", type === "deposit" ? "text-success" : type === "withdrawal" ? "text-destructive" : "text-foreground")}>
                              {formatCurrency(type === "deposit" ? inv.amount : -inv.amount, undefined, true)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Live processing panel */}
          {pendingFiles && pendingFiles.length > 0 && (
            <div className="bg-card px-6 py-6 flex items-start justify-center border-t border-border">
              <div className="w-full max-w-xl">
                <ProcessingPanel files={pendingFiles} />
              </div>
            </div>
          )}
        </div>

        <InvestmentEditDrawer
          inv={editingInv}
          open={!!editingInv}
          onOpenChange={(open) => { if (!open) setEditingInv(null); }}
          formatCurrency={formatCurrency}
          knownPlatforms={knownPlatforms}
          onSave={(inv, edits) => {
            commitRow(inv, edits);
            setEditingInv(null);
          }}
        />
        </>
      )}
    </div>
  );
}
