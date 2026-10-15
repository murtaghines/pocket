import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Download, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts, type Account } from "@/hooks/useAccounts";
import { useLocalization } from "@/hooks/useLocalization";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getAccountDisplayName } from "@/lib/accountColors";
import { exportTransactionsCsv } from "@/lib/exportCsv";
import type { MonthTransaction } from "./types";

type PeriodOption = "current" | "ytd" | "all";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMonthKey: string;
  currentMonthLabel: string;
}

export function ExportDialog({
  open,
  onOpenChange,
  currentMonthKey,
  currentMonthLabel,
}: ExportDialogProps) {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const { formatCurrency } = useLocalization();

  const cashAccounts = useMemo(
    () => accounts.filter((a) => a.account_role === "CASH"),
    [accounts],
  );

  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(
    () => new Set(cashAccounts.map((a) => a.id)),
  );
  const [period, setPeriod] = useState<PeriodOption>("current");
  const [isExporting, setIsExporting] = useState(false);

  const allSelected = selectedAccountIds.size === cashAccounts.length;

  const toggleAccount = (id: string) => {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelectedAccountIds(new Set());
    else setSelectedAccountIds(new Set(cashAccounts.map((a) => a.id)));
  };

  const dateRange = useMemo(() => {
    const [y, m] = currentMonthKey.split("-").map(Number);
    if (period === "current") {
      const start = `${y}-${String(m).padStart(2, "0")}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return { start, end };
    }
    if (period === "ytd") {
      const start = `${y}-01-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return { start, end };
    }
    return { start: "2000-01-01", end: "2099-12-31" };
  }, [currentMonthKey, period]);

  const periodLabel = useMemo(() => {
    if (period === "current") return currentMonthLabel;
    if (period === "ytd") {
      const y = currentMonthKey.split("-")[0];
      return `${y}`;
    }
    return t("time.allTime", "All time");
  }, [period, currentMonthLabel, currentMonthKey, t]);

  const { data: previewCount, isFetching } = useQuery({
    queryKey: ["export-preview-count", user?.id, dateRange.start, dateRange.end, [...selectedAccountIds].sort().join(",")],
    queryFn: async () => {
      if (!user?.id || selectedAccountIds.size === 0) return 0;
      const { count, error } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("domain", "CASHFLOW")
        .eq("is_hidden", false)
        .in("account_id", [...selectedAccountIds])
        .gte("date", dateRange.start)
        .lte("date", dateRange.end);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: open && !!user?.id && selectedAccountIds.size > 0,
  });

  const handleExport = async () => {
    if (!user?.id || selectedAccountIds.size === 0) return;
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, date, description, description_norm, original_description, amount, amount_original, movement, category, category_id, account_id, is_hidden, import_id, fingerprint, transfer_pair_id, user_notes")
        .eq("user_id", user.id)
        .eq("domain", "CASHFLOW")
        .eq("is_hidden", false)
        .in("account_id", [...selectedAccountIds])
        .gte("date", dateRange.start)
        .lte("date", dateRange.end)
        .order("date", { ascending: true })
        .order("amount", { ascending: false });
      if (error) throw error;

      const txs = (data ?? []) as MonthTransaction[];
      const filename = `transactions-${periodLabel.replace(/\s+/g, "-").toLowerCase()}`;
      exportTransactionsCsv(txs, formatCurrency, accounts, filename);
      onOpenChange(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>
            {t("export")}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground">
            {t("imports.exportDesc", "Choose the accounts and period to export.")}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {/* Period selection */}
          <div>
            <p className="text-[13px] font-medium text-muted-foreground mb-2">
              {t("imports.exportPeriod", "Period")}
            </p>
            <div className="flex rounded-xl bg-muted p-1 h-11">
              {([
                { key: "current" as const, label: currentMonthLabel },
                { key: "ytd" as const, label: currentMonthKey.split("-")[0] },
                { key: "all" as const, label: t("imports.exportAll", "All") },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPeriod(opt.key)}
                  className={cn(
                    "flex flex-1 items-center justify-center rounded-[9px] text-sm font-medium transition-all",
                    period === opt.key
                      ? "bg-card text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground/70"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Account selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] font-medium text-muted-foreground">
                {t("imports.account", "Account")}
              </p>
              <button
                type="button"
                onClick={toggleAll}
                className="text-[13px] text-primary font-medium hover:underline"
              >
                {allSelected
                  ? t("imports.deselectAll", "Deselect all")
                  : t("imports.selectAll", "Select all")}
              </button>
            </div>
            <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
              {cashAccounts.map((acct) => (
                <label
                  key={acct.id}
                  className="flex items-center gap-3 px-2 py-[7px] rounded-lg hover:bg-muted/40 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedAccountIds.has(acct.id)}
                    onCheckedChange={() => toggleAccount(acct.id)}
                  />
                  <span className="text-[13px] font-medium text-foreground truncate">
                    {getAccountDisplayName(acct)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="justify-between">
          <span className="text-[13px] text-muted-foreground tabular-nums">
            {isFetching
              ? "..."
              : t("imports.exportCount", "{{count}} transactions", { count: previewCount ?? 0 })}
          </span>
          <Button
            onClick={handleExport}
            disabled={isExporting || selectedAccountIds.size === 0 || previewCount === 0}
            className="h-12 rounded-[14px] px-6 text-[15px] font-semibold min-w-[140px]"
          >
            <Download className="w-4 h-4" />
            {isExporting
              ? t("imports.exporting", "Exporting...")
              : t("export")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
