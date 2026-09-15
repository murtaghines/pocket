import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchedTransaction } from "@/hooks/useRulePreview";
import { useRetroactiveCounts, type RetroScope } from "@/hooks/useRetroactiveApply";

interface Props {
  transactions: MatchedTransaction[];
  scope: RetroScope;
  onScopeChange: (scope: RetroScope) => void;
  customSince: string;
  onCustomSinceChange: (value: string) => void;
  compact?: boolean;
}

function getAvailableMonths(transactions: MatchedTransaction[]): string[] {
  const months = new Set<string>();
  for (const t of transactions) {
    const d = new Date(t.date);
    months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return [...months].sort().reverse();
}

function formatMonth(ym: string, locale: string): string {
  const [y, m] = ym.split("-");
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

export function RetroactiveApplyOptions({
  transactions,
  scope,
  onScopeChange,
  customSince,
  onCustomSinceChange,
  compact,
}: Props) {
  const { t, i18n } = useTranslation("settings");
  const counts = useRetroactiveCounts(transactions);
  const availableMonths = useMemo(() => getAvailableMonths(transactions), [transactions]);

  if (transactions.length === 0) return null;

  const options: { value: RetroScope; count: number }[] = [
    { value: "this_month", count: counts.thisMonth },
    { value: "last_3_months", count: counts.last3Months },
    { value: "all", count: counts.all },
    { value: "custom", count: 0 },
  ];

  const scopeLabel = (s: RetroScope) => {
    switch (s) {
      case "this_month": return t("categories.retroThisMonth");
      case "last_3_months": return t("categories.retroLast3Months");
      case "all": return t("categories.retroAll");
      case "custom": return t("categories.retroCustom");
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          {t("categories.retroScope")}
        </span>
        <div className="flex flex-wrap gap-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onScopeChange(opt.value)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                scope === opt.value
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {scopeLabel(opt.value)}
              {opt.value !== "custom" && opt.count > 0 && (
                <span className="ml-1 tabular-nums">({opt.count})</span>
              )}
            </button>
          ))}
        </div>
        {scope === "custom" && (
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <select
              value={customSince}
              onChange={(e) => onCustomSinceChange(e.target.value)}
              className="flex-1 h-8 rounded-lg border border-border bg-card px-2 text-xs"
            >
              <option value="">{t("categories.retroSince")}...</option>
              {availableMonths.map((ym) => (
                <option key={ym} value={ym}>
                  {formatMonth(ym, i18n.language === "es" ? "es-ES" : "en-US")}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {t("categories.retroScope")}
      </label>
      <div className="grid gap-1.5">
        {options.map((opt) => {
          const selected = scope === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onScopeChange(opt.value)}
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-all text-sm",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <span className="font-medium text-foreground">{scopeLabel(opt.value)}</span>
              {opt.value !== "custom" && (
                <span className={cn("text-xs tabular-nums", selected ? "text-primary" : "text-muted-foreground")}>
                  {t("categories.retroCount", { count: opt.count })}
                </span>
              )}
              {opt.value === "custom" && <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          );
        })}
      </div>
      {scope === "custom" && (
        <div className="flex items-center gap-2 pl-1">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          <select
            value={customSince}
            onChange={(e) => onCustomSinceChange(e.target.value)}
            className="flex-1 h-9 rounded-lg border border-border bg-card px-3 text-sm"
          >
            <option value="">{t("categories.retroSince")}...</option>
            {availableMonths.map((ym) => (
              <option key={ym} value={ym}>
                {formatMonth(ym, i18n.language === "es" ? "es-ES" : "en-US")}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
