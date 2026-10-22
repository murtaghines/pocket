import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Pencil, MoreHorizontal, Star, Archive, ArchiveRestore, Trash2, ArrowRightLeft, FileText, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccounts, type Account } from "@/hooks/useAccounts";
import { useImports } from "@/hooks/useImports";
import { useAccountDetail } from "@/hooks/useAccountDetail";
import { useLocalization } from "@/hooks/useLocalization";
import { getAccountDisplayName, getDefaultAccountColor } from "@/lib/accountColors";
import { getAccountTypeIcon, getAccountTypeI18nKey } from "@/lib/accountTypes";
import { cn } from "@/lib/utils";
import { UploadedFilesHistoryList as CashFiles } from "@/components/imports/cashflow/UploadedFiles";
import { UploadedFilesHistoryList as InvestmentFiles } from "@/components/imports/investments/UploadedFiles";

const NO_PENDING = new Set<string>();

interface AccountDetailPanelProps {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
}

function Section({ title, aside, children, flush = false }: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <section className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 px-[22px] pb-2 pt-4">
        <h3 className="text-[15px] font-bold text-foreground">{title}</h3>
        <div className="flex-1" />
        {aside}
      </div>
      <div className={flush ? "pb-2" : "px-[22px] pb-4"}>{children}</div>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-muted/50 px-3.5 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-[17px] font-semibold tabular-nums text-foreground">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_minmax(0,1fr)] items-baseline gap-3 py-1.5 sm:grid-cols-[160px_minmax(0,1fr)]">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-[13.5px] font-medium text-foreground">{children}</dd>
    </div>
  );
}

export function AccountDetailPanel({ account, onEdit, onDelete }: AccountDetailPanelProps) {
  const { t } = useTranslation("account");
  const { formatCurrency, formatDate, formatDateShort } = useLocalization();
  const { updateAccount, setPrimaryAccount, unsetPrimaryAccount } = useAccounts();
  const isInvestment = account.account_role === "INVESTMENT";
  const domain = isInvestment ? "INVESTING" : "CASHFLOW";
  const { imports, deleteImport, isDeleting } = useImports(domain);
  const { accounts } = useAccounts();
  const { data: detail, isLoading } = useAccountDetail(account);

  const color = account.color || getDefaultAccountColor(0);
  const TypeIcon = getAccountTypeIcon(account.account_type);
  const accountImports = imports.filter((i) => i.account_id === account.id);
  const cashAccounts = accounts.filter((a) => a.account_role === "CASH" && !a.archived);
  const money = (n: number) => formatCurrency(n, account.currency_base);

  const period = detail?.firstDate && detail.lastDate
    ? detail.firstDate === detail.lastDate
      ? formatDate(detail.firstDate)
      : `${formatDateShort(detail.firstDate)} – ${formatDateShort(detail.lastDate)}`
    : "—";

  const rowsLabel = isInvestment ? t("detail.movements", "Movements") : t("detail.transactions", "Transactions");
  const rowsHeading = isInvestment ? t("detail.recentMovements", "Recent movements") : t("detail.recentTransactions", "Recent transactions");

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[14px] bg-card shadow-bento">
      {/* Hero */}
      <div
        className="shrink-0 border-b border-border px-[22px] pb-3.5 pt-4"
        style={{ background: `linear-gradient(180deg, ${color}12 0%, hsl(var(--card)) 70%)` }}
      >
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-3">
          <div
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${color}26`, color }}
          >
            <TypeIcon className="h-[26px] w-[26px]" strokeWidth={2} />
          </div>
          <div className="min-w-[160px] flex-1">
            <h2 className="truncate text-[20px] font-bold text-foreground">{getAccountDisplayName(account)}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${color}26`, color }}>
                {t(getAccountTypeI18nKey(account.account_type))}
              </span>
              <span className="text-[12px] font-medium text-muted-foreground">{account.currency_base}</span>
              {account.is_primary && (
                <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-warning-foreground">
                  {t("accounts.primary", "Primary")}
                </span>
              )}
              {account.split_percentage < 100 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-bold tabular-nums text-primary">
                  {account.split_percentage}%
                </span>
              )}
              {account.archived && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
                  {t("accounts.archivedBadge", "Archived")}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              {t("accounts.edit", "Edit")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" aria-label={t("detail.more", "More actions")}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {!isInvestment && (
                  <DropdownMenuItem onClick={() => (account.is_primary ? unsetPrimaryAccount(account.id) : setPrimaryAccount(account.id))}>
                    <Star className="mr-2 h-4 w-4" fill={account.is_primary ? "currentColor" : "none"} />
                    {account.is_primary ? t("accounts.unsetPrimary", "Remove primary") : t("accounts.setPrimary", "Set as primary")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => updateAccount({ id: account.id, archived: !account.archived })}>
                  {account.archived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
                  {account.archived ? t("accounts.unarchive", "Restore account") : t("accounts.archive", "Archive account")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("accounts.delete", "Delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Overview numbers */}
        <div className="grid grid-cols-2 gap-3 px-[22px] pb-1 pt-4 xl:grid-cols-4">
          {!isInvestment && (
            <Stat
              label={t("detail.balance", "Balance")}
              value={isLoading || detail?.balance == null ? "…" : money(detail.balance)}
              hint={t("detail.balanceHint", "Initial balance + movements")}
            />
          )}
          <Stat
            label={rowsLabel}
            value={isLoading ? "…" : (detail?.count ?? 0).toLocaleString()}
            hint={detail && detail.uncategorized > 0 ? t("detail.uncategorized", { count: detail.uncategorized, defaultValue: "{{count}} uncategorized" }) : undefined}
          />
          <Stat label={t("detail.period", "Period")} value={isLoading ? "…" : period} />
          <Stat label={t("detail.files", "Files")} value={accountImports.length} />
        </div>

        {/* Settings */}
        <Section
          title={t("detail.settings", "Settings")}
          aside={
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[12px]" onClick={onEdit}>
              <Pencil className="h-3 w-3" />
              {t("accounts.edit", "Edit")}
            </Button>
          }
        >
          <dl className="divide-y divide-border/60">
            <Row label={isInvestment ? t("accounts.platform", "Platform") : t("detail.bank", "Bank")}>{account.institution}</Row>
            <Row label={t("detail.nickname", "Nickname")}>{account.name !== account.institution ? account.name : "—"}</Row>
            <Row label={t("accounts.accountType", "Account type")}>{t(getAccountTypeI18nKey(account.account_type))}</Row>
            <Row label={t("accounts.currency", "Currency")}>{account.currency_base}</Row>
            <Row label={t("accounts.accountNumber", "Account number")}>{account.account_number || "—"}</Row>
            <Row label={t("accounts.initialBalance", "Initial balance")}>
              <span className="tabular-nums">{money(Number(account.initial_balance))}</span>
            </Row>
            {account.account_type === "JOINT" && (
              <Row label={t("accounts.splitPercentage", "Your share (%)")}>
                <span className="tabular-nums">{account.split_percentage}%</span>
              </Row>
            )}
            <Row label={t("accounts.notes", "Notes")}>
              <span className={cn("whitespace-normal", !account.notes && "text-muted-foreground")}>{account.notes || "—"}</span>
            </Row>
          </dl>

          <div className="mt-3 space-y-2">
            {!isInvestment && (
              <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/50 px-3.5 py-2.5">
                <div>
                  <p className="text-[13px] font-medium text-foreground">{t("detail.primaryTitle", "Primary account")}</p>
                  <p className="text-[12px] text-muted-foreground">{t("detail.primaryHelp", "Preselected when you upload files")}</p>
                </div>
                <Switch
                  checked={account.is_primary}
                  onCheckedChange={(on) => (on ? setPrimaryAccount(account.id) : unsetPrimaryAccount(account.id))}
                  aria-label={t("detail.primaryTitle", "Primary account")}
                />
              </div>
            )}
            <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/50 px-3.5 py-2.5">
              <div>
                <p className="text-[13px] font-medium text-foreground">{t("accounts.hideFromDashboard", "Exclude from dashboard")}</p>
                <p className="text-[12px] text-muted-foreground">{t("accounts.hideFromDashboardHelp", "Hide this account from dashboard totals and charts")}</p>
              </div>
              <Switch
                checked={!!account.hidden_from_dashboard}
                onCheckedChange={(on) => updateAccount({ id: account.id, hidden_from_dashboard: on })}
                aria-label={t("accounts.hideFromDashboard", "Exclude from dashboard")}
              />
            </div>
          </div>
        </Section>

        {/* Files */}
        <Section
          title={`${t("detail.filesTitle", "Uploaded files")} (${accountImports.length})`}
          flush
          aside={
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[12px]" asChild>
              <Link to={isInvestment ? "/my-data?tab=investments" : "/my-data"}>
                <Upload className="h-3 w-3" />
                {t("accounts.uploadFiles", "Upload files")}
              </Link>
            </Button>
          }
        >
          {accountImports.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-[22px] py-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{t("accounts.noFilesForAccount", "No files uploaded to this account yet")}</p>
            </div>
          ) : isInvestment ? (
            <InvestmentFiles embedded imports={accountImports} deleteImport={deleteImport} isDeleting={isDeleting} pendingImportIds={NO_PENDING} />
          ) : (
            <CashFiles embedded imports={accountImports} cashAccounts={cashAccounts} deleteImport={deleteImport} isDeleting={isDeleting} pendingImportIds={NO_PENDING} />
          )}
          {!isInvestment && accountImports.length > 0 && (
            <p className="flex items-center gap-1.5 px-[22px] pt-2 text-[11.5px] text-muted-foreground">
              <ArrowRightLeft className="h-3 w-3" />
              {t("detail.reassignHint", "Uploaded to the wrong account? Pick another account on the file to move it, with all its transactions.")}
            </p>
          )}
        </Section>

        {/* Recent activity */}
        <Section title={rowsHeading}>
          {isLoading ? (
            <p className="py-2 text-sm text-muted-foreground">…</p>
          ) : !detail || detail.recent.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">{t("detail.noActivity", "No activity yet")}</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {detail.recent.map((row) => {
                const income = row.kind === "INCOME";
                const expense = row.kind === "EXPENSE";
                return (
                  <li key={row.id} className="flex items-center gap-3 py-2">
                    <span className="w-[44px] shrink-0 text-[12px] tabular-nums text-muted-foreground">{formatDateShort(row.date)}</span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-foreground">{row.description}</span>
                    <span
                      className={cn(
                        "shrink-0 text-[13.5px] font-medium tabular-nums",
                        row.amount === 0 ? "text-muted-foreground" : income ? "text-success" : expense ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {income ? "+" : expense ? "−" : ""}{money(Math.abs(row.amount))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
