import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Import } from "./useImports";

/** Moves an import (and all of its transactions) to another account, dropping rows that would
 *  collide with ones already in the destination (same fingerprint). */
export function useReassignImport() {
  const queryClient = useQueryClient();

  return useCallback(async (importId: string, newAccountId: string) => {
    const check = (error: { message: string } | null) => { if (error) throw new Error(error.message); };

    // Drop rows that already exist in the destination (the unique index is per account), then
    // move the transactions, and only then re-point the import, so a failure can't leave an import
    // on one account with its transactions on another.
    const [src, dst] = await Promise.all([
      supabase.from("transactions").select("id, fingerprint, domain").eq("import_id", importId).not("fingerprint", "is", null),
      supabase.from("transactions").select("fingerprint, domain").eq("account_id", newAccountId).not("fingerprint", "is", null),
    ]);
    check(src.error);
    check(dst.error);
    const dstKeys = new Set((dst.data ?? []).map((t) => `${t.domain}|${t.fingerprint}`));
    const conflictIds = (src.data ?? []).filter((t) => dstKeys.has(`${t.domain}|${t.fingerprint}`)).map((t) => t.id);
    if (conflictIds.length > 0) check((await supabase.from("transactions").delete().in("id", conflictIds)).error);

    check((await supabase.from("transactions").update({ account_id: newAccountId }).eq("import_id", importId)).error);
    check((await supabase.from("imports").update({ account_id: newAccountId }).eq("id", importId)).error);

    try { await supabase.rpc("refresh_dashboard_views"); } catch { /* best-effort */ }
    for (const key of [
      "imports", "transactions", "band-total-balance", "month-transactions-inline", "dashboard-period-series",
      "dashboard-opening-balances", "dashboard-aggregates", "account-period-summary", "import-preview", "account-detail",
    ]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, [queryClient]);
}

/** The original file lives in storage; older rows hold a public URL, newer ones just a path. */
export async function getImportDownloadUrl(imp: Pick<Import, "file_storage_url">): Promise<string | null> {
  const ref = imp.file_storage_url;
  if (!ref) return null;
  if (/^https?:\/\//i.test(ref)) return ref;
  const { data, error } = await supabase.storage.from("financial-files").createSignedUrl(ref, 60);
  return error ? null : data.signedUrl;
}

export interface PreviewRow {
  key: string;
  date: string | null;
  description: string;
  amount: number | null;
  extra: string | null;
}

export interface ImportPreview {
  /** "extracted" = the rows the extractor read from the file; "imported" = reconstructed from the
   *  saved transactions' original bank text (CSV/Excel uploads don't keep a raw copy). */
  source: "extracted" | "imported";
  total: number;
  rows: PreviewRow[];
  firstDate: string | null;
  lastDate: string | null;
  lastModified: string | null;
}

const PREVIEW_LIMIT = 200;
const IN_CHUNK = 100;

async function lastModifiedFor(userId: string, transactionIds: string[]): Promise<string | null> {
  let latest: string | null = null;
  for (let i = 0; i < transactionIds.length; i += IN_CHUNK) {
    const { data } = await supabase
      .from("audit_log")
      .select("created_at")
      .eq("user_id", userId)
      .eq("entity_type", "transaction")
      .in("entity_id", transactionIds.slice(i, i + IN_CHUNK))
      .order("created_at", { ascending: false })
      .limit(1);
    const candidate = data?.[0]?.created_at ?? null;
    if (candidate && (!latest || candidate > latest)) latest = candidate;
  }
  return latest;
}

async function loadCashPreview(imp: Import, userId: string): Promise<ImportPreview> {
  const [rawRes, txRes, firstRes, lastRes, idsRes] = await Promise.all([
    supabase.from("import_rows").select("row_index, raw_json", { count: "exact" })
      .eq("import_id", imp.id).order("row_index").limit(PREVIEW_LIMIT),
    supabase.from("transactions").select("id, date, original_description, description, amount, amount_original, running_balance", { count: "exact" })
      .eq("import_id", imp.id).order("date", { ascending: false }).limit(PREVIEW_LIMIT),
    supabase.from("transactions").select("date").eq("import_id", imp.id).order("date", { ascending: true }).limit(1),
    supabase.from("transactions").select("date").eq("import_id", imp.id).order("date", { ascending: false }).limit(1),
    supabase.from("transactions").select("id").eq("import_id", imp.id),
  ]);

  const meta = {
    firstDate: firstRes.data?.[0]?.date ?? null,
    lastDate: lastRes.data?.[0]?.date ?? null,
    lastModified: await lastModifiedFor(userId, (idsRes.data ?? []).map((r) => r.id)),
  };

  if ((rawRes.data?.length ?? 0) > 0) {
    return {
      source: "extracted",
      total: rawRes.count ?? rawRes.data!.length,
      rows: rawRes.data!.map((r) => {
        const raw = (r.raw_json ?? {}) as Record<string, unknown>;
        return {
          key: `raw-${r.row_index}`,
          date: (raw.posted_date as string) ?? null,
          description: String(raw.description_raw ?? raw.description_clean ?? ""),
          amount: raw.amount_signed != null ? Number(raw.amount_signed) : null,
          extra: raw.running_balance != null ? String(raw.running_balance) : null,
        };
      }),
      ...meta,
    };
  }

  return {
    source: "imported",
    total: txRes.count ?? 0,
    rows: (txRes.data ?? []).map((t) => ({
      key: t.id,
      date: t.date,
      description: t.original_description || t.description,
      amount: Number(t.amount_original ?? t.amount),
      extra: t.running_balance != null ? String(t.running_balance) : null,
    })),
    ...meta,
  };
}

async function loadInvestmentPreview(imp: Import): Promise<ImportPreview> {
  const [res, firstRes, lastRes] = await Promise.all([
    supabase.from("investments").select("id, date, description, original_text, amount, type", { count: "exact" })
      .eq("upload_id", imp.id).order("date", { ascending: false }).limit(PREVIEW_LIMIT),
    supabase.from("investments").select("date").eq("upload_id", imp.id).order("date", { ascending: true }).limit(1),
    supabase.from("investments").select("date").eq("upload_id", imp.id).order("date", { ascending: false }).limit(1),
  ]);
  return {
    source: "extracted",
    total: res.count ?? 0,
    rows: (res.data ?? []).map((r) => ({
      key: r.id,
      date: r.date,
      description: r.original_text || r.description,
      amount: Number(r.amount),
      extra: r.type,
    })),
    firstDate: firstRes.data?.[0]?.date ?? null,
    lastDate: lastRes.data?.[0]?.date ?? null,
    lastModified: null,
  };
}

export function useImportPreview(imp: Import | null) {
  const { user } = useAuth();
  return useQuery<ImportPreview>({
    queryKey: ["import-preview", imp?.id, imp?.account_id],
    enabled: !!user?.id && !!imp,
    staleTime: 30_000,
    queryFn: () => (imp!.domain === "INVESTING" ? loadInvestmentPreview(imp!) : loadCashPreview(imp!, user!.id)),
  });
}
