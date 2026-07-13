import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FileText, Calendar, ArrowRight, CheckCircle, TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccountOverviewStats } from "@/hooks/useAccountOverviewStats";
import { useAccounts } from "@/hooks/useAccounts";
import { getAccountDisplayName, getDefaultAccountColor } from "@/lib/accountColors";
import { cn } from "@/lib/utils";

interface OverviewStatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  loading?: boolean;
}

function OverviewStatCard({ label, value, sub, icon: Icon, loading }: OverviewStatCardProps) {
  return (
    <div className="bg-card rounded-xl p-4 md:p-5 flex flex-col gap-2" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      {loading ? (
        <div className="h-8 w-16 rounded bg-muted animate-pulse" />
      ) : (
        <p className="text-[28px] font-bold tracking-[-0.02em] text-foreground leading-none tabular-nums">{value}</p>
      )}
      {sub && !loading && (
        <p className="text-xs text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    NORMALIZED: { label: "Done",       class: "bg-success/15 text-success" },
    PARSED:     { label: "Done",       class: "bg-success/15 text-success" },
    UPLOADED:   { label: "Processing", class: "bg-warning/15 text-warning-foreground" },
    PARTIAL:    { label: "Partial",    class: "bg-warning/15 text-warning-foreground" },
    FAILED:     { label: "Failed",     class: "bg-destructive/15 text-destructive" },
  };
  const s = map[status] || { label: status, class: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full", s.class)}>
      {s.label}
    </span>
  );
}

interface AccountOverviewTabProps {
  onNavigateTab: (tab: string) => void;
}

export function AccountOverviewTab({ onNavigateTab }: AccountOverviewTabProps) {
  const { t } = useTranslation("account");
  const { data: stats, isLoading } = useAccountOverviewStats();
  const { accounts } = useAccounts();
  const cashAccounts = accounts.filter((a) => a.account_role === "CASH");
  const investmentAccounts = accounts.filter((a) => a.account_role === "INVESTMENT");
  const allAccountsSorted = [...cashAccounts, ...investmentAccounts];

  const coverageLabel = (() => {
    if (!stats?.minMonth || !stats.maxMonth) return "—";
    if (stats.minMonth === stats.maxMonth) return stats.minMonth.replace("-", "/");
    return `${stats.minMonth.replace("-", "/")} → ${stats.maxMonth.replace("-", "/")}`;
  })();

  const uniqueAccountsWithFiles = Object.keys(stats?.accountFileMap || {}).length;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <OverviewStatCard
          label={t("overview.filesUploaded", "Files uploaded")}
          value={stats?.totalFiles ?? "—"}
          sub={
            uniqueAccountsWithFiles > 0
              ? t("overview.acrossAccounts_other", "across {{count}} accounts", {
                  count: uniqueAccountsWithFiles,
                })
              : undefined
          }
          icon={FileText}
          loading={isLoading}
        />
        <OverviewStatCard
          label={t("overview.coverage", "Coverage")}
          value={coverageLabel}
          sub={
            stats?.monthCount
              ? t("overview.months_other", "{{count}} months", { count: stats.monthCount })
              : undefined
          }
          icon={Calendar}
          loading={isLoading}
        />
        <OverviewStatCard
          label={t("overview.transactions", "Transactions")}
          value={stats?.totalTransactions?.toLocaleString() ?? "—"}
          icon={TrendingUp}
          loading={isLoading}
        />
        <OverviewStatCard
          label={t("overview.categorizationHealth", "Categorization")}
          value={stats?.totalTransactions ? `${stats.categorizedPercent}%` : "—"}
          sub={t("overview.categorized", "categorized")}
          icon={CheckCircle}
          loading={isLoading}
        />
      </div>

      {/* Two-column lower section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent files */}
        <div className="bg-card rounded-xl p-4 md:p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              {t("overview.recentFiles", "Recent files")}
            </h3>
            <Link
              to="/my-data"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {t("overview.seeAllFiles", "See all files")}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-3.5 w-12 rounded bg-muted animate-pulse ml-auto" />
                </div>
              ))}
            </div>
          ) : !stats?.recentFiles.length ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <FileText className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t("overview.noFiles", "No files uploaded yet")}</p>
              <Button variant="outline" size="sm" asChild className="mt-1">
                <Link to="/my-data">{t("overview.uploadCta", "Go to My Data")}</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {stats.recentFiles.map((file) => {
                const account = cashAccounts.find((a) => a.id === file.account_id);
                const idx = cashAccounts.findIndex((a) => a.id === file.account_id);
                const color = account?.color || getDefaultAccountColor(idx);

                return (
                  <li key={file.id} className="flex items-center gap-2 min-w-0">
                    {account && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                    )}
                    <span className="text-sm truncate flex-1 text-foreground">
                      {file.file_name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {file.month_key && (
                        <span className="text-xs text-muted-foreground">
                          {file.month_key.replace("-", "/")}
                        </span>
                      )}
                      <StatusBadge status={file.status} />
                      {file.file_storage_url && (
                        <a
                          href={file.file_storage_url}
                          download
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Download file"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Bank accounts summary */}
        <div className="bg-card rounded-xl p-4 md:p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              {t("overview.yourAccounts", "Your accounts")}
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab("accounts")}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {t("overview.viewAllAccounts", "View all accounts")}
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {allAccountsSorted.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t("overview.noAccounts", "No accounts yet")}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={() => onNavigateTab("accounts")}
              >
                {t("accounts.addAccount", "Add account")}
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {allAccountsSorted.slice(0, 6).map((account, idx) => {
                const color = account.color || getDefaultAccountColor(idx);
                const fileCount = stats?.accountFileMap[account.id] || 0;
                return (
                  <li key={account.id} className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm font-medium truncate flex-1 text-foreground">
                      {getAccountDisplayName(account)}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 shrink-0">
                      {account.account_role === "INVESTMENT" ? "INV" : "BANK"}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {fileCount > 0
                        ? t("accounts.files_other", "{{count}} files", { count: fileCount })
                        : t("accounts.noUploads", "no uploads yet")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
