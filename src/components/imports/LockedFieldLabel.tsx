import { useState } from "react";
import { Lock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SHEET_LABEL } from "./SheetPanel";

/**
 * A field label with an optional lock badge. The reason a field can't be edited
 * lives behind the badge rather than as a caption under the input — captions
 * pushed the fields apart and repeated themselves on every locked row.
 *
 * Popover (not Tooltip) because this has to work on touch, where there's no
 * hover; on a pointer device it opens on hover as well.
 */
export function LockedFieldLabel({
  label,
  locked,
  reason,
  className,
}: {
  label: string;
  locked?: boolean;
  reason?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!locked) {
    return <label className={cn(SHEET_LABEL, className)}>{label}</label>;
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <label className={SHEET_LABEL}>{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            aria-label={reason}
            // Hover only opens it on a real pointer; on touch there's no hover,
            // so the tap falls through to the trigger's own click handling.
            onPointerEnter={(e) => { if (e.pointerType === "mouse") setOpen(true); }}
            onPointerLeave={(e) => { if (e.pointerType === "mouse") setOpen(false); }}
          >
            <Lock className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="top"
          className="w-56 rounded-2xl border-0 p-3 text-[12px] lowercase leading-snug text-muted-foreground shadow-lg"
        >
          {reason}
        </PopoverContent>
      </Popover>
    </div>
  );
}
