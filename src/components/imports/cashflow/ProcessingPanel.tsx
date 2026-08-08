import { Loader2, FileText, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PendingFileInfo } from "./types";

export const PROCESSING_STAGES: { threshold: number; label: string }[] = [
  { threshold: 18, label: "Read your file" },
  { threshold: 28, label: "Checked for duplicates" },
  { threshold: 38, label: "Uploaded securely" },
  { threshold: 92, label: "Read transactions with AI" },
  { threshold: 100, label: "Saved & categorized" },
];

export function ProcessingPanel({ files }: { files: PendingFileInfo[] }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-[0_2px_18px_-8px_rgb(8_8_8_/_0.08)] overflow-hidden">
      {/* Header */}
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

      <div className="px-5 py-4 space-y-5">
        {files.map((f) => (
          <FileProgress key={f.id} file={f} />
        ))}
      </div>
    </div>
  );
}

export function FileProgress({ file }: { file: PendingFileInfo }) {
  const pct = Math.max(0, Math.min(100, file.progressPercent ?? 0));
  const label = file.progressLabel || "Preparing…";
  const sizeKb = file.size ? Math.round(file.size / 102.4) / 10 : null;

  return (
    <div className="space-y-2.5">
      {/* File row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">
            {file.name}
          </span>
          {sizeKb !== null && (
            <span className="text-[11px] text-muted-foreground shrink-0">
              {sizeKb < 1024 ? `${sizeKb} KB` : `${(sizeKb / 1024).toFixed(1)} MB`}
            </span>
          )}
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground shrink-0">
          {Math.round(pct)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Live status copy */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin text-primary" />
        <span>{label}</span>
      </div>

      {/* Stage checklist */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1">
        {PROCESSING_STAGES.map((stage) => {
          const done = pct >= stage.threshold;
          const active = !done && pct >= (
            PROCESSING_STAGES[PROCESSING_STAGES.indexOf(stage) - 1]?.threshold ?? 0
          );
          return (
            <li
              key={stage.label}
              className={cn(
                "flex items-center gap-1.5 text-[11px]",
                done
                  ? "text-foreground"
                  : active
                    ? "text-foreground/80"
                    : "text-muted-foreground/50",
              )}
            >
              {done ? (
                <Check className="w-3 h-3 text-success shrink-0" />
              ) : active ? (
                <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />
              ) : (
                <span className="w-3 h-3 rounded-full border border-border shrink-0" />
              )}
              <span>{stage.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
