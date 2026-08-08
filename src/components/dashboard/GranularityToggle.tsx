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
  variant?: "default" | "onPrimary";
}

export function GranularityToggle({ value, onChange, variant = "default" }: GranularityToggleProps) {
  const { t } = useTranslation("dashboard");
  const onBlue = variant === "onPrimary";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full p-0.5",
        onBlue
          ? "border border-white/20 bg-white/10"
          : "border border-primary/45 bg-muted/60",
      )}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
            value === opt.value
              ? onBlue
                ? "bg-white/25 text-white shadow-sm"
                : "bg-card text-primary shadow-sm"
              : onBlue
                ? "text-white/60 hover:text-white"
                : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(`granularity.${opt.value}`, opt.fallback)}
        </button>
      ))}
    </div>
  );
}
