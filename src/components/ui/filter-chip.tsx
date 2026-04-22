import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, X, Plus, Search, Filter, ArrowUpDown, EyeOff } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

/**
 * Airtable-inspired filter chips and toolbar.
 *
 * Visual contract:
 *  - Toolbar: thin row of icon buttons (Hide fields, Filter, Group, Sort, Search) with hairline divider
 *  - Active filters render as compact chips with a colored left dot, a label,
 *    a value, and a remove (×) button
 *  - "+ Add filter" trigger appears at the end
 */

/* ──────────────────────────  Toolbar  ────────────────────────── */

interface FilterToolbarProps {
  className?: string;
  children: React.ReactNode;
}

export function FilterToolbar({ className, children }: FilterToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card px-2 py-1.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label?: string;
  active?: boolean;
}

export const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ className, icon, label, active, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs font-medium",
          "text-foreground/70 hover:text-foreground hover:bg-muted transition-colors",
          active && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
          className,
        )}
        {...props}
      >
        <span className="w-3.5 h-3.5 inline-flex items-center justify-center">{icon}</span>
        {label && <span>{label}</span>}
      </button>
    );
  },
);
ToolbarButton.displayName = "ToolbarButton";

export function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-0.5" aria-hidden />;
}

/* ──────────────────────────  Filter chip  ────────────────────────── */

interface FilterChipProps {
  /** Field label, e.g. "Movement" */
  field: string;
  /** Selected value(s) summary, e.g. "Income, Expense" or "All" */
  value: string;
  /** Optional accent dot (HSL color) shown before the field label */
  dotColor?: string;
  /** Popover content (the editor for this filter) */
  children?: React.ReactNode;
  /** Remove this filter entirely */
  onRemove?: () => void;
  /** Show as "active" (has non-default value) */
  active?: boolean;
  className?: string;
}

export function FilterChip({
  field,
  value,
  dotColor,
  children,
  onRemove,
  active,
  className,
}: FilterChipProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center h-7 rounded-md border text-xs overflow-hidden",
        active
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card hover:bg-muted/40",
        className,
      )}
    >
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-full px-2 hover:bg-muted/50 transition-colors"
          >
            {dotColor && (
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: dotColor }}
                aria-hidden
              />
            )}
            <span className="text-foreground/60 font-medium">{field}</span>
            <span className="text-foreground/40">:</span>
            <span className="text-foreground font-medium max-w-[160px] truncate">
              {value}
            </span>
            <ChevronDown className="w-3 h-3 opacity-50 shrink-0" />
          </button>
        </PopoverTrigger>
        {children && (
          <PopoverContent className="w-64 p-2 rounded-xl" align="start">
            {children}
          </PopoverContent>
        )}
      </Popover>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center justify-center h-full w-6 text-foreground/40 hover:text-foreground hover:bg-muted/60 border-l border-border/50 transition-colors"
          aria-label="Remove filter"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

/* ──────────────────────────  Add filter button  ────────────────────────── */

interface AddFilterButtonProps {
  label?: string;
  onClick?: () => void;
  className?: string;
}

export function AddFilterButton({ label = "Add filter", onClick, className }: AddFilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium",
        "text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors",
        "border border-dashed border-border/70",
        className,
      )}
    >
      <Plus className="w-3 h-3" />
      <span>{label}</span>
    </button>
  );
}

/* ──────────────────────────  Inline search  ────────────────────────── */

interface ToolbarSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ToolbarSearch({ value, onChange, placeholder, className }: ToolbarSearchProps) {
  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70 pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-7 pl-7 pr-2 text-xs rounded-md border-border bg-card focus-visible:ring-1 focus-visible:ring-primary/30"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Clear search"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

/* ──────────────────────────  Re-export icons used in toolbar  ────────────────────────── */
export { Filter, ArrowUpDown, EyeOff };
