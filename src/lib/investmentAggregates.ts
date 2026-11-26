import type { InvestmentTransaction } from "@/hooks/useInvestmentTransactions";

export interface AccountBreakdown {
  accountId: string;
  accountName: string;
  buys: number;
  sells: number;
  dividends: number;
  fees: number;
  net: number;
}

export interface AssetBreakdown {
  key: string;
  label: string;
  buys: number;
  sells: number;
  net: number;
  txCount: number;
}

export interface MonthlyActivityEntry {
  month: string;
  buys: number;
  sells: number;
  dividends: number;
  fees: number;
  net: number;
  cumulative: number;
}

interface AccountLike {
  id: string;
  institution: string;
  name: string;
}

export function computeByAccount(
  txs: InvestmentTransaction[],
  accounts: AccountLike[],
): AccountBreakdown[] {
  const map = new Map<string, AccountBreakdown>();
  const nameOf = (id: string) => {
    const a = accounts.find((a) => a.id === id);
    return a ? (a.name ? `${a.institution} · ${a.name}` : a.institution) : "Unknown";
  };

  for (const tx of txs) {
    const aid = tx.account_id ?? "none";
    let entry = map.get(aid);
    if (!entry) {
      entry = { accountId: aid, accountName: nameOf(aid), buys: 0, sells: 0, dividends: 0, fees: 0, net: 0 };
      map.set(aid, entry);
    }
    const amt = Math.abs(tx.total_amount);
    switch (tx.type) {
      case "buy": entry.buys += amt; entry.net += amt; break;
      case "sell": entry.sells += amt; entry.net -= amt; break;
      case "dividend": entry.dividends += amt; break;
      case "fee": entry.fees += amt; break;
    }
  }

  return Array.from(map.values()).sort((a, b) => b.net - a.net);
}

export function computeByAsset(txs: InvestmentTransaction[]): AssetBreakdown[] {
  const map = new Map<string, AssetBreakdown>();

  for (const tx of txs) {
    if (tx.type !== "buy" && tx.type !== "sell") continue;
    const key = tx.ticker ?? tx.asset_name ?? "Other";
    let entry = map.get(key);
    if (!entry) {
      entry = { key, label: tx.ticker ?? tx.asset_name ?? "Other", buys: 0, sells: 0, net: 0, txCount: 0 };
      map.set(key, entry);
    }
    const amt = Math.abs(tx.total_amount);
    if (tx.type === "buy") { entry.buys += amt; entry.net += amt; }
    else { entry.sells += amt; entry.net -= amt; }
    entry.txCount++;
  }

  return Array.from(map.values()).sort((a, b) => b.net - a.net);
}

export function computeMonthlyHistory(txs: InvestmentTransaction[]): MonthlyActivityEntry[] {
  const map = new Map<string, Omit<MonthlyActivityEntry, "cumulative">>();

  for (const tx of txs) {
    const month = tx.date.slice(0, 7);
    let entry = map.get(month);
    if (!entry) {
      entry = { month, buys: 0, sells: 0, dividends: 0, fees: 0, net: 0 };
      map.set(month, entry);
    }
    const amt = Math.abs(tx.total_amount);
    switch (tx.type) {
      case "buy": entry.buys += amt; entry.net += amt; break;
      case "sell": entry.sells += amt; entry.net -= amt; break;
      case "dividend": entry.dividends += amt; break;
      case "fee": entry.fees += amt; break;
    }
  }

  const sorted = Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  let cumulative = 0;
  return sorted.map((e) => {
    cumulative += e.net;
    return { ...e, cumulative };
  });
}
