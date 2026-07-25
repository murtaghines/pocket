import { useTranslation } from "react-i18next";
import type { Granularity } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Granularity; fallback: string }[] = [
  { value: "week", fallback: "Week" },
  { value: "month", fallback: "Month" },
  { value: "year", fallback: "Year" },
];

interface GranularityToggleProps {
  value: Granularity;
  onChange: (g: Granularity) => void;
}

/** Segmented Week / Month / Year control that drives the granularity of the whole History view. */
export function GranularityToggle({ value, onChange }: GranularityToggleProps) {
  const { t } = useTranslation("dashboard");
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full bg-muted/60 p-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
            value === opt.value
              ? "bg-card text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(`granularity.${opt.value}`, opt.fallback)}
        </button>
      ))}
    </div>
  );
}
