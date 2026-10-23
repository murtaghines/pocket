import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Pencil, Star, Archive, ArchiveRestore, Trash2, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAccounts, type Account } from "@/hooks/useAccounts";
import { useImports } from "@/hooks/useImports";
import { useAccountDetail } from "@/hooks/useAccountDetail";
import { useLocalization } from "@/hooks/useLocalization";
import { getAccountDisplayName, getDefaultAccountColor } from "@/lib/accountColors";
import { getAccountTypeIcon, getAccountTypeI18nKey } from "@/lib/accountTypes";
import { getCurrencyByCode } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { getFileKind, FileTypeIcon } from "@/components/account/fileBits";

interface AccountDetailPanelProps {
  account: Account;
  onEditIdentity: () => void;
  onDelete: () => void;
}

const FILES_PREVIEW = 6;

function IconAction({ label, description, onClick, children, active = false, tone = "default" }: {
  label: string;
  description: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  tone?: "default" | "warning" | "destructive";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-pressed={tone === "warning" ? active : undefined}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted",
            tone === "warning" && (active ? "text-warning" : "text-muted-foreground hover:text-foreground"),
            tone === "destructive" && "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
            tone === "default" && "text-muted-foreground hover:text-foreground",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[240px]">
        <p className="text-[13px] font-semibold">{label}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 px-[22px] pb-2 pt-4">
        <h3 className="text-[15px] font-bold text-foreground">{title}</h3>
        <div className="flex-1" />
        {aside}
      </div>
      <div className="px-[22px] pb-4">{children}</div>
    </section>
  );
}

function Stat({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 rounded-xl bg-muted/50 px-3.5 py-3", className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-[17px] font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-[12px] text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Saves on blur / Enter, reverts on Escape. */
function InlineInput({
  value,
  onCommit,
  prefix,
  inputMode,
  ariaLabel,
}: {
  value: string;
  onCommit: (next: string) => void;
  prefix?: string;
  inputMode?: "decimal" | "numeric";
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    const next = draft.trim();
    if (next !== value) onCommit(next);
  };

  return (
    <div className="flex h-9 items-center gap-1.5 rounded-lg bg-muted/60 px-3 focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/30">
      {prefix && <span className="text-[13px] text-muted-foreground">{prefix}</span>}
      <input
        value={draft}
        inputMode={inputMode}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") { setDraft(value); e.currentTarget.blur(); }
        }}
        className="w-[110px] bg-transparent text-right text-[13.5px] font-medium tabular-nums text-foreground outline-none"
      />
    </div>
  );
}

export function AccountDetailPanel({ account, onEditIdentity, onDelete }: AccountDetailPanelProps) {
  const { t } = useTranslation("account");
  const { formatMonthShort, formatDate } = useLocalization();
  const { updateAccount, setPrimaryAccount, unsetPrimaryAccount } = useAccounts();
  const [confirm, setConfirm] = useState<"archive" | null>(null);
  const isInvestment = account.account_role === "INVESTMENT";
  const { imports } = useImports(isInvestment ? "INVESTING" : "CASHFLOW");
  const { data: period } = useAccountDetail(account);
  const [notes, setNotes] = useState(account.notes ?? "");
  useEffect(() => setNotes(account.notes ?? ""), [account.notes]);

  const color = account.color || getDefaultAccountColor(0);
  const TypeIcon = getAccountTypeIcon(account.account_type);
  const files = imports.filter((i) => i.account_id === account.id).sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
  const symbol = getCurrencyByCode(account.currency_base)?.symbol ?? account.currency_base;

  const monthLabel = (d: string) => `${formatMonthShort(d)} ${d.slice(0, 4)}`;
  const periodLabel = period?.firstDate && period.lastDate
    ? period.firstDate.slice(0, 7) === period.lastDate.slice(0, 7)
      ? monthLabel(period.firstDate)
      : `${monthLabel(period.firstDate)} – ${monthLabel(period.lastDate)}`
    : "—";
  const monthCount = period?.firstDate && period.lastDate
    ? (Number(period.lastDate.slice(0, 4)) - Number(period.firstDate.slice(0, 4))) * 12 +
      (Number(period.lastDate.slice(5, 7)) - Number(period.firstDate.slice(5, 7))) + 1
    : 0;

  const commitBalance = (raw: string) => {
    const n = parseFloat(raw.replace(",", "."));
    if (Number.isFinite(n)) updateAccount({ id: account.id, initial_balance: n });
  };
  const commitShare = (raw: string) => {
    const n = parseInt(raw, 10);
    if (n >= 1 && n <= 100) updateAccount({ id: account.id, split_percentage: n });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[14px] bg-card shadow-bento">
      {/* Hero */}
      <div
        className="shrink-0 border-b border-border px-[22px] pb-3.5 pt-4"
        style={{ background: `linear-gradient(180deg, ${color}12 0%, hsl(var(--card)) 70%)` }}
      >
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-3">
          <button
            type="button"
            onClick={onEditIdentity}
            title={t("identity.title", "Name and color")}
            aria-label={t("identity.title", "Name and color")}
            className="group/icon relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${color}26`, color }}
          >
            <TypeIcon className="h-[26px] w-[26px] transition-opacity duration-150 group-hover/icon:opacity-30" strokeWidth={2} />
            <Pencil className="absolute h-5 w-5 text-foreground/60 opacity-0 transition-opacity duration-150 group-hover/icon:opacity-100" />
          </button>
          <div className="min-w-[160px] flex-1">
            <h2 className="truncate text-[17px] font-bold text-foreground">{getAccountDisplayName(account)}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${color}26`, color }}>
                {t(getAccountTypeI18nKey(account.account_type))}
              </span>
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
          <div className="flex shrink-0 items-center gap-0.5">
            {!isInvestment && (
              <IconAction
                label={account.is_primary ? t("accounts.unsetPrimary", "Remove primary") : t("accounts.setPrimary", "Set as primary")}
                description={t("accounts.primaryHelp", "The account preselected when you upload files.")}
                active={account.is_primary}
                tone="warning"
                onClick={() => (account.is_primary ? unsetPrimaryAccount(account.id) : setPrimaryAccount(account.id))}
              >
                <Star className="h-[18px] w-[18px]" fill={account.is_primary ? "currentColor" : "none"} />
              </IconAction>
            )}
            <IconAction
              label={account.archived ? t("accounts.unarchive", "Restore account") : t("accounts.archive", "Archive account")}
              description={account.archived
                ? t("accounts.restoreHelp", "Brings it back to your active accounts, with its files and transactions.")
                : t("accounts.archiveHelp", "Moves it out of your active accounts. Nothing is deleted, and you can restore it anytime.")}
              onClick={() => setConfirm("archive")}
            >
              {account.archived ? <ArchiveRestore className="h-[18px] w-[18px]" /> : <Archive className="h-[18px] w-[18px]" />}
            </IconAction>
            <IconAction
              label={t("accounts.delete", "Delete")}
              description={t("accounts.deleteHelp", "Permanently removes the account. Its files and transactions are handled first.")}
              tone="destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-[18px] w-[18px]" />
            </IconAction>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* What's been uploaded */}
        <div className="grid grid-cols-2 gap-3 px-[22px] pb-1 pt-4 xl:grid-cols-4">
          <Stat label={t("detail.files", "Files")} value={files.length} />
          <Stat label={t("detail.months", "Months")} value={monthCount} />
          <Stat label={t("accounts.currency", "Currency")} value={account.currency_base} />
          <Stat label={t("detail.period", "Period")} value={periodLabel} />
        </div>

        {/* Settings, edited in place */}
        <Section title={t("detail.settings", "Settings")}>
          <div className="divide-y divide-border/60">
            <Field label={t("accounts.initialBalance", "Initial balance")} hint={t("accounts.initialBalanceHelpFile", "Auto-set from your first statement. You can also set it manually.")}>
              <InlineInput
                value={String(account.initial_balance ?? 0)}
                onCommit={commitBalance}
                prefix={symbol}
                inputMode="decimal"
                ariaLabel={t("accounts.initialBalance", "Initial balance")}
              />
            </Field>
            {account.account_type === "JOINT" && (
              <Field label={t("accounts.splitPercentage", "Your share (%)")} hint={t("accounts.splitPercentageHelp", "Your percentage of this shared account. E.g. 50 means you pay half.")}>
                <InlineInput
                  value={String(account.split_percentage)}
                  onCommit={commitShare}
                  prefix="%"
                  inputMode="numeric"
                  ariaLabel={t("accounts.splitPercentage", "Your share (%)")}
                />
              </Field>
            )}
            <Field label={t("accounts.hideFromDashboard", "Exclude from dashboard")} hint={t("accounts.hideFromDashboardHelp", "Hide this account from dashboard totals and charts")}>
              <Switch
                checked={!!account.hidden_from_dashboard}
                onCheckedChange={(on) => updateAccount({ id: account.id, hidden_from_dashboard: on })}
                aria-label={t("accounts.hideFromDashboard", "Exclude from dashboard")}
              />
            </Field>
          </div>
          <div className="pt-3">
            <label htmlFor={`notes-${account.id}`} className="text-[13.5px] font-medium text-foreground">{t("accounts.notes", "Notes")}</label>
            <textarea
              id={`notes-${account.id}`}
              value={notes}
              rows={2}
              placeholder={t("accounts.notesPlaceholder", "e.g. Main salary account, opened in 2019")}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => { if (notes.trim() !== (account.notes ?? "")) updateAccount({ id: account.id, notes: notes.trim() || null }); }}
              className="mt-1.5 w-full resize-none rounded-lg bg-muted/60 px-3 py-2 text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:bg-card focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </Section>

        {/* Files — read only here; assigning and previewing happens in Files */}
        <Section
          title={`${t("detail.filesTitle", "Uploaded files")} (${files.length})`}
          aside={
            <Link
              to={`/account?tab=files&account=${account.id}`}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
            >
              {t("detail.goToFiles", "Go to all files")}
              <ChevronRight className="h-4 w-4" />
            </Link>
          }
        >
          {files.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{t("accounts.noFilesForAccount", "No files uploaded to this account yet")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {files.slice(0, FILES_PREVIEW).map((f) => {
                const { label } = getFileKind(f);
                return (
                  <li key={f.id} className="flex items-center gap-3 py-2.5">
                    <FileTypeIcon label={label} width={22} className="mx-1" />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-foreground" title={f.file_name}>{f.file_name}</span>
                    <span className="w-[92px] shrink-0 text-right text-[12px] tabular-nums text-muted-foreground">{formatDate(f.uploaded_at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {files.length > FILES_PREVIEW && (
            <p className="pt-2 text-[12px] text-muted-foreground">
              {t("detail.moreFiles", { count: files.length - FILES_PREVIEW, defaultValue: "+{{count}} more" })}
            </p>
          )}
        </Section>
      </div>
    
      <AlertDialog open={confirm === "archive"} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {account.archived ? t("accounts.restoreTitle", "Restore this account?") : t("accounts.archiveTitle", "Archive this account?")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {account.archived ? (
                  <p>{t("accounts.restoreBody", "It goes back to your active accounts, with all its files and transactions, and shows up again in the Accounts list and in pickers.")}</p>
                ) : (
                  <>
                    <p>{t("accounts.archiveBody", "{{name}} moves out of your active accounts.", { name: getAccountDisplayName(account) })}</p>
                    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                      <li>{t("accounts.archiveKeeps", "Nothing is deleted: its files and transactions are kept.")}</li>
                      <li>{t("accounts.archiveHidden", "It leaves the active list and the account pickers when uploading.")}</li>
                      <li>{t("accounts.archiveRestore", "You can restore it at any time from the archived section.")}</li>
                    </ul>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("accounts.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => updateAccount({ id: account.id, archived: !account.archived })}>
              {account.archived ? t("accounts.restore", "Restore") : t("accounts.archive", "Archive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
</div>
  );
}
