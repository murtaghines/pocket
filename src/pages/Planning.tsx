import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardFooter } from "@/components/layout/DashboardFooter";
import { PlannedTab } from "@/components/planning/PlannedTab";

export default function Planning() {
  return (
    <DashboardLayout>
      <div className="px-3 md:px-[34px]">
        <PlannedTab />
      </div>
      <DashboardFooter />
    </DashboardLayout>
  );
}
