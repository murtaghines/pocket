import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DataRail } from "@/components/layout/DataRail";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
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

  return (
    <div className="min-h-screen bg-background dashboard-theme md:pl-[var(--rail-width,104px)] md:transition-[padding-left] md:duration-[220ms] md:ease-out">
      <DataRail />

      {/* Full-bleed workspace — true edge-to-edge, no padding, white canvas.
          Header (title + actions) lives inside the tabs view so it can render
          on the same row as the "Add file" button and source-files dropdown. */}
      <main className="w-full bg-card min-h-screen pb-20 md:pb-0">
        {tab === "bank" ? <BankStatementsTabsView /> : <InvestmentTabsView />}
      </main>

      <MobileBottomNav />
    </div>
  );
}
