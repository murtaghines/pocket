import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardFooter } from "@/components/layout/DashboardFooter";
import { InvestmentsBand } from "@/components/investments/InvestmentsBand";
import { PortfolioTab } from "@/components/investments/portfolio/PortfolioTab";
import { ActivityTab } from "@/components/investments/ActivityTab";
import { InvestmentAccountsManager } from "@/components/investments/InvestmentAccountsManager";
import { useInvestments } from "@/hooks/useInvestments";

export default function Investments() {
  const [searchParams] = useSearchParams();
  const { accounts } = useInvestments();

  const tab = searchParams.get("tab") ?? "portfolio";

  return (
    <DashboardLayout>
      {tab === "portfolio" && <InvestmentsBand />}
      <main className={`w-full px-3 md:px-[34px] ${tab === "portfolio" ? "md:mt-[-50px] relative z-10" : ""}`}>
        {tab === "portfolio" && <PortfolioTab />}
        {tab === "activity" && <ActivityTab />}
        {tab === "accounts" && <InvestmentAccountsManager accounts={accounts} />}
      </main>
      <DashboardFooter />
    </DashboardLayout>
  );
}
