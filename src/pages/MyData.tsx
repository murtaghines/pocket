import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { BankStatementsTabsView } from "@/components/imports/BankStatementsTabsView";
import { InvestmentTabsView } from "@/components/imports/InvestmentTabsView";

type Tab = "bank" | "investments";

/**
 * MyData — full-screen workspace. Navigation is the shared top pill (TopNav) in a slim bar;
 * the sub-section switch (bank / investments) lives inside the tabs view, keeping the rest of
 * the canvas edge-to-edge for the spreadsheet.
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
      <AppHeader title={t("navigation.data", "Data")} showSelectors={false} />

      {/* Full-bleed workspace — white canvas. Header (title + actions) lives inside the
          tabs view so it can render on the same row as the "Add file" button. */}
      <main className="w-full bg-card min-h-screen pb-20 md:pb-0">
        {tab === "bank" ? <BankStatementsTabsView /> : <InvestmentTabsView />}
      </main>

      <MobileBottomNav />
    </div>
  );
}
