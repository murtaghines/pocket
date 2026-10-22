import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccounts, type Account } from "@/hooks/useAccounts";
import { useImports } from "@/hooks/useImports";
import { getAccountDisplayName, getDefaultAccountColor } from "@/lib/accountColors";
import { getAccountTypeIcon, getAccountTypeI18nKey } from "@/lib/accountTypes";
import { AccountFormDialog, type AccountFormValues } from "@/components/settings/AccountFormDialog";
import { AccountDetailPanel } from "@/components/account/AccountDetailPanel";
import { AccountDeleteDialog } from "@/components/account/AccountDeleteDialog";

type RoleTab = "bank" | "investment";

const byCreated = (a: Account, b: Account) => a.created_at.localeCompare(b.created_at);

function SectionLabel({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <div className="flex items-center gap-2 px-2.5 pb-2 pt-1">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted-foreground/70">{children}</span>
      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums text-muted-foreground">{count}</span>
    </div>
  );
}

export function AccountsWorkspace() {
  const { t } = useTranslation("account");
  const [searchParams, setSearchParams] = useSearchParams();
  const { accounts, isLoading, createAccount, updateAccount, isCreating, isUpdating } = useAccounts();
  const { imports } = useImports();

  const initialId = searchParams.get("account");
  const initialRole: RoleTab = accounts.find((a) => a.id === initialId)?.account_role === "INVESTMENT" ? "investment" : "bank";
  const [role, setRole] = useState<RoleTab>(initialRole);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);

  const roleOf = (a: Account): RoleTab => (a.account_role === "INVESTMENT" ? "investment" : "bank");
  const inRole = useMemo(() => accounts.filter((a) => roleOf(a) === role), [accounts, role]);
  const active = useMemo(() => inRole.filter((a) => !a.archived).sort(byCreated), [inRole]);
  const archived = useMemo(() => inRole.filter((a) => a.archived).sort(byCreated), [inRole]);

  const counts = useMemo(() => ({
    bank: accounts.filter((a) => a.account_role !== "INVESTMENT" && !a.archived).length,
    investment: accounts.filter((a) => a.account_role === "INVESTMENT" && !a.archived).length,
  }), [accounts]);

  const filesByAccount = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of imports) if (i.account_id) map.set(i.account_id, (map.get(i.account_id) ?? 0) + 1);
    return map;
  }, [imports]);

  const selected = [...active, ...archived].find((a) => a.id === selectedId) ?? active[0] ?? archived[0] ?? null;

  const select = (id: string | null) => {
    setSelectedId(id);
    const next = new URLSearchParams(searchParams);
    if (id) next.set("account", id);
    else next.delete("account");
    setSearchParams(next, { replace: true });
  };

  const switchRole = (next: RoleTab) => {
    setRole(next);
    select(null);
  };

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (account: Account) => { setEditing(account); setFormOpen(true); };

  const handleSubmit = (values: AccountFormValues) => {
    if (editing) {
      updateAccount({
        id: editing.id,
        institution: values.institution,
        name: values.name || values.institution,
        color: values.color,
        account_type: values.account_type,
        currency_base: values.currency_base,
        account_number: values.account_number || null,
        initial_balance: values.initial_balance ?? 0,
        split_percentage: values.split_percentage ?? 100,
        notes: values.notes?.trim() || null,
        hidden_from_dashboard: values.hidden_from_dashboard ?? false,
      });
    } else {
      createAccount(
        {
          institution: values.institution,
          name: values.name,
          color: values.color,
          account_type: values.account_type,
          currency_base: values.currency_base,
          account_number: values.account_number,
          initial_balance: values.initial_balance,
          split_percentage: values.split_percentage,
          notes: values.notes,
          hidden_from_dashboard: values.hidden_from_dashboard,
        },
        { onSuccess: (created) => created?.id && select(created.id) },
      );
    }
    setFormOpen(false);
    setEditing(null);
  };

  const renderItem = (account: Account, idx: number) => {
    const color = account.color || getDefaultAccountColor(idx);
    const Icon = getAccountTypeIcon(account.account_type);
    const isActive = account.id === selected?.id;
    const files = filesByAccount.get(account.id) ?? 0;
    return (
      <button
        key={account.id}
        type="button"
        onClick={() => select(account.id)}
        className={cn(
          "flex w-full items-center gap-[11px] rounded-[10px] px-2.5 py-[9px] text-left transition-colors",
          isActive ? "bg-primary/[0.08]" : "hover:bg-muted/60",
          account.archived && "opacity-60",
        )}
      >
        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px]" style={{ backgroundColor: `${color}26`, color }}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn("truncate text-[13.5px]", isActive ? "font-semibold text-primary" : "font-medium text-foreground")}>
            {getAccountDisplayName(account)}
          </div>
          <div className="truncate text-[11.5px] text-muted-foreground">
            {t(getAccountTypeI18nKey(account.account_type))} · {account.currency_base}
          </div>
        </div>
        {account.is_primary ? (
          <span className="shrink-0 rounded-full bg-warning/20 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-warning-foreground">
            {t("accounts.primary", "Primary")}
          </span>
        ) : files > 0 ? (
          <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums" style={{ backgroundColor: `${color}1F`, color }}>
            {t("accounts.files", { count: files, defaultValue: "{{count}} files" })}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="flex flex-col bg-background md:h-full md:overflow-hidden">
      {/* Banner */}
      <div className="shrink-0 bg-primary px-3 pb-6 pt-4 md:h-[180px] md:px-[34px] md:pb-0 md:pt-[22px]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-heading text-[19px] font-semibold leading-none tracking-[-0.01em] text-white">
              {t("workspace.title", "Accounts")}
            </h1>
            <p className="mt-1.5 text-[12.5px] font-medium tabular-nums text-white/80">
              {t("workspace.subtitle", { bank: counts.bank, investment: counts.investment, defaultValue: "{{bank}} bank · {{investment}} investment" })}
            </p>
          </div>
          <div className="flex items-center gap-[8px] self-start">
          <div className="flex rounded-[12px] bg-white/[0.16] p-[4px]">
            <button
              type="button"
              onClick={openCreate}
              className="flex h-[28px] items-center gap-1.5 rounded-[9px] px-[13px] text-[13px] font-medium text-white/90 transition-colors hover:bg-white/10"
            >
              <Plus className="h-[14px] w-[14px]" strokeWidth={2.2} />
              {t("accounts.addAccount", "Add account")}
            </button>
          </div>
          <div className="flex gap-[2px] rounded-[12px] bg-white/[0.16] p-[4px]" role="tablist">
            {(["bank", "investment"] as RoleTab[]).map((tab) => {
              const isActive = tab === role;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => switchRole(tab)}
                  className={cn(
                    "flex h-[28px] items-center gap-1.5 rounded-[9px] px-[13px] text-[13px] transition-colors",
                    isActive ? "bg-white font-semibold text-primary" : "font-medium text-white/85 hover:bg-white/10",
                  )}
                >
                  <span>{tab === "bank" ? t("workspace.bank", "Bank") : t("workspace.investment", "Investment")}</span>
                  <span className={cn("text-[11px] tabular-nums", isActive ? "text-primary/70" : "text-white/60")}>{counts[tab]}</span>
                </button>
              );
            })}
          </div>
          </div>
        </div>
      </div>

      {/* Content (overlaps the banner) */}
      <div className="px-3 pb-6 pt-4 md:min-h-0 md:flex-1 md:overflow-hidden md:px-[34px] md:pb-8 md:pt-0 md:mt-[-72px]">
        <div className="grid grid-cols-1 gap-4 md:h-full md:grid-cols-[336px_minmax(0,1fr)]">
          {/* Left column */}
          <div className="flex flex-col md:h-full md:min-h-0">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] bg-card px-2.5 pb-2.5 pt-3.5 shadow-bento">
              <div className="min-h-0 flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="space-y-2 p-2">
                    {[0, 1, 2].map((i) => <div key={i} className="h-[48px] animate-pulse rounded-[10px] bg-muted" />)}
                  </div>
                ) : (
                  <>
                    <SectionLabel count={active.length}>
                      {role === "bank" ? t("accounts.bankAccountsTitle", "Bank accounts") : t("accounts.investmentAccountsTitle", "Investment accounts")}
                    </SectionLabel>
                    {active.length === 0 ? (
                      <p className="px-2.5 py-6 text-center text-sm text-muted-foreground">
                        {role === "bank" ? t("accounts.noBankAccounts", "No bank accounts yet.") : t("accounts.noInvestmentAccounts", "No investment accounts yet.")}
                      </p>
                    ) : (
                      active.map(renderItem)
                    )}
                    {archived.length > 0 && (
                      <div className="mt-3">
                        <SectionLabel count={archived.length}>{t("accounts.archivedTitle", "Archived")}</SectionLabel>
                        {archived.map(renderItem)}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="md:h-full md:min-h-0">
            {selected ? (
              <AccountDetailPanel
                key={selected.id}
                account={selected}
                onEdit={() => openEdit(selected)}
                onDelete={() => setDeleteTarget(selected)}
              />
            ) : (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 rounded-[14px] bg-card p-8 text-center shadow-bento">
                <Landmark className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {role === "bank" ? t("accounts.noBankAccounts", "No bank accounts yet.") : t("accounts.noInvestmentAccounts", "No investment accounts yet.")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AccountFormDialog
        key={editing?.id ?? `create-${role}`}
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }}
        mode={editing ? "edit" : "create"}
        initialValues={
          editing
            ? {
                institution: editing.institution,
                name: editing.name === editing.institution ? "" : editing.name,
                color: editing.color || getDefaultAccountColor(accounts.findIndex((a) => a.id === editing.id)),
                account_type: editing.account_type,
                currency_base: editing.currency_base,
                account_number: editing.account_number ?? undefined,
                initial_balance: editing.initial_balance,
                split_percentage: editing.split_percentage,
                notes: editing.notes ?? undefined,
                hidden_from_dashboard: editing.hidden_from_dashboard ?? false,
              }
            : undefined
        }
        typeFilter={role === "investment" ? "investment" : "bank"}
        isSubmitting={isCreating || isUpdating}
        onSubmit={handleSubmit}
      />

      <AccountDeleteDialog
        account={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
