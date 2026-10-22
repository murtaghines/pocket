import { useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BankStatementsTabsView } from "@/components/imports/BankStatementsTabsView";
import { InvestmentTabsView } from "@/components/imports/InvestmentTabsView";
import { CategoriesTab } from "@/components/imports/CategoriesTab";
import { useMonthSelection } from "@/hooks/usePeriodSelection";

export type DataTab = "transactions" | "investments" | "categories";

/**
 * MyData — full-screen workspace ("Data" section: transactions / investment files /
 * categories & rules). The header's SecondaryNavBar drives the tab switch via `?tab=`;
 * each view renders its own toolbar/canvas edge-to-edge.
 */
export default function MyData() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedMonth, setSelectedMonth } = useMonthSelection();

  const tabParam = searchParams.get("tab");
  const tab: DataTab =
    tabParam === "investments" ? "investments"
    : tabParam === "categories" ? "categories"
    : "transactions";

  const monthParam = searchParams.get("month");
  const activeMonth = monthParam ?? selectedMonth;

  const setMonth = (key: string) => {
    const params: Record<string, string> = { month: key };
    if (tab !== "transactions") params.tab = tab;
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
        const next = highlightSection === "investment" ? "investments" : "transactions";
        setSearchParams({ tab: next, month: highlightMonth });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlightSection, highlightMonth, setSearchParams]);

  // Only the transactions workspace renders its own edge-to-edge canvas with an internal
  // (flex-1/min-h-0) scroll container on both desktop and mobile. Investments' desktop table
  // scrolls via its own max-h and its mobile list has no scroll wrapper of its own, and
  // categories/accounts are normal padded pages — all three need the document itself to
  // scroll, so they must NOT be fullBleed (fullBleed locks document scroll via
  // DashboardLayout, which would trap their content below the first viewport on mobile with
  // no way to reach it).
  const isFullBleedTab = tab === "transactions" || tab === "categories";

  // Accounts moved to /account; keep old deep links working.
  if (tabParam === "accounts") return <Navigate to="/account?tab=accounts" replace />;

  return (
    <DashboardLayout fullBleed={isFullBleedTab}>
      {tab === "transactions" && <BankStatementsTabsView activeMonth={activeMonth} onMonthChange={setMonth} />}
      {tab === "investments" && <InvestmentTabsView activeMonth={activeMonth} onMonthChange={setMonth} />}
      {tab === "categories" && <CategoriesTab />}
    </DashboardLayout>
  );
}
