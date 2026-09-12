import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardFooter } from "@/components/layout/DashboardFooter";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { BalanceBand } from "@/components/layout/BalanceBand";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { MonthTab } from "@/components/dashboard/MonthTab";
import { WeekTab } from "@/components/dashboard/WeekTab";
import { YearTab } from "@/components/dashboard/YearTab";
import { HistoryTab } from "@/components/dashboard/HistoryTab";

const TAB_KEYS = ["month", "week", "year", "history"] as const;
type TabKey = (typeof TAB_KEYS)[number];

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") ?? "month";
  const activeTab: TabKey = (TAB_KEYS as readonly string[]).includes(rawTab) ? (rawTab as TabKey) : "month";

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "month") next.delete("tab");
    else next.set("tab", value);
    setSearchParams(next, { replace: true });
  };

  return (
    <DashboardLayout>
      {/* Mobile: keep the old greeting/controls */}
      <div className="md:hidden px-3 pt-2">
        <DashboardGreeting />
      </div>

      {/* Desktop: blue balance band */}
      <BalanceBand />

      {/* Content area with negative margin to overlap KPIs over the band */}
      <div className="px-3 md:px-[34px] md:mt-[-50px] pb-[32px]">
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
        <DashboardFooter />
      </div>
    </DashboardLayout>
  );
}
