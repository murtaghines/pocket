import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardFooter } from "@/components/layout/DashboardFooter";
import { BudgetsTab } from "@/components/planning/BudgetsTab";

export default function Budgets() {
  return (
    <DashboardLayout>
      <BudgetsTab />
      <DashboardFooter />
    </DashboardLayout>
  );
}
