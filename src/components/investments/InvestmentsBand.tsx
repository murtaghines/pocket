import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown, Download, ArrowLeftRight, Layers } from "lucide-react";
import { useHoldings } from "@/hooks/useHoldings";
import { useLocalization } from "@/hooks/useLocalization";
import { useUserPreferences, type CostMethod } from "@/hooks/useUserPreferences";
import { useInvestmentTransactions } from "@/hooks/useInvestmentTransactions";
import { ExchangeRatesDialog } from "./portfolio/ExchangeRatesDialog";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Holding } from "@/hooks/useHoldings";
import type { InvestmentTransaction } from "@/hooks/useInvestmentTransactions";

function escapeCSV(val: string | number | null | undefined): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map(escapeCSV).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function holdingsToCSV(holdings: Holding[]): string[][] {
  const header = ["Asset Name", "Ticker", "Asset Class", "Currency", "Quantity", "Avg Cost/Unit", "Cost Basis", "Current Price", "Current Value", "Unrealized P&L", "P&L %", "Notes"];
  const rows = holdings.map((h) => [
    h.asset_name, h.ticker ?? "", h.asset_class, h.currency, String(h.quantity),
    String(h.avg_cost_per_unit), String(h.cost_basis),
    h.current_price != null ? String(h.current_price) : "", String(h.current_value),
    String(h.unrealized_pnl),
    h.cost_basis > 0 ? ((h.unrealized_pnl / h.cost_basis) * 100).toFixed(2) + "%" : "",
    h.notes ?? "",
  ]);
  return [header, ...rows];
}

function transactionsToCSV(txs: InvestmentTransaction[]): string[][] {
  const header = ["Date", "Type", "Asset Name", "Ticker", "Quantity", "Price/Unit", "Total Amount", "Fee", "Realized P&L", "Currency", "Notes"];
  const rows = txs.map((tx) => [
    tx.date.split("T")[0], tx.type.toUpperCase(), tx.asset_name ?? "", tx.ticker ?? "",
    String(tx.quantity), String(tx.price_per_unit), String(tx.total_amount), String(tx.fee),
    tx.realized_pnl != null ? String(tx.realized_pnl) : "", tx.currency, tx.notes ?? "",
  ]);
  return [header, ...rows];
}

export function InvestmentsBand() {
  const { t } = useTranslation("investments");
  const { formatCurrency } = useLocalization();
  const { holdings, summary, hasHoldings, isMultiCurrency, displayCurrency, pnlPercent } = useHoldings();
  const { preferences, updatePreferences } = useUserPreferences();
  const { transactions } = useInvestmentTransactions();
  const [ratesOpen, setRatesOpen] = useState(false);

  const costMethod: CostMethod = preferences.cost_method ?? "fifo";

  const [collapsed, setCollapsed] = useState(false);
  const bandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bandRef.current;
    if (!el) return;
    const scrollParent = el.closest("main") ?? window;
    const onScroll = () => {
      const scrollY = scrollParent === window
        ? window.scrollY
        : (scrollParent as HTMLElement).scrollTop;
      setCollapsed(scrollY > 40);
    };
    scrollParent.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollParent.removeEventListener("scroll", onScroll);
  }, []);

  if (!hasHoldings) return null;

  const isPositive = summary.totalPnl >= 0;
  const pnlFormatted = `${isPositive ? "+" : ""}${formatCurrency(summary.totalPnl, isMultiCurrency ? displayCurrency : undefined)}`;
  const pnlPctFormatted = `${isPositive ? "+" : ""}${pnlPercent.toFixed(1)}%`;
  const accountCount = Object.keys(summary.byAccount).length;

  const today = new Date().toISOString().split("T")[0];

  const exportHoldings = () => {
    if (holdings.length === 0) { toast.error(t("export.noData")); return; }
    downloadCSV(`pocket-holdings-${today}.csv`, holdingsToCSV(holdings));
    toast.success(t("export.exported"));
  };
  const exportTransactions = () => {
    if (transactions.length === 0) { toast.error(t("export.noData")); return; }
    downloadCSV(`pocket-transactions-${today}.csv`, transactionsToCSV(transactions));
    toast.success(t("export.exported"));
  };
  const exportAll = () => {
    if (holdings.length === 0 && transactions.length === 0) { toast.error(t("export.noData")); return; }
    if (holdings.length > 0) downloadCSV(`pocket-holdings-${today}.csv`, holdingsToCSV(holdings));
    if (transactions.length > 0) downloadCSV(`pocket-transactions-${today}.csv`, transactionsToCSV(transactions));
    toast.success(t("export.exported"));
  };

  return (
    <>
      <div
        ref={bandRef}
        className={cn(
          "hidden md:block px-[34px] sticky top-0 z-40 pt-[24px] transition-all duration-300 ease-in-out bg-primary",
          collapsed ? "pb-[10px]" : "pb-[78px]",
        )}
      >
        <div className="flex items-start justify-between">
          {/* Left: value + P&L */}
          <div className="min-w-0">
            <div className="flex items-center gap-[10px] h-[27px]">
              <span
                className={cn(
                  "font-sans text-[13px] font-medium whitespace-nowrap transition-colors duration-300",
                  collapsed ? "text-white/60" : "text-white/80",
                )}
              >
                {t("band.portfolioValue")}
              </span>

              <span
                className={cn(
                  "font-sans text-[13px] font-medium text-white/80 whitespace-nowrap transition-all duration-300 overflow-hidden",
                  collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[300px]",
                )}
              >
                {summary.holdingsCount > 0 &&
                  `· ${summary.holdingsCount} ${t("band.holdings")}${accountCount > 0 ? ` · ${accountCount} ${t("band.accounts")}` : ""}`}
              </span>

              {/* Inline value when collapsed */}
              <span
                className={cn(
                  "font-heading font-semibold text-[16px] text-white tabular-nums whitespace-nowrap transition-all duration-300 overflow-hidden",
                  collapsed ? "opacity-100 max-w-[300px]" : "opacity-0 max-w-0",
                )}
              >
                {formatCurrency(summary.totalValue, isMultiCurrency ? displayCurrency : undefined)}
              </span>

              {/* Inline P&L badge when collapsed */}
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-sans text-[12px] font-medium tabular-nums whitespace-nowrap transition-all duration-300 overflow-hidden",
                  collapsed ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0",
                  isPositive ? "text-white/90" : "text-white/90",
                )}
              >
                <span className={cn(
                  "inline-flex items-center gap-0.5 px-[7px] py-[1px] rounded-full text-[11px] font-semibold",
                  isPositive ? "bg-success/30 text-white" : "bg-destructive/30 text-white",
                )}>
                  {isPositive
                    ? <TrendingUp className="w-[11px] h-[11px]" />
                    : <TrendingDown className="w-[11px] h-[11px]" />
                  }
                  {pnlPctFormatted}
                </span>
              </span>
            </div>

            {/* Large value — collapses */}
            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                collapsed ? "max-h-0 opacity-0 mt-0" : "max-h-[34px] opacity-100 mt-[5px]",
              )}
            >
              <p className="font-heading font-semibold text-[26px] text-white leading-none tabular-nums whitespace-nowrap">
                {formatCurrency(summary.totalValue, isMultiCurrency ? displayCurrency : undefined)}
              </p>
            </div>

            {/* P&L line — collapses */}
            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                collapsed ? "max-h-0 opacity-0 mt-0" : "max-h-[22px] opacity-100 mt-[10px]",
              )}
            >
              <p className="font-sans text-[13.5px] text-white/80 flex items-center gap-2">
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-[1px] rounded-full text-[12px] font-semibold tabular-nums",
                  isPositive ? "bg-success/25 text-white" : "bg-destructive/25 text-white",
                )}>
                  {isPositive
                    ? <TrendingUp className="w-3 h-3" />
                    : <TrendingDown className="w-3 h-3" />
                  }
                  {pnlFormatted}
                </span>
                <span className="text-white/60 text-[12px]">
                  ({pnlPctFormatted})
                </span>
              </p>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-[8px] shrink-0">
            {/* Cost method selector */}
            <div className="flex items-center gap-1.5 bg-white/[0.16] rounded-[12px] px-[10px] py-[4px]">
              <Layers className="w-3.5 h-3.5 text-white/70" />
              <Select
                value={costMethod}
                onValueChange={(v) => updatePreferences({ cost_method: v as CostMethod })}
              >
                <SelectTrigger className="h-[28px] w-auto min-w-[70px] text-[13px] font-heading font-medium text-white bg-transparent border-0 shadow-none focus:ring-0 gap-1 px-0 [&>svg]:text-white/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fifo">{t("taxLots.fifo")}</SelectItem>
                  <SelectItem value="lifo">{t("taxLots.lifo")}</SelectItem>
                  <SelectItem value="average">{t("taxLots.average")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 bg-white/[0.16] rounded-[12px] px-[13px] h-[36px] font-heading text-[13px] font-medium text-white/85 hover:bg-white/[0.22] transition-colors"
                >
                  <Download className="w-[14px] h-[14px]" />
                  {t("export.button")}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportHoldings}>{t("export.holdings")}</DropdownMenuItem>
                <DropdownMenuItem onClick={exportTransactions}>{t("export.transactions")}</DropdownMenuItem>
                <DropdownMenuItem onClick={exportAll}>{t("export.all")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Exchange rates button (multi-currency only) */}
            {isMultiCurrency && (
              <button
                type="button"
                onClick={() => setRatesOpen(true)}
                className="flex items-center gap-1.5 bg-white/[0.16] rounded-[12px] px-[13px] h-[36px] font-heading text-[13px] font-medium text-white/85 hover:bg-white/[0.22] transition-colors"
              >
                <ArrowLeftRight className="w-[14px] h-[14px]" />
                {t("multicurrency.manageRates")}
              </button>
            )}
          </div>
        </div>
      </div>

      {ratesOpen && (
        <ExchangeRatesDialog open={ratesOpen} onOpenChange={setRatesOpen} />
      )}
    </>
  );
}
