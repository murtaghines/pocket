import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function IconAction({ label, description, onClick, children, active = false, tone = "default" }: {
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
