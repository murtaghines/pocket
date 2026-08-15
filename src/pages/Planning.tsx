import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardFooter } from "@/components/layout/DashboardFooter";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PlannedTab } from "@/components/planning/PlannedTab";
import { BudgetsTab } from "@/components/planning/BudgetsTab";

const TAB_KEYS = ["planned", "budgets"] as const;
type TabKey = (typeof TAB_KEYS)[number];

export default function Planning() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") ?? "planned";
  const activeTab: TabKey = (TAB_KEYS as readonly string[]).includes(rawTab) ? (rawTab as TabKey) : "planned";

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "planned") next.delete("tab");
    else next.set("tab", value);
    setSearchParams(next, { replace: true });
  };

  return (
    <DashboardLayout>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsContent value="planned" className="mt-0">
          <PlannedTab />
        </TabsContent>
        <TabsContent value="budgets" className="mt-0">
          <BudgetsTab />
        </TabsContent>
      </Tabs>
      <DashboardFooter />
    </DashboardLayout>
  );
}
