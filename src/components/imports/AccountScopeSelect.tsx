import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { getAccountDisplayName } from "@/lib/accountColors";
import type { Account } from "@/hooks/useAccounts";

interface Props {
  accounts: Account[];
  /** null = all accounts; otherwise the subset of account ids in scope. */
  value: string[] | null;
  onChange: (value: string[] | null) => void;
}

/**
 * Multi-select account scope as toggle chips. "All accounts" is the null state;
 * picking specific accounts narrows the scope to that subset. Selecting no specific
 * account collapses back to "All". Governs both the rule's forward scope (a single
 * account when exactly one is picked, else global) and the retroactive-apply set.
 */
export function AccountScopeSelect({ accounts, value, onChange }: Props) {
  const { t } = useTranslation("settings");
  const active = accounts.filter((a) => !a.archived);
  if (active.length <= 1) return null;

  const isAll = value === null;

  const toggleAccount = (id: string) => {
    if (value === null) {
      onChange([id]);
      return;
    }
    const next = value.includes(id) ? value.filter((x) => x !== id) : [...value, id];
    onChange(next.length === 0 ? null : next);
  };

  return (
    <div className="space-y-2">
      <label className="text-[13px] font-semibold text-foreground">
        {t("categories.accountScope")}
      </label>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            isAll ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          {t("categories.accountScopeAll")}
        </button>
        {active.map((a) => {
          const selected = !isAll && value.includes(a.id);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => toggleAccount(a.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {getAccountDisplayName(a)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
