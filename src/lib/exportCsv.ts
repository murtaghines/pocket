import type { MonthTransaction } from "@/components/imports/cashflow/types";
import { getMovementLabel, getCategoryLabel } from "@/lib/categoryTranslations";
import { getAccountDisplayName } from "@/lib/accountColors";

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportTransactionsCsv(
  transactions: MonthTransaction[],
  formatCurrency: (n: number) => string,
  accounts: { id: string; name: string; nickname?: string | null }[],
  monthLabel: string,
) {
  const headers = ["Date", "Account", "Description", "Movement", "Category", "Amount"];
  const rows = transactions.map((tx) => {
    const acct = accounts.find((a) => a.id === tx.account_id);
    const acctName = acct ? getAccountDisplayName(acct as any) : "";
    const desc = (tx.description_norm || tx.description)
      .replace(/^value\s+date:\s*\d{1,2}\s+\w{3,4}\s+\d{4}\s*/i, "")
      .trim();
    return [
      tx.date,
      escapeCsvField(acctName),
      escapeCsvField(desc),
      getMovementLabel((tx.movement || "EXPENSE") as any),
      getCategoryLabel(tx.category || "other_expense"),
      formatCurrency(tx.amount),
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pocket-transactions-${monthLabel.replace(/\s+/g, "-").toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
