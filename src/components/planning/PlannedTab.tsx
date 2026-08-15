import { CalendarClock } from "lucide-react";
import { PlanningSectionPreview } from "./PlanningSectionPreview";

export function PlannedTab() {
  return (
    <PlanningSectionPreview
      icon={<CalendarClock className="w-5 h-5" />}
      title="Planned payments"
      subtitle="Schedule and track upcoming expenses"
      previewItems={[
        { label: "Rent", amount: "€850", date: "1st of each month" },
        { label: "Netflix", amount: "€17.99", date: "15th of each month" },
        { label: "Insurance", amount: "€124", date: "Quarterly" },
      ]}
      comingSoonNote="Set recurring expenses, get reminders before they hit, and see what's coming next month."
    />
  );
}
