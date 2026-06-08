import { useInView } from "@/hooks/useInView";

/* ── Tiny browser chrome wrapper ──────────────────────────────────────────── */
function Browser({
  rotate = 0,
  delay = 0,
  children,
}: {
  rotate?: number;
  delay?: number;
  children: React.ReactNode;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.2);
  return (
    <div
      ref={ref}
      className="rounded-2xl overflow-hidden shadow-[0_30px_80px_-10px_rgba(0,0,0,0.35)] transition-all duration-700 ease-out will-change-transform"
      style={{
        transform: inView
          ? `rotate(${rotate}deg) translateY(0) scale(1)`
          : `rotate(${rotate}deg) translateY(40px) scale(0.95)`,
        opacity: inView ? 1 : 0,
        transitionDelay: `${delay}ms`,
      }}
    >
      {/* Chrome bar */}
      <div className="bg-[#e8e8e8] px-3 py-2 flex items-center gap-2">
        <div className="flex gap-1.5 shrink-0">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 bg-white rounded-md px-3 py-1 text-[10px] text-[#9ca3af] truncate">
          app.pocket.com
        </div>
      </div>
      {/* Screen */}
      <div className="bg-white">{children}</div>
    </div>
  );
}

/* ── Screen contents ───────────────────────────────────────────────────────── */

function DashboardScreen() {
  const bars = [35, 55, 42, 70, 52, 88, 65, 78, 48, 60, 72, 95];
  return (
    <div className="p-4 space-y-3 bg-[#f9fafb] min-h-[280px]">
      {/* Top stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Balance", value: "€4,280", color: "#080808" },
          { label: "Income", value: "+€5.200", color: "#16a34a" },
          { label: "Expenses", value: "−€919", color: "#dc2626" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-3 shadow-sm">
            <div className="text-[9px] text-[#9ca3af] mb-1">{s.label}</div>
            <div className="text-sm font-black" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      {/* Savings rate */}
      <div className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between">
        <div>
          <div className="text-[9px] text-[#9ca3af]">Savings rate</div>
          <div className="text-lg font-black text-[#1b76ff]">38%</div>
        </div>
        <div className="w-14 h-14 rounded-full border-4 border-[#1b76ff] border-r-[#e5e5e5] rotate-[45deg]" />
      </div>
      {/* Bar chart */}
      <div className="bg-white rounded-xl p-3 shadow-sm">
        <div className="text-[9px] text-[#9ca3af] mb-2">Daily spending — March</div>
        <div className="flex items-end gap-0.5 h-12">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t"
              style={{ height: `${h}%`, background: i === 11 ? "#FFBB03" : "#1b76ff", opacity: 0.6 + (i / bars.length) * 0.4 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TransactionsScreen() {
  const rows = [
    { name: "Mercadona", cat: "Groceries", amount: "−€92,40", dot: "#16a34a" },
    { name: "Salary", cat: "Income", amount: "+€3.200", dot: "#1b76ff" },
    { name: "Cabify", cat: "Transport", amount: "−€14,20", dot: "#f97316" },
    { name: "Netflix", cat: "Subscriptions", amount: "−€15,99", dot: "#dc2626" },
    { name: "Decathlon", cat: "Sports", amount: "−€68,00", dot: "#7c3aed" },
    { name: "Zara", cat: "Shopping", amount: "−€45,90", dot: "#db2777" },
  ];
  return (
    <div className="bg-white min-h-[280px]">
      <div className="px-4 py-3 border-b border-[#f0f0f0]">
        <div className="text-[10px] font-bold text-[#080808]">Transactions · March</div>
      </div>
      <div className="divide-y divide-[#f5f5f5]">
        {rows.map((r) => (
          <div key={r.name} className="px-4 py-2.5 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.dot }} />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold text-[#080808] truncate">{r.name}</div>
              <div className="text-[9px] text-[#9ca3af]">{r.cat}</div>
            </div>
            <div className="text-[10px] font-bold text-[#080808] shrink-0">{r.amount}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InvestmentsScreen() {
  const assets = [
    { name: "ETF MSCI World", pct: "+12.4%", value: "€14.200", w: 58, color: "#1b76ff" },
    { name: "S&P 500", pct: "+9.1%", value: "€8.600", w: 35, color: "#FFBB03" },
    { name: "Cash", pct: "+0.8%", value: "€2.000", w: 7, color: "#080808" },
  ];
  return (
    <div className="p-4 bg-[#f9fafb] min-h-[280px] space-y-3">
      <div className="bg-white rounded-xl p-3 shadow-sm">
        <div className="text-[9px] text-[#9ca3af]">Total portfolio</div>
        <div className="text-xl font-black text-[#080808]">€24,800</div>
        <div className="text-[9px] text-[#16a34a] font-semibold mt-0.5">↑ +4.2% this year</div>
      </div>
      {/* Stacked bar */}
      <div className="bg-white rounded-xl p-3 shadow-sm">
        <div className="text-[9px] text-[#9ca3af] mb-2">Asset allocation</div>
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
          {assets.map((a) => (
            <div key={a.name} className="rounded-full" style={{ width: `${a.w}%`, background: a.color }} />
          ))}
        </div>
      </div>
      {assets.map((a) => (
        <div key={a.name} className="bg-white rounded-xl px-3 py-2.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold text-[#080808]">{a.name}</div>
            <div className="text-[9px] font-bold text-[#16a34a]">{a.pct}</div>
          </div>
          <div className="text-[11px] font-black text-[#080808]">{a.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Section ───────────────────────────────────────────────────────────────── */

export function AppShowcaseSection() {
  return (
    <section
      data-nav-theme="light"
      className="relative overflow-hidden py-24 lg:py-36"
      style={{ background: "#FFBB03" }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-12 left-12 w-5 h-5 rounded-full bg-[#080808]/20" />
      <div className="absolute bottom-16 right-20 w-8 h-8 rounded-full bg-white/40" />
      <div className="absolute top-1/2 left-8 w-3 h-3 rounded-full bg-[#1b76ff]/40" />

      <div className="container px-6">
        {/* Label */}
        <p className="text-[10px] font-black tracking-[0.3em] text-[#080808]/50 mb-6 uppercase">
          What you get
        </p>

        {/* 3 browser mockups */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-4 items-end">
          <Browser rotate={-4} delay={0}>
            <DashboardScreen />
          </Browser>
          <Browser rotate={1} delay={120}>
            <TransactionsScreen />
          </Browser>
          <Browser rotate={5} delay={240}>
            <InvestmentsScreen />
          </Browser>
        </div>

        {/* Labels below */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
          {[
            { title: "Dashboard", sub: "Balance, savings rate and daily spending — at a glance." },
            { title: "Transactions", sub: "Every movement categorized. No manual work." },
            { title: "Investments", sub: "Your portfolio, tracked and compared." },
          ].map((item, i) => (
            <div key={item.title} className="text-[#080808]">
              <div className="font-black text-lg uppercase leading-tight">{item.title}</div>
              <div className="text-sm text-[#080808]/60 mt-1">{item.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
