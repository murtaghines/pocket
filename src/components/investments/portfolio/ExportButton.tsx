import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { Holding } from "@/hooks/useHoldings";
import type { InvestmentTransaction } from "@/hooks/useInvestmentTransactions";
import { useInvestmentTransactions } from "@/hooks/useInvestmentTransactions";

interface ExportButtonProps {
  holdings: Holding[];
}

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
  const header = [
    "Asset Name",
    "Ticker",
    "Asset Class",
    "Currency",
    "Quantity",
    "Avg Cost/Unit",
    "Cost Basis",
    "Current Price",
    "Current Value",
    "Unrealized P&L",
    "P&L %",
    "Notes",
  ];

  const rows = holdings.map((h) => [
    h.asset_name,
    h.ticker ?? "",
    h.asset_class,
    h.currency,
    String(h.quantity),
    String(h.avg_cost_per_unit),
    String(h.cost_basis),
    h.current_price != null ? String(h.current_price) : "",
    String(h.current_value),
    String(h.unrealized_pnl),
    h.cost_basis > 0
      ? ((h.unrealized_pnl / h.cost_basis) * 100).toFixed(2) + "%"
      : "",
    h.notes ?? "",
  ]);

  return [header, ...rows];
}

function transactionsToCSV(txs: InvestmentTransaction[]): string[][] {
  const header = [
    "Date",
    "Type",
    "Asset Name",
    "Ticker",
    "Quantity",
    "Price/Unit",
    "Total Amount",
    "Fee",
    "Realized P&L",
    "Currency",
    "Notes",
  ];

  const rows = txs.map((tx) => [
    tx.date.split("T")[0],
    tx.type.toUpperCase(),
    tx.asset_name ?? "",
    tx.ticker ?? "",
    String(tx.quantity),
    String(tx.price_per_unit),
    String(tx.total_amount),
    String(tx.fee),
    tx.realized_pnl != null ? String(tx.realized_pnl) : "",
    tx.currency,
    tx.notes ?? "",
  ]);

  return [header, ...rows];
}

export function ExportButton({ holdings }: ExportButtonProps) {
  const { t } = useTranslation("investments");
  const { transactions } = useInvestmentTransactions();

  const today = new Date().toISOString().split("T")[0];

  const exportHoldings = () => {
    if (holdings.length === 0) {
      toast.error(t("export.noData"));
      return;
    }
    downloadCSV(`pocket-holdings-${today}.csv`, holdingsToCSV(holdings));
    toast.success(t("export.exported"));
  };

  const exportTransactions = () => {
    if (transactions.length === 0) {
      toast.error(t("export.noData"));
      return;
    }
    downloadCSV(
      `pocket-transactions-${today}.csv`,
      transactionsToCSV(transactions)
    );
    toast.success(t("export.exported"));
  };

  const exportAll = () => {
    if (holdings.length === 0 && transactions.length === 0) {
      toast.error(t("export.noData"));
      return;
    }
    if (holdings.length > 0) {
      downloadCSV(`pocket-holdings-${today}.csv`, holdingsToCSV(holdings));
    }
    if (transactions.length > 0) {
      downloadCSV(
        `pocket-transactions-${today}.csv`,
        transactionsToCSV(transactions)
      );
    }
    toast.success(t("export.exported"));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <Download className="w-3.5 h-3.5" />
          {t("export.button")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportHoldings}>
          {t("export.holdings")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportTransactions}>
          {t("export.transactions")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAll}>
          {t("export.all")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
