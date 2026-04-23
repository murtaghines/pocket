import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BankStatementsTabsView } from "@/components/profile/BankStatementsTabsView";
import { InvestmentUploadsOrganizer } from "@/components/profile/InvestmentUploadsOrganizer";
import { FileSpreadsheet, TrendingUp } from "lucide-react";

type Tab = "bank" | "investments";

export default function MyData() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab");
  const tab: Tab = tabParam === "investments" ? "investments" : "bank";

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
        // Preserve tab, drop highlight params
        const next = highlightSection === "investment" ? "investments" : "bank";
        setSearchParams({ tab: next });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlightSection, highlightMonth, setSearchParams]);

  const title =
    tab === "bank"
      ? "Bank statements & expense reports"
      : "Investment statements & portfolio reports";
  const subtitle =
    tab === "bank"
      ? "Pick a month and edit transactions inline · Excel, CSV, PDF accepted"
      : "Upload portfolio snapshots per month · Excel, CSV, PDF accepted";
  const Icon = tab === "bank" ? FileSpreadsheet : TrendingUp;

  return (
    <DashboardLayout>
      <section className="max-w-[1600px] mx-auto">
        <header className="flex items-center gap-2 mb-4 px-1">
          <Icon className="w-5 h-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display text-lg md:text-xl font-bold tracking-tight text-foreground truncate">
              {title}
            </h1>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </header>

        {tab === "bank" ? (
          <BankStatementsTabsView />
        ) : (
          <InvestmentUploadsOrganizer />
        )}
      </section>
    </DashboardLayout>
  );
}
