import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardFooter } from "@/components/layout/DashboardFooter";
import { BudgetsTab } from "@/components/planning/BudgetsTab";

export default function Budgets() {
  return (
    <DashboardLayout>
      <div className="px-3 md:px-[34px]">
        <BudgetsTab />
      </div>
      <DashboardFooter />
    </DashboardLayout>
  );
}
