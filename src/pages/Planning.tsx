import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardFooter } from "@/components/layout/DashboardFooter";
import { CalendarClock, PiggyBank, Bell } from "lucide-react";

export default function Planning() {
  return (
    <DashboardLayout>
      <div className="mb-6 md:hidden">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground leading-tight">
          Planning
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Plan upcoming payments and set budgets per category
        </p>
      </div>

      <div className="flex flex-col gap-[16px]">
        <Section
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
        <Section
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
      </div>
      <DashboardFooter />
    </DashboardLayout>
  );
}

function Section({
  icon,
  title,
  subtitle,
  previewItems,
  comingSoonNote,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  previewItems: { label: string; amount: string; date: string }[];
  comingSoonNote: string;
}) {
  return (
    <section className="bg-card rounded-2xl p-6 shadow-bento">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-semibold text-foreground leading-tight">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>

      <div className="border border-dashed border-border rounded-xl overflow-hidden">
        {/* Preview rows — blurred to hint at the future UI */}
        <div className="relative">
          <div className="divide-y divide-border/50 opacity-40 blur-[1px] select-none pointer-events-none">
            {previewItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground">{item.amount}</span>
              </div>
            ))}
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Bell className="w-4 h-4" />
              <span className="text-sm font-semibold">Coming soon</span>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed px-4">
              {comingSoonNote}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
