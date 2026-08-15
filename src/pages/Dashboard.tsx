import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardFooter } from "@/components/layout/DashboardFooter";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { MonthTab } from "@/components/dashboard/MonthTab";
import { WeekTab } from "@/components/dashboard/WeekTab";
import { YearTab } from "@/components/dashboard/YearTab";
import { HistoryTab } from "@/components/dashboard/HistoryTab";

const TAB_KEYS = ["month", "week", "year", "history"] as const;
type TabKey = (typeof TAB_KEYS)[number];

/**
 * The dashboard's 4 tabs (month / week / year / history), switched via `?tab=` — the tab
 * switcher itself lives in the header's SecondaryNavBar, not here; this `<Tabs>` only owns
 * URL-synced content switching, following the same `?tab=` convention as `Account.tsx`.
 */
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
    </DashboardLayout>
  );
}
