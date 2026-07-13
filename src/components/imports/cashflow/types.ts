import type { Database } from "@/integrations/supabase/types";

export type MovementType = Database["public"]["Enums"]["movement_type"];

/** Shape of a buffered (unsaved) edit on a single transaction row.
 *  Lives at the top of the tab view so pending changes survive when
 *  the user switches month tabs or hides this view. */
export type PendingEditShape = {
  movement?: MovementType;
  category?: string;
  category_id?: string | null;
  amount?: number;
};

export interface MonthTransaction {
  id: string;
  date: string;
  description: string;
  description_norm: string | null;
  amount: number;
  movement: MovementType | null;
  category: string;
  category_id: string | null;
  account_id: string | null;
  is_hidden: boolean;
  import_id: string | null;
  transfer_pair_id: string | null;
}

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

/** Mirror of the PendingFile shape exposed by useMonthlyFileUpload — kept
 *  local so we don't have to export the type from the hook. */
export interface PendingFileInfo {
  id: string;
  name: string;
  size: number;
  status: "pending" | "processing" | "completed" | "error";
  error?: string;
  transactionsCount?: number;
  progressLabel?: string;
  progressPercent?: number;
  startedAt?: number;
}
