import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { BankStatementsTabsView } from "@/components/imports/BankStatementsTabsView";
import { InvestmentTabsView } from "@/components/imports/InvestmentTabsView";

type Tab = "bank" | "investments";

/** Segmented toggle (styled like the History granularity switch) between the two Data sub-sections. */
function DataSectionToggle({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const { t } = useTranslation("common");
  const options: Array<{ key: Tab; label: string }> = [
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
            "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
            tab === o.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * MyData — full-screen workspace ("Data uploads"). The shared AppHeader carries the pill nav plus a
 * Bank statements / Investments toggle in the selector slot; below it each tabs view keeps the
 * canvas edge-to-edge for the spreadsheet.
 */
export default function MyData() {
  const { t } = useTranslation("common");
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab");
  const tab: Tab = tabParam === "investments" ? "investments" : "bank";

  // Body class so portaled UI inherits the dashboard theme tokens
  useEffect(() => {
    document.body.classList.add("dashboard-theme");
    return () => {
      document.body.classList.remove("dashboard-theme");
    };
  }, []);

  // Legacy deep-link support (?section=bank&month=YYYY-MM) — scroll & highlight
  const highlightSection = searchParams.get("section");
  const highlightMonth = searchParams.get("month");

  useEffect(() => {
    if (highlightSection && highlightMonth) {
      const timer = setTimeout(() => {
        const elementId =
          highlightSection === "bank"
            ? `upload-bank-${highlightMonth}`
            : `upload-investment-${highlightMonth}`;
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("ring-2", "ring-primary", "ring-offset-2");
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
          }, 2000);
        }
        const next = highlightSection === "investment" ? "investments" : "bank";
        setSearchParams({ tab: next });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlightSection, highlightMonth, setSearchParams]);

  return (
    <div className="min-h-screen bg-background dashboard-theme">
      <AppHeader
        title={t("navigation.dataUploads", "Data uploads")}
        showSelectors={false}
        leftExtra={<DataSectionToggle tab={tab} onChange={(next) => setSearchParams({ tab: next })} />}
      />

      {/* Full-bleed workspace — white canvas. Header (title + actions) lives inside the
          tabs view so it can render on the same row as the "Add file" button. */}
      <main className="w-full bg-card min-h-screen pb-20 md:pb-0">
        {tab === "bank" ? <BankStatementsTabsView /> : <InvestmentTabsView />}
      </main>

      <MobileBottomNav />
    </div>
  );
}
