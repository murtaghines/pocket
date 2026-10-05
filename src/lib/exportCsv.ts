import type { MonthTransaction } from "@/components/imports/cashflow/types";
import { getMovementLabel, getCategoryLabel } from "@/lib/categoryTranslations";
import { getAccountDisplayName } from "@/lib/accountColors";
import { applySplit } from "@/lib/splitAmount";
import type { Account } from "@/hooks/useAccounts";

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportTransactionsCsv(
  transactions: MonthTransaction[],
  formatCurrency: (n: number) => string,
  accounts: Account[],
  filename: string,
) {
  const headers = ["Date", "Account", "Description", "Movement", "Category", "Amount"];
  const rows = transactions.map((tx) => {
    const acct = accounts.find((a) => a.id === tx.account_id);
    const acctName = acct ? getAccountDisplayName(acct) : "";
    const desc = (tx.original_description || tx.description || "").trim();
    const splitAmount = applySplit(tx.amount, tx.account_id, accounts);
    return [
      tx.date,
      escapeCsvField(acctName),
      escapeCsvField(desc),
      getMovementLabel((tx.movement || "EXPENSE") as "INCOME" | "EXPENSE" | "TRANSFER"),
      getCategoryLabel(tx.category || "other_expense"),
      formatCurrency(splitAmount),
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pocket-${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
