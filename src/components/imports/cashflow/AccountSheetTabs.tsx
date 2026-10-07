import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("common");
  const activeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = activeRef.current;
      const left = el.offsetLeft - container.offsetLeft;
      if (left < container.scrollLeft || left + el.offsetWidth > container.scrollLeft + container.clientWidth) {
        el.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
      }
    }
  }, [activeAccountId]);

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block border-t border-border/40 bg-muted/30 shrink-0">
        <div ref={scrollRef} className="flex items-end gap-0 overflow-x-auto px-2 h-[34px] scrollbar-none">
          <button
            ref={activeAccountId === null ? activeRef : undefined}
            type="button"
            onClick={() => onSelect(null)}
            className={cn(
              "relative shrink-0 px-3 h-[30px] mt-auto text-[12px] font-medium rounded-t-[6px] transition-colors",
              activeAccountId === null
                ? "bg-card text-foreground shadow-[0_-1px_2px_rgba(0,0,0,0.04)]"
                : "bg-transparent text-muted-foreground hover:bg-muted/50",
            )}
          >
            {activeAccountId === null && (
              <span className="absolute top-0 left-2 right-2 h-[2px] rounded-b bg-primary" />
            )}
            {t("imports.allTab", "All")}
          </button>
          {accounts.map((acct) => (
            <button
              key={acct.id}
              ref={activeAccountId === acct.id ? activeRef : undefined}
              type="button"
              onClick={() => onSelect(acct.id)}
              className={cn(
                "relative shrink-0 inline-flex items-center gap-1.5 px-3 h-[30px] mt-auto text-[12px] font-medium rounded-t-[6px] transition-colors max-w-[180px]",
                activeAccountId === acct.id
                  ? "bg-card text-foreground shadow-[0_-1px_2px_rgba(0,0,0,0.04)]"
                  : "bg-transparent text-muted-foreground hover:bg-muted/50",
              )}
            >
              {activeAccountId === acct.id && (
                <span
                  className="absolute top-0 left-2 right-2 h-[2px] rounded-b"
                  style={{ backgroundColor: acct.color }}
                />
              )}
              <span
                className="w-[6px] h-[6px] rounded-full shrink-0"
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

      {/* Mobile */}
      <div className="md:hidden border-t border-border/40 bg-muted/30 shrink-0">
        <div className="flex items-end gap-0 overflow-x-auto px-1.5 h-[28px] scrollbar-none">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={cn(
              "relative shrink-0 px-2 h-[24px] mt-auto text-[11px] font-medium rounded-t-[5px] transition-colors",
              activeAccountId === null
                ? "bg-card text-foreground"
                : "bg-transparent text-muted-foreground",
            )}
          >
            {activeAccountId === null && (
              <span className="absolute top-0 left-1.5 right-1.5 h-[2px] rounded-b bg-primary" />
            )}
            {t("imports.allTab", "All")}
          </button>
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
    </>
  );
}
