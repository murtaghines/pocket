import { Loader2, FileText, CheckCircle2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { PendingFileInfo } from "./types";

interface ProcessingPanelProps {
  files: PendingFileInfo[];
  onCancel?: (fileId: string) => void;
}

export function ProcessingPanel({ files, onCancel }: ProcessingPanelProps) {
  const { t } = useTranslation("common");
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-[0_2px_18px_-8px_rgb(8_8_8_/_0.08)] overflow-hidden">
      <div className="px-5 py-4 border-b border-border/60 bg-muted/30 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">
            {files.length > 1 ? t("imports.processingTitlePlural") : t("imports.processingTitle")}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {t("imports.processingSubtitle")}
          </div>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        {files.map((f) => {
          const pct = f.progressPercent ?? 0;
          const isDone = f.status === "completed";
          const isError = f.status === "error";

          return (
            <div key={f.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm font-medium text-foreground truncate">{f.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn(
                    "text-[11px] tabular-nums",
                    isError ? "text-destructive" : isDone ? "text-success" : "text-muted-foreground",
                  )}>
                    {f.progressLabel || (f.status === "processing" ? t("imports.processingStatus") : t("imports.pendingStatus"))}
                  </span>
                  {onCancel && !isDone && !isError && (
                    <button
                      type="button"
                      onClick={() => onCancel(f.id)}
                      className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title={t("imports.cancelUpload")}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {f.status === "processing" && (
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}

              {isDone && (
                <div className="h-1 rounded-full bg-success/20 overflow-hidden">
                  <div className="h-full rounded-full bg-success w-full" />
                </div>
              )}

              {isError && f.error && (
                <p className="text-[11px] text-destructive pl-6.5">{f.error}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
