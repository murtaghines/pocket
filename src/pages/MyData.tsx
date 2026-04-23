import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DataRail } from "@/components/layout/DataRail";
import { BankStatementsTabsView } from "@/components/profile/BankStatementsTabsView";
import { InvestmentTabsView } from "@/components/profile/InvestmentTabsView";

type Tab = "bank" | "investments";

/**
 * MyData — full-screen workspace. The persistent vertical DataRail handles
 * navigation between sub-sections (bank / investments) and back home, so we
 * intentionally skip DashboardLayout's top nav to maximise the spreadsheet area.
 */
export default function MyData() {
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

  const title =
    tab === "bank"
      ? "Bank statements"
      : "Investment statements";
  const subtitle =
    tab === "bank"
      ? "Pick a month and edit transactions inline"
      : "Upload portfolio snapshots per month";

  return (
    <div className="min-h-screen bg-background dashboard-theme md:pl-20">
      <DataRail />

      {/* Full-bleed workspace — uses the entire canvas to the right of the rail */}
      <main className="px-4 md:px-8 py-5 pb-20 md:pb-10 w-full">
        <header className="mb-4">
          <h1 className="text-[15px] font-semibold tracking-tight text-foreground leading-tight">
            {title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </header>

        {tab === "bank" ? <BankStatementsTabsView /> : <InvestmentTabsView />}
      </main>
    </div>
  );
}
