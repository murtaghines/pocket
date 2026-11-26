import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardFooter } from "@/components/layout/DashboardFooter";
import { PortfolioTab } from "@/components/investments/portfolio/PortfolioTab";
import { ActivityTab } from "@/components/investments/ActivityTab";

export default function Investments() {
  const [searchParams] = useSearchParams();

  const tab = searchParams.get("tab") ?? "portfolio";

  return (
    <DashboardLayout>
      <main className="w-full px-3 md:px-[34px]">
        {tab === "portfolio" && <PortfolioTab />}
        {tab === "activity" && <ActivityTab />}
      </main>
      <DashboardFooter />
    </DashboardLayout>
  );
}
