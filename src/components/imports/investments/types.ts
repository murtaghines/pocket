import { TrendingUp, TrendingDown, Coins, Minus, Plus, ShoppingCart, Receipt } from "lucide-react";
import type { PillTone } from "@/components/ui/pill-badge";
import type { InvestmentTransaction } from "@/hooks/useInvestmentTransactions";

export type { InvestmentTransaction };

/** Investment record as returned by the DB (legacy table). */
export interface Investment {
  id: string;
  user_id: string;
  upload_id: string | null;
  date: string;
  amount: number;
  platform: string;
  asset_type: string | null;
  description: string;
  type: string;
  is_hidden: boolean;
  created_at: string;
  import_id?: string | null;
}

/** Buffered (unsaved) edit on a single investment row. */
export type PendingInvEdit = {
  type?: string;
  asset_type?: string | null;
  platform?: string;
  description?: string;
  amount?: number;
  date?: string;
  is_hidden?: boolean;
};

/** Buffered edit on an investment_transactions row. */
export type PendingInvTxEdit = {
  type?: string;
  ticker?: string | null;
  asset_name?: string | null;
  quantity?: number;
  price_per_unit?: number;
  fee?: number;
  currency?: string;
  date?: string;
  notes?: string | null;
};

/** Summary shape for the new investment_transactions editor. */
export interface InvestmentTxSummary {
  count: number;
  buys: number;
  sells: number;
  dividends: number;
  fees: number;
  net: number;
}

export const TX_TYPE_CONFIG = {
  buy: { label: "Buy", tone: "green" as PillTone, icon: ShoppingCart, dotColor: "hsl(var(--success))", textColor: "text-success" },
  sell: { label: "Sell", tone: "red" as PillTone, icon: TrendingDown, dotColor: "hsl(var(--destructive))", textColor: "text-destructive" },
  dividend: { label: "Dividend", tone: "amber" as PillTone, icon: Coins, dotColor: "hsl(260 60% 62%)", textColor: "text-[hsl(260_60%_62%)]" },
  fee: { label: "Fee", tone: "amber" as PillTone, icon: Receipt, dotColor: "hsl(var(--warning))", textColor: "text-warning" },
  deposit: { label: "Deposit", tone: "neutral" as PillTone, icon: Plus, dotColor: "hsl(var(--muted-foreground))", textColor: "text-muted-foreground" },
  withdrawal: { label: "Withdrawal", tone: "neutral" as PillTone, icon: Minus, dotColor: "hsl(var(--muted-foreground))", textColor: "text-muted-foreground" },
} as const;

export type TxType = keyof typeof TX_TYPE_CONFIG;

export const getTxTypeMeta = (t: string) => {
  const key = t.toLowerCase() as TxType;
  return TX_TYPE_CONFIG[key] || TX_TYPE_CONFIG.buy;
};

/** One audit_log row for an investment edit/revert, as read back for the history popover. */
export interface AuditEntry {
  id: string;
  entity_id: string;
  action: string;
  created_at: string;
  diff_json: {
    fields?: string[];
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  } | null;
}

/** Mirror of the PendingFile shape exposed by useMonthlyInvestmentUpload. */
export interface PendingFileInfo {
  id: string;
  name: string;
  size: number;
  status: "pending" | "processing" | "completed" | "error";
  error?: string;
  progressLabel?: string;
  progressPercent?: number;
}

export const INVESTMENT_TYPES = [
  { value: "deposit", label: "Deposit", tone: "green" as PillTone, icon: TrendingUp },
  { value: "withdrawal", label: "Withdrawal", tone: "red" as PillTone, icon: TrendingDown },
  { value: "dividend", label: "Dividend", tone: "amber" as PillTone, icon: Coins },
  { value: "fee", label: "Fee", tone: "neutral" as PillTone, icon: Minus },
  { value: "interest", label: "Interest", tone: "amber" as PillTone, icon: Plus },
] as const;

export const ASSET_TYPES = [
  "Stock",
  "ETF",
  "Bond",
  "Crypto",
  "Mutual Fund",
  "Index Fund",
  "Real Estate",
  "Commodity",
  "Cash",
  "Other",
] as const;

export const getTypeMeta = (t: string) => {
  const found = INVESTMENT_TYPES.find((x) => x.value === t.toLowerCase());
  return found || { value: t, label: t, tone: "neutral" as PillTone, icon: Coins };
};
