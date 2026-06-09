import { useInView } from "@/hooks/useInView";

/* ── Floating card wrapper ─────────────────────────────────────────────────── */
function FloatingCard({
  children,
  className,
  delay = 0,
  from = "bottom",
}: {
  children: React.ReactNode;
  className: string;
  delay?: number;
  from?: "bottom" | "left" | "right";
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.05);
  const initial =
    from === "left" ? "translateX(-28px)" : from === "right" ? "translateX(28px)" : "translateY(28px)";

  return (
    <div
      ref={ref}
      className={`absolute ${className} bg-white rounded-2xl shadow-[0_8px_40px_-8px_rgba(0,0,0,0.15)] transition-all duration-700 ease-out`}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translate(0)" : initial,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Browser frame ─────────────────────────────────────────────────────────── */
function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-[0_40px_120px_-20px_rgba(0,0,0,0.18)] border border-black/[0.06]">
      <div className="bg-[#efefef] px-4 py-2.5 flex items-center gap-2">
        <div className="flex gap-1.5 shrink-0">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 bg-white/80 rounded-md px-3 py-1 text-[10px] text-[#9ca3af]">
          app.pocket.com/dashboard
        </div>
      </div>
      <div className="bg-[#f8f9fb]">{children}</div>
    </div>
  );
}

/* ── Dashboard screen inside the browser ──────────────────────────────────── */
function DashboardPreview() {
  const bars = [30, 52, 38, 66, 50, 84, 62, 76, 44, 58, 70, 96];
  return (
    <div className="p-5 space-y-3">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: "Balance", value: "€4,280", color: "#080808" },
          { label: "Income", value: "+€5.200", color: "#16a34a" },
          { label: "Expenses", value: "−€919", color: "#dc2626" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-3 shadow-sm">
            <div className="text-[8px] text-[#9ca3af] mb-1 font-medium uppercase tracking-wider">{s.label}</div>
            <div className="text-sm font-black" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="text-[8px] text-[#9ca3af] mb-3 font-medium">Daily spending — March</div>
        <div className="flex items-end gap-0.5 h-14">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t"
              style={{
                height: `${h}%`,
                background: i === 11 ? "#FFBB03" : "#1b76ff",
                opacity: 0.4 + (i / bars.length) * 0.6,
              }}
            />
          ))}
        </div>
      </div>

      {/* Transaction list */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        {[
          { name: "Mercadona", cat: "Groceries", amount: "−€92,40", dot: "#16a34a" },
          { name: "Salary", cat: "Income", amount: "+€3.200", dot: "#1b76ff" },
          { name: "Cabify", cat: "Transport", amount: "−€14,20", dot: "#f97316" },
          { name: "Netflix", cat: "Subscriptions", amount: "−€15,99", dot: "#dc2626" },
        ].map((r) => (
          <div key={r.name} className="px-4 py-2.5 flex items-center gap-3 border-b border-[#f5f5f5] last:border-0">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.dot }} />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold text-[#080808] truncate">{r.name}</div>
              <div className="text-[9px] text-[#9ca3af]">{r.cat}</div>
            </div>
            <div className="text-[10px] font-bold text-[#080808]">{r.amount}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Section ───────────────────────────────────────────────────────────────── */
export function AppShowcaseSection() {
  const { ref, inView } = useInView<HTMLElement>(0.1);

  return (
    <section
      ref={ref}
      data-nav-theme="light"
      className="relative bg-white overflow-hidden py-32 lg:py-52"
      style={{
        borderRadius: "2rem 2rem 0 0",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div className="container px-6">
        {/* Headline */}
        <h2
          className="font-black uppercase leading-[0.9] tracking-tight text-[#080808] mb-20 lg:mb-32"
          style={{ fontSize: "clamp(2.5rem, 7vw, 6.5rem)" }}
        >
          Your finances,
          <br />
          <span style={{ color: "#1b76ff" }}>crystal clear.</span>
        </h2>

        {/* Mockup + floating cards */}
        <div className="relative mx-auto lg:px-32" style={{ maxWidth: 900 }}>

          {/* ── Floating cards (desktop only) ── */}

          {/* Balance — top left */}
          <FloatingCard
            className="-top-10 left-0 lg:-left-8 z-20 hidden lg:block"
            delay={300}
            from="left"
          >
            <div className="px-5 py-4 min-w-[170px]">
              <div className="text-[9px] text-[#9ca3af] font-medium uppercase tracking-wider mb-1">Balance</div>
              <div className="text-2xl font-black text-[#080808]">€4,280</div>
              <div className="text-[9px] text-[#16a34a] font-semibold mt-0.5">↑ +8.4% este mes</div>
            </div>
          </FloatingCard>

          {/* Salary income — top right */}
          <FloatingCard
            className="-top-10 right-0 lg:-right-8 z-20 hidden lg:block"
            delay={420}
            from="right"
          >
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1b76ff]/10 flex items-center justify-center shrink-0">
                <div className="w-3 h-3 rounded-full bg-[#1b76ff]" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#080808]">Salary</div>
                <div className="text-[9px] text-[#9ca3af]">Income · March</div>
              </div>
              <div className="text-[12px] font-black text-[#16a34a] ml-1">+€3.200</div>
            </div>
          </FloatingCard>

          {/* Top categories — bottom left */}
          <FloatingCard
            className="-bottom-10 left-0 lg:-left-8 z-20 hidden lg:block"
            delay={540}
            from="left"
          >
            <div className="px-5 py-4 min-w-[190px]">
              <div className="text-[9px] text-[#9ca3af] font-medium uppercase tracking-wider mb-3">Top categories</div>
              {[
                { cat: "Groceries", pct: 42, color: "#16a34a" },
                { cat: "Transport", pct: 28, color: "#1b76ff" },
                { cat: "Housing", pct: 18, color: "#f97316" },
              ].map((c) => (
                <div key={c.cat} className="mb-2">
                  <div className="flex justify-between text-[9px] mb-1">
                    <span className="text-[#080808] font-semibold">{c.cat}</span>
                    <span className="text-[#9ca3af]">{c.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }} />
                  </div>
                </div>
              ))}
            </div>
          </FloatingCard>

          {/* Savings rate — bottom right */}
          <FloatingCard
            className="-bottom-10 right-0 lg:-right-8 z-20 hidden lg:block"
            delay={660}
            from="right"
          >
            <div className="px-5 py-4 text-center">
              <div className="text-[9px] text-[#9ca3af] font-medium uppercase tracking-wider mb-1">Savings rate</div>
              <div className="text-3xl font-black text-[#1b76ff]">38%</div>
              <div className="text-[9px] text-[#080808]/40 mt-0.5">of monthly income</div>
            </div>
          </FloatingCard>

          {/* ── Central browser mockup ── */}
          <div
            className="relative z-10"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0) scale(1)" : "translateY(48px) scale(0.96)",
              transition: "opacity 0.9s ease-out, transform 0.9s ease-out",
              transitionDelay: "100ms",
            }}
          >
            <BrowserFrame>
              <DashboardPreview />
            </BrowserFrame>
          </div>
        </div>
      </div>
    </section>
  );
}
