import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccounts } from "@/hooks/useAccounts";
import { useImports, type Import } from "@/hooks/useImports";
import { useImportLastEdits, importTitle } from "@/hooks/useImportFile";
import { useLocalization } from "@/hooks/useLocalization";
import { getAccountDisplayName } from "@/lib/accountColors";
import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import { FileDetailPanel } from "@/components/account/FileDetailPanel";
import { getFileKind, FileTypeIcon } from "@/components/account/fileBits";

type RoleTab = "bank" | "investment";

function FileRow({ f, active, onSelect, accountName, lastEdited }: {
  f: Import;
  active: boolean;
  onSelect: () => void;
  accountName: string;
  lastEdited: string | null;
}) {
  const { t } = useTranslation("account");
  const { formatDate } = useLocalization();
  const { label } = getFileKind(f);
  const title = importTitle(f);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-[11px] rounded-[10px] px-2.5 py-[9px] text-left transition-colors",
        active ? "bg-primary/[0.08]" : "hover:bg-muted/60",
        f.archived && "opacity-60",
      )}
    >
      <FileTypeIcon label={label} width={26} className="mx-0.5" />
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-[13.5px]", active ? "font-semibold text-primary" : "font-medium text-foreground")} title={title}>{title}</div>
        <div className="truncate text-[11.5px] text-muted-foreground">
          {accountName} · {formatDate(f.uploaded_at)}
          {lastEdited && <> · {t("files.editedOn", { date: formatDate(lastEdited), defaultValue: "edited {{date}}" })}</>}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-[11.5px] font-medium tabular-nums text-muted-foreground">
          {f.transactions_count ?? 0} {t("files.txShort", "tx")}
        </span>
        {f.status !== "NORMALIZED" && (
          <span className={cn("rounded-full px-1.5 py-px text-[10px] font-semibold", f.status === "FAILED" ? "bg-destructive/10 text-destructive" : "bg-warning/20 text-warning-foreground")}>
            {t(`files.status.${f.status === "FAILED" ? "failed" : f.status === "PARTIAL" ? "partial" : f.status === "PARSED" ? "processing" : "uploading"}`)}
          </span>
        )}
      </div>
    </button>
  );
}

export function FilesWorkspace() {
  const { t } = useTranslation("account");
  const [searchParams, setSearchParams] = useSearchParams();
  const { accounts } = useAccounts();
  const { imports, isLoading, deleteImport, isDeleting } = useImports();
  const { data: lastEdits } = useImportLastEdits();
  const [showArchived, setShowArchived] = useState(false);

  const accountFilter = searchParams.get("account");
  const initialFile = imports.find((i) => i.id === searchParams.get("file"));
  const filterAccount = accounts.find((a) => a.id === accountFilter);
  const [role, setRole] = useState<RoleTab>(
    initialFile ? (initialFile.domain === "INVESTING" ? "investment" : "bank")
      : filterAccount?.account_role === "INVESTMENT" ? "investment" : "bank",
  );
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("file"));

  const inRole = useMemo(
    () => imports.filter((i) => (i.domain === "INVESTING") === (role === "investment") && (!accountFilter || i.account_id === accountFilter)),
    [imports, role, accountFilter],
  );
  const byUpload = (a: Import, b: Import) => b.uploaded_at.localeCompare(a.uploaded_at);
  const active = useMemo(() => inRole.filter((i) => !i.archived).sort(byUpload), [inRole]);
  const archived = useMemo(() => inRole.filter((i) => i.archived).sort(byUpload), [inRole]);

  const counts = useMemo(() => ({
    bank: imports.filter((i) => i.domain !== "INVESTING" && !i.archived).length,
    investment: imports.filter((i) => i.domain === "INVESTING" && !i.archived).length,
  }), [imports]);
  const accountsWithFiles = new Set(imports.filter((i) => !i.archived).map((i) => i.account_id).filter(Boolean)).size;

  const selected: Import | null = inRole.find((i) => i.id === selectedId) ?? active[0] ?? archived[0] ?? null;
  if (selected?.archived && !showArchived) setShowArchived(true);

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

  const rowProps = (f: Import) => ({
    f,
    active: f.id === selected?.id,
    onSelect: () => select(f.id),
    accountName: accountName(f.account_id),
    lastEdited: lastEdits?.get(f.id) ?? null,
  });

  const left = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] bg-card px-2.5 pb-2.5 pt-3.5 shadow-bento">
      <div className="flex items-center gap-2 px-2.5 pb-2 pt-1">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted-foreground/70">{t("files.title", "Files")}</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums text-muted-foreground">{active.length}</span>
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
        ) : active.length === 0 && archived.length === 0 ? (
          <p className="px-2.5 py-6 text-center text-sm text-muted-foreground">{t("files.empty", "No files uploaded yet.")}</p>
        ) : (
          <>
            {active.map((f) => <FileRow key={f.id} {...rowProps(f)} />)}
            {archived.length > 0 && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowArchived((v) => !v)}
                  className="flex w-full items-center gap-2 px-2.5 pb-2 pt-1 text-left"
                  aria-expanded={showArchived}
                >
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted-foreground/70">{t("files.archivedSection", "Archived")}</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums text-muted-foreground">{archived.length}</span>
                </button>
                {showArchived && archived.map((f) => <FileRow key={f.id} {...rowProps(f)} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  const right = selected ? (
    <FileDetailPanel key={selected.id} file={selected} onDelete={(id) => { deleteImport(id); select(null); }} isDeleting={isDeleting} />
  ) : (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 rounded-[14px] bg-card p-8 text-center shadow-bento">
      <FileText className="h-10 w-10 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{t("files.empty", "No files uploaded yet.")}</p>
    </div>
  );

  return (
    <WorkspaceShell
      title={t("files.title", "Files")}
      subtitle={t("files.subtitle", { files: active.length, accounts: accountsWithFiles, defaultValue: "{{files}} files · {{accounts}} accounts" })}
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
