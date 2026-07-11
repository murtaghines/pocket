import { TrendingUp, TrendingDown, Coins, Minus, Plus } from "lucide-react";
import type { PillTone } from "@/components/ui/pill-badge";

/** Investment record as returned by the DB. */
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
