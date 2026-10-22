import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccounts } from "@/hooks/useAccounts";
import { useImports, type Import } from "@/hooks/useImports";
import { useLocalization } from "@/hooks/useLocalization";
import { getAccountDisplayName } from "@/lib/accountColors";
import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import { FileDetailPanel } from "@/components/account/FileDetailPanel";
import { getFileKind } from "@/components/account/fileBits";

type RoleTab = "bank" | "investment";

export function FilesWorkspace() {
  const { t } = useTranslation("account");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { formatDate } = useLocalization();
  const { accounts } = useAccounts();
  const { imports, isLoading, deleteImport, isDeleting } = useImports();

  const accountFilter = searchParams.get("account");
  const initialFile = imports.find((i) => i.id === searchParams.get("file"));
  const filterAccount = accounts.find((a) => a.id === accountFilter);
  const [role, setRole] = useState<RoleTab>(
    initialFile ? (initialFile.domain === "INVESTING" ? "investment" : "bank")
      : filterAccount?.account_role === "INVESTMENT" ? "investment" : "bank",
  );
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("file"));

  const inRole = useMemo(
    () => imports.filter((i) => (i.domain === "INVESTING") === (role === "investment")),
    [imports, role],
  );
  const visible = useMemo(
    () => inRole.filter((i) => !accountFilter || i.account_id === accountFilter).sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at)),
    [inRole, accountFilter],
  );
  const counts = useMemo(() => ({
    bank: imports.filter((i) => i.domain !== "INVESTING").length,
    investment: imports.filter((i) => i.domain === "INVESTING").length,
  }), [imports]);
  const accountsWithFiles = new Set(imports.map((i) => i.account_id).filter(Boolean)).size;

  const selected: Import | null = visible.find((i) => i.id === selectedId) ?? visible[0] ?? null;

  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v); else next.delete(k);
    }
    setSearchParams(next, { replace: true });
  };

  const select = (id: string | null) => { setSelectedId(id); updateParams({ file: id }); };
  const switchRole = (next: RoleTab) => { setRole(next); setSelectedId(null); updateParams({ file: null, account: null }); };

  const accountName = (id: string | null) => {
    const a = accounts.find((x) => x.id === id);
    return a ? getAccountDisplayName(a) : t("files.unassigned", "Unassigned");
  };

  const left = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] bg-card px-2.5 pb-2.5 pt-3.5 shadow-bento">
      <div className="flex items-center gap-2 px-2.5 pb-2 pt-1">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted-foreground/70">{t("files.title", "Files")}</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums text-muted-foreground">{visible.length}</span>
        {filterAccount && (
          <button
            type="button"
            onClick={() => updateParams({ account: null })}
            className="ml-auto flex max-w-[160px] items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
            title={t("files.clearFilter", "Show all accounts")}
          >
            <span className="truncate">{getAccountDisplayName(filterAccount)}</span>
            <X className="h-3 w-3 shrink-0" />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-[48px] animate-pulse rounded-[10px] bg-muted" />)}
          </div>
        ) : visible.length === 0 ? (
          <p className="px-2.5 py-6 text-center text-sm text-muted-foreground">{t("files.empty", "No files uploaded yet.")}</p>
        ) : (
          visible.map((f) => {
            const { Icon, label } = getFileKind(f);
            const active = f.id === selected?.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => select(f.id)}
                className={cn(
                  "flex w-full items-center gap-[11px] rounded-[10px] px-2.5 py-[9px] text-left transition-colors",
                  active ? "bg-primary/[0.08]" : "hover:bg-muted/60",
                )}
              >
                <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] bg-primary/[0.12] text-primary">
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cn("truncate text-[13.5px]", active ? "font-semibold text-primary" : "font-medium text-foreground")} title={f.file_name}>{f.file_name}</div>
                  <div className="truncate text-[11.5px] text-muted-foreground">{accountName(f.account_id)} · {formatDate(f.uploaded_at)}</div>
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold", f.status === "FAILED" ? "bg-destructive/10 text-destructive" : f.status === "NORMALIZED" ? "bg-muted text-muted-foreground" : "bg-warning/20 text-warning-foreground")}>
                  {label}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const right = selected ? (
    <FileDetailPanel key={selected.id} file={selected} onDelete={(id) => deleteImport(id)} isDeleting={isDeleting} />
  ) : (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 rounded-[14px] bg-card p-8 text-center shadow-bento">
      <FileText className="h-10 w-10 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{t("files.empty", "No files uploaded yet.")}</p>
    </div>
  );

  return (
    <WorkspaceShell
      title={t("files.title", "Files")}
      subtitle={t("files.subtitle", { files: imports.length, accounts: accountsWithFiles, defaultValue: "{{files}} files · {{accounts}} accounts" })}
      action={{ label: t("files.upload", "Upload files"), onClick: () => navigate(role === "investment" ? "/my-data?tab=investments" : "/my-data") }}
      selector={{
        value: role,
        onChange: switchRole,
        options: [
          { value: "bank", label: t("workspace.bank", "Bank"), count: counts.bank },
          { value: "investment", label: t("workspace.investment", "Investment"), count: counts.investment },
        ],
      }}
      left={left}
      right={right}
    />
  );
}
