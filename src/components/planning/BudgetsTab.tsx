import { PiggyBank } from "lucide-react";
import { PlanningSectionPreview } from "./PlanningSectionPreview";

export function BudgetsTab() {
  return (
    <PlanningSectionPreview
      icon={<PiggyBank className="w-5 h-5" />}
      title="Budgets"
      subtitle="Set spending limits per category"
      previewItems={[
        { label: "Groceries", amount: "€400/mo", date: "68% used" },
        { label: "Dining out", amount: "€150/mo", date: "42% used" },
        { label: "Transport", amount: "€100/mo", date: "91% used" },
      ]}
      comingSoonNote="Assign monthly limits per category, track progress in real time, and spot overspending early."
    />
  );
}
