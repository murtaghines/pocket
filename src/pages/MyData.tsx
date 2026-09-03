import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BankStatementsTabsView } from "@/components/imports/BankStatementsTabsView";
import { InvestmentTabsView } from "@/components/imports/InvestmentTabsView";
import { CategoriesTab } from "@/components/imports/CategoriesTab";
import { useMonthSelection } from "@/hooks/usePeriodSelection";

export type DataTab = "bank" | "investments" | "categories";

/**
 * MyData — full-screen workspace ("Data" section: bank statements / investment files /
 * categories). The header's SecondaryNavBar drives the tab switch via `?tab=`; each view renders
 * its own toolbar/canvas edge-to-edge.
 */
export default function MyData() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedMonth, setSelectedMonth } = useMonthSelection();

  const tabParam = searchParams.get("tab");
  const tab: DataTab = tabParam === "investments" ? "investments" : tabParam === "categories" ? "categories" : "bank";

  const monthParam = searchParams.get("month");
  const activeMonth = monthParam ?? selectedMonth;

  const setMonth = (key: string) => {
    const params: Record<string, string> = { month: key };
    if (tab !== "bank") params.tab = tab;
    setSearchParams(params);
    setSelectedMonth(key);
  };

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
        setSearchParams({ tab: next, month: highlightMonth });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlightSection, highlightMonth, setSearchParams]);

  return (
    <DashboardLayout fullBleed>
      {tab === "bank" && <BankStatementsTabsView activeMonth={activeMonth} onMonthChange={setMonth} />}
      {tab === "investments" && <InvestmentTabsView activeMonth={activeMonth} onMonthChange={setMonth} />}
      {tab === "categories" && <CategoriesTab />}
    </DashboardLayout>
  );
}
