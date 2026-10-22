import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Page chrome shared by every master/detail workspace (Categories & rules, Accounts, Files):
 *  a 180px blue banner (same height as the band on every other page) with the title on the left
 *  and two translucent controls on the right, and a content area that overlaps the banner so the
 *  white cards start ~78px from the top (180px banner − 102px overlap). Keep the numbers here —
 *  pages must not tweak them. */

interface SelectorOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface WorkspaceBannerProps<T extends string> {
  title: string;
  subtitle: ReactNode;
  action?: { label: string; onClick: () => void };
  selector: { value: T; options: SelectorOption<T>[]; onChange: (value: T) => void };
}

export function WorkspaceBanner<T extends string>({ title, subtitle, action, selector }: WorkspaceBannerProps<T>) {
  return (
    <div className="shrink-0 bg-primary px-3 pb-6 pt-4 md:h-[180px] md:px-[34px] md:pb-0 md:pt-[22px]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-[19px] font-semibold leading-none tracking-[-0.01em] text-white">{title}</h1>
          <p className="mt-1.5 text-[12.5px] font-medium tabular-nums text-white/80">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          {action && (
            <div className="flex h-9 items-center rounded-[12px] bg-white/[0.16] p-1">
              <button
                type="button"
                onClick={action.onClick}
                className="flex h-7 items-center gap-1.5 rounded-[9px] px-[13px] text-[13px] font-medium leading-none text-white/90 transition-colors hover:bg-white/10"
              >
                <Plus className="h-[14px] w-[14px]" strokeWidth={2.2} />
                {action.label}
              </button>
            </div>
          )}
          <div className="flex h-9 items-center gap-[2px] rounded-[12px] bg-white/[0.16] p-1" role="tablist">
            {selector.options.map((opt) => {
              const active = opt.value === selector.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selector.onChange(opt.value)}
                  className={cn(
                    "flex h-7 items-center gap-1.5 rounded-[9px] px-[13px] text-[13px] leading-none transition-colors",
                    active ? "bg-white font-semibold text-primary" : "font-medium text-white/85 hover:bg-white/10",
                  )}
                >
                  <span>{opt.label}</span>
                  {opt.count != null && (
                    <span className={cn("text-[11px] tabular-nums", active ? "text-primary/70" : "text-white/60")}>{opt.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface WorkspaceShellProps<T extends string> extends WorkspaceBannerProps<T> {
  left: ReactNode;
  right: ReactNode;
}

/** Desktop is fullBleed (the workspace scrolls its own panes); mobile stacks and the page scrolls. */
export function WorkspaceShell<T extends string>({ left, right, ...banner }: WorkspaceShellProps<T>) {
  return (
    <div className="flex flex-col bg-background md:h-full md:overflow-hidden">
      <WorkspaceBanner {...banner} />
      <div className="px-3 pb-6 pt-4 md:-mt-[102px] md:min-h-0 md:flex-1 md:overflow-hidden md:px-[34px] md:pb-8 md:pt-0">
        <div className="grid grid-cols-1 gap-4 md:h-full md:grid-cols-[336px_minmax(0,1fr)]">
          <div className="flex flex-col md:h-full md:min-h-0">{left}</div>
          <div className="md:h-full md:min-h-0">{right}</div>
        </div>
      </div>
    </div>
  );
}
