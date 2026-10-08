import { cn } from "@/lib/utils";

export interface AccountTab {
  id: string;
  name: string;
  color: string;
  txCount: number;
}

interface AccountSheetTabsProps {
  accounts: AccountTab[];
  activeAccountId: string | null;
  onSelect: (accountId: string | null) => void;
}

export function AccountSheetTabs({
  accounts,
  activeAccountId,
  onSelect,
}: AccountSheetTabsProps) {
  return (
    <div className="md:hidden border-t border-border/40 bg-muted/30 shrink-0">
      <div className="flex items-end gap-0 overflow-x-auto px-1.5 h-[28px] scrollbar-none">
        {accounts.map((acct) => (
          <button
            key={acct.id}
            type="button"
            onClick={() => onSelect(acct.id)}
            className={cn(
              "relative shrink-0 inline-flex items-center gap-1 px-2 h-[24px] mt-auto text-[11px] font-medium rounded-t-[5px] transition-colors max-w-[140px]",
              activeAccountId === acct.id
                ? "bg-card text-foreground"
                : "bg-transparent text-muted-foreground",
            )}
          >
            {activeAccountId === acct.id && (
              <span
                className="absolute top-0 left-1.5 right-1.5 h-[2px] rounded-b"
                style={{ backgroundColor: acct.color }}
              />
            )}
            <span
              className="w-[5px] h-[5px] rounded-full shrink-0"
              style={{ backgroundColor: acct.color }}
            />
            <span className="truncate">{acct.name}</span>
            {acct.txCount > 0 && (
              <span className="text-[10px] text-muted-foreground/60 tabular-nums">{acct.txCount}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
