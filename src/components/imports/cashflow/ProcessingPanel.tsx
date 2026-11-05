import { Loader2, FileText, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { PendingFileInfo } from "./types";

const STAGE_KEYS = [
  { threshold: 18, key: "imports.stageReadFile" },
  { threshold: 28, key: "imports.stageCheckDuplicates" },
  { threshold: 38, key: "imports.stageUploaded" },
  { threshold: 92, key: "imports.stageReadAi" },
  { threshold: 100, key: "imports.stageSaved" },
] as const;

export function ProcessingPanel({ files }: { files: PendingFileInfo[] }) {
  const { t } = useTranslation("common");
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-[0_2px_18px_-8px_rgb(8_8_8_/_0.08)] overflow-hidden">
      {/* Header */}
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

      <div className="px-5 py-4 space-y-5">
        {files.map((f) => (
          <FileProgress key={f.id} file={f} />
        ))}
      </div>
    </div>
  );
}

export function FileProgress({ file }: { file: PendingFileInfo }) {
  const { t } = useTranslation("common");
  const pct = Math.max(0, Math.min(100, file.progressPercent ?? 0));
  const label = file.progressLabel || t("imports.preparing");
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
        {STAGE_KEYS.map((stage) => {
          const done = pct >= stage.threshold;
          const active = !done && pct >= (
            STAGE_KEYS[STAGE_KEYS.indexOf(stage) - 1]?.threshold ?? 0
          );
          const stageLabel = t(stage.key);
          return (
            <li
              key={stage.key}
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
              <span>{stageLabel}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
