import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type DataTab = "bank" | "investments";

/**
 * Segmented toggle between the two Data sub-sections (bank statements / investments), styled like
 * the History granularity switch. Lives in the workspace toolbar as the top row of the page.
 */
export function DataSectionToggle({
  tab,
  onChange,
}: {
  tab: DataTab;
  onChange: (t: DataTab) => void;
}) {
  const { t } = useTranslation("common");
  const options: Array<{ key: DataTab; label: string }> = [
    { key: "bank", label: t("navigation.bankStatements", "Bank statements") },
    { key: "investments", label: t("navigation.investments", "Investments") },
  ];
  return (
    <div className="inline-flex items-center rounded-full bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          aria-pressed={tab === o.key}
          className={cn(
            "rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors",
            tab === o.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
