import { Loader2, FileText } from "lucide-react";
import type { PendingFileInfo } from "./types";

/* ─────────────────────────  Processing panel  ───────────────────────── */

export function ProcessingPanel({ files }: { files: PendingFileInfo[] }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-[0_2px_18px_-8px_rgb(8_8_8_/_0.08)] overflow-hidden">
      <div className="px-5 py-4 border-b border-border/60 bg-muted/30 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">
            Processing your file{files.length > 1 ? "s" : ""}
          </div>
          <div className="text-[11px] text-muted-foreground">
            This usually takes 20–60 seconds. You can keep working in another tab.
          </div>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        {files.map((f) => (
          <div key={f.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">{f.name}</span>
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground shrink-0">
              {f.status === "processing" ? "Processing…" : "Pending"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

