import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { BankStatementsTabsView } from "@/components/imports/BankStatementsTabsView";
import { InvestmentTabsView } from "@/components/imports/InvestmentTabsView";
import type { DataTab } from "@/components/imports/DataSectionToggle";

/**
 * MyData — full-screen workspace ("Data uploads"). The shared AppHeader carries the pill nav; each
 * tabs view renders its own toolbar (Bank statements / Investments toggle + upload actions) as the
 * top row, keeping the rest of the canvas edge-to-edge for the spreadsheet.
 */
export default function MyData() {
  const { t } = useTranslation("common");
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab");
  const tab: DataTab = tabParam === "investments" ? "investments" : "bank";
  const setTab = (next: DataTab) => setSearchParams({ tab: next });

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
      <MobileNav />
      <AppHeader title={t("navigation.dataUploads", "Data uploads")} showSelectors={false} />

      <main className="w-full bg-card min-h-screen">
        {tab === "bank" ? (
          <BankStatementsTabsView tab={tab} onTabChange={setTab} />
        ) : (
          <InvestmentTabsView tab={tab} onTabChange={setTab} />
        )}
      </main>
    </div>
  );
}
