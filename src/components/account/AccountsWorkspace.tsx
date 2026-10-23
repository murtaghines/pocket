import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccounts, type Account } from "@/hooks/useAccounts";
import { useImports } from "@/hooks/useImports";
import { getAccountDisplayName, getAccountColor } from "@/lib/accountColors";
import { getAccountTypeIcon, getAccountTypeI18nKey, compareAccountsForDisplay } from "@/lib/accountTypes";
import { AccountFormDialog, type AccountFormValues } from "@/components/settings/AccountFormDialog";
import { AccountDetailPanel } from "@/components/account/AccountDetailPanel";
import { AccountDeleteDialog } from "@/components/account/AccountDeleteDialog";
import { AccountIdentityDialog } from "@/components/account/AccountIdentityDialog";
import { WorkspaceShell } from "@/components/layout/WorkspaceShell";

type RoleTab = "bank" | "investment";

const byDisplayOrder = (a: Account, b: Account) =>
  compareAccountsForDisplay(a, b) || getAccountDisplayName(a).localeCompare(getAccountDisplayName(b));

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
  const { accounts, isLoading, createAccount, updateAccount, isCreating } = useAccounts();
  const { imports } = useImports();

  const initialId = searchParams.get("account");
  const initialRole: RoleTab = accounts.find((a) => a.id === initialId)?.account_role === "INVESTMENT" ? "investment" : "bank";
  const [role, setRole] = useState<RoleTab>(initialRole);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);

  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [identityTarget, setIdentityTarget] = useState<Account | null>(null);

  const roleOf = (a: Account): RoleTab => (a.account_role === "INVESTMENT" ? "investment" : "bank");
  const inRole = useMemo(() => accounts.filter((a) => roleOf(a) === role), [accounts, role]);
  const active = useMemo(() => inRole.filter((a) => !a.archived).sort(byDisplayOrder), [inRole]);
  const archived = useMemo(() => inRole.filter((a) => a.archived).sort(byDisplayOrder), [inRole]);

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

  const openCreate = () => setFormOpen(true);

  const handleSubmit = (values: AccountFormValues) => {
    createAccount(
      {
        institution: values.institution,
        name: values.name,
        color: values.color,
        account_type: values.account_type,
        currency_base: values.currency_base,
        initial_balance: values.initial_balance,
        split_percentage: values.split_percentage,
        notes: values.notes,
        hidden_from_dashboard: values.hidden_from_dashboard,
      },
      { onSuccess: (created) => created?.id && select(created.id) },
    );
    setFormOpen(false);
  };

  const renderItem = (account: Account, idx: number) => {
    const color = getAccountColor(account);
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

  const emptyLabel = role === "bank" ? t("accounts.noBankAccounts", "No bank accounts yet.") : t("accounts.noInvestmentAccounts", "No investment accounts yet.");

  const left = (
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
            {active.length === 0 ? <p className="px-2.5 py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p> : active.map(renderItem)}
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
  );

  const right = selected ? (
    <AccountDetailPanel
      key={selected.id}
      account={selected}
      onEditIdentity={() => setIdentityTarget(selected)}
      onDelete={() => setDeleteTarget(selected)}
    />
  ) : (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 rounded-[14px] bg-card p-8 text-center shadow-bento">
      <Landmark className="h-10 w-10 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{emptyLabel}</p>
    </div>
  );

  return (
    <>
      <WorkspaceShell
        title={t("workspace.title", "Accounts")}
        subtitle={t("workspace.subtitle", { bank: counts.bank, investment: counts.investment, defaultValue: "{{bank}} bank · {{investment}} investment" })}
        action={{ label: t("accounts.addAccount", "Add account"), onClick: openCreate }}
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

      <AccountFormDialog
        key={`create-${role}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        mode="create"
        typeFilter={role === "investment" ? "investment" : "bank"}
        isSubmitting={isCreating}
        onSubmit={handleSubmit}
      />

      <AccountIdentityDialog
        account={identityTarget}
        onClose={() => setIdentityTarget(null)}
        onSave={(values) => {
          if (!identityTarget) return;
          updateAccount({ id: identityTarget.id, institution: values.institution, name: values.name || values.institution });
          setIdentityTarget(null);
        }}
      />

      <AccountDeleteDialog account={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </>
  );
}
