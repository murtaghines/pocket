import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardFooter } from "@/components/layout/DashboardFooter";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { BalanceBand } from "@/components/layout/BalanceBand";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useDashboardDefaultTab, resolveDashboardTab, withDashboardTab } from "@/hooks/useDashboardTab";
import { MonthTab } from "@/components/dashboard/MonthTab";
import { WeekTab } from "@/components/dashboard/WeekTab";
import { YearTab } from "@/components/dashboard/YearTab";
import { HistoryTab } from "@/components/dashboard/HistoryTab";

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = useDashboardDefaultTab();
  // With no explicit tab, wait for preferences so a saved start screen doesn't flash the month view first.
  const { isLoading: prefsLoading } = useUserPreferences();
  const awaitingStartScreen = prefsLoading && !searchParams.get("tab");
  const activeTab = resolveDashboardTab(searchParams.get("tab"), defaultTab);

  const handleTabChange = (value: string) => {
    setSearchParams(withDashboardTab(searchParams, value, defaultTab), { replace: true });
  };

  return (
    <DashboardLayout>
      {/* Mobile: keep the old greeting/controls */}
      <div className="md:hidden px-3 pt-2">
        <DashboardGreeting />
      </div>

      {/* Single wrapper so BalanceBand's sticky has room to travel over all content */}
      <div className="relative z-20">
        <BalanceBand />

        {/* Content area with negative margin to overlap KPIs over the band */}
        <div className="px-3 md:px-[34px] md:mt-[-50px] pb-[24px]">
        {!awaitingStartScreen && (
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsContent value="month" className="mt-0">
            <MonthTab />
          </TabsContent>
          <TabsContent value="week" className="mt-0">
            <WeekTab />
          </TabsContent>
          <TabsContent value="year" className="mt-0">
            <YearTab />
          </TabsContent>
          <TabsContent value="history" className="mt-0">
            <HistoryTab />
          </TabsContent>
        </Tabs>
        )}
        <DashboardFooter />
        </div>
      </div>
    </DashboardLayout>
  );
}
