import { useInView } from "@/hooks/useInView";
import { TrendingUp, ShieldCheck, Sparkles } from "lucide-react";

/* ── Large browser mockup of the Pocket dashboard ─────────────────────────── */
function LargeDashboardMockup() {
  const bars = [30, 50, 38, 65, 48, 82, 60, 74, 44, 58, 70, 92];

  return (
    <div className="rounded-2xl overflow-hidden shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)]">
      {/* Browser bar */}
      <div className="bg-[#1a1a1a] px-4 py-2.5 flex items-center gap-3">
        <div className="flex gap-1.5 shrink-0">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 bg-[#2a2a2a] rounded-md px-3 py-1.5 text-[10px] text-[#555]">
          app.pocket.com/dashboard
        </div>
      </div>

      {/* App chrome: sidebar + main */}
      <div className="flex bg-[#fafafa]" style={{ minHeight: 360 }}>
        {/* Sidebar */}
        <div className="w-14 bg-white border-r border-[#f0f0f0] flex flex-col items-center py-4 gap-4 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#1b76ff] flex items-center justify-center">
            <div className="w-4 h-4 rounded bg-white/30" />
          </div>
          {["#1b76ff", "#FFBB03", "#080808", "#e5e5e5"].map((c, i) => (
            <div key={i} className="w-6 h-6 rounded-md" style={{ background: c, opacity: i > 1 ? 0.3 : 1 }} />
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 space-y-3 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[9px] text-[#9ca3af]">March 2025</div>
              <div className="text-base font-black text-[#080808]">Dashboard</div>
            </div>
            <div className="bg-[#1b76ff] text-white text-[9px] font-bold px-3 py-1.5 rounded-full">
              Upload
            </div>
          </div>

          {/* Stat cards row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Balance", value: "€4,280", color: "#080808" },
              { label: "Income", value: "+€5.200", color: "#16a34a" },
              { label: "Expenses", value: "−€919", color: "#dc2626" },
              { label: "Savings", value: "38%", color: "#1b76ff" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-3 shadow-sm">
                <div className="text-[8px] text-[#9ca3af] mb-0.5">{s.label}</div>
                <div className="text-xs font-black" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Chart + transactions */}
          <div className="grid grid-cols-5 gap-2">
            {/* Chart */}
            <div className="col-span-3 bg-white rounded-xl p-3 shadow-sm">
              <div className="text-[8px] text-[#9ca3af] mb-2">Daily spending</div>
              <div className="flex items-end gap-0.5 h-16">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t"
                    style={{ height: `${h}%`, background: i === 11 ? "#FFBB03" : "#1b76ff", opacity: 0.5 + (i / bars.length) * 0.5 }}
                  />
                ))}
              </div>
            </div>
            {/* Top categories */}
            <div className="col-span-2 bg-white rounded-xl p-3 shadow-sm">
              <div className="text-[8px] text-[#9ca3af] mb-2">Top categories</div>
              <div className="space-y-1.5">
                {[
                  { cat: "Groceries", pct: 42, color: "#16a34a" },
                  { cat: "Transport", pct: 28, color: "#1b76ff" },
                  { cat: "Housing", pct: 18, color: "#f97316" },
                ].map((c) => (
                  <div key={c.cat}>
                    <div className="flex justify-between text-[8px]">
                      <span className="text-[#080808]">{c.cat}</span>
                      <span className="text-[#9ca3af]">{c.pct}%</span>
                    </div>
                    <div className="h-1 bg-[#f0f0f0] rounded-full overflow-hidden mt-0.5">
                      <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Accounts row */}
          <div className="flex gap-2">
            {[
              { bank: "BBVA", bal: "€2,480", color: "#1b76ff" },
              { bank: "N26", bal: "€8,120", color: "#080808" },
              { bank: "Sabadell", bal: "€950", color: "#FFBB03", dark: true },
            ].map((a) => (
              <div
                key={a.bank}
                className="flex-1 rounded-xl p-2.5 shadow-sm text-white flex flex-col gap-1"
                style={{ background: a.color }}
              >
                <div className="text-[8px] font-bold" style={{ color: a.dark ? "#080808" : "rgba(255,255,255,0.7)" }}>{a.bank}</div>
                <div className="text-xs font-black" style={{ color: a.dark ? "#080808" : "white" }}>{a.bal}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Floating feature chips ────────────────────────────────────────────────── */
function FeatureChip({
  icon: Icon,
  text,
  accent,
  className,
  delay,
}: {
  icon: React.ElementType;
  text: string;
  accent: string;
  className: string;
  delay: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.2);
  return (
    <div
      ref={ref}
      className={`absolute ${className} bg-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 transition-all duration-700 ease-out`}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0) scale(1)" : "translateY(16px) scale(0.95)",
        transitionDelay: `${delay}ms`,
      }}
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}18` }}>
        <Icon className="w-4 h-4" style={{ color: accent }} strokeWidth={2} />
      </div>
      <span className="text-sm font-bold text-[#080808] whitespace-nowrap">{text}</span>
    </div>
  );
}

/* ── Section ───────────────────────────────────────────────────────────────── */
export function ContactSection() {
  return (
    <section
      data-nav-theme="dark"
      className="relative py-32 lg:py-48 overflow-hidden"
      style={{ background: "#080808" }}
    >
      <div className="container px-6 relative z-10">
        {/* Headline — minimal, top of section */}
        <h2
          className="font-black text-white uppercase leading-[0.9] tracking-tight mb-20 lg:mb-28"
          style={{ fontSize: "clamp(2.5rem, 7vw, 6rem)" }}
        >
          See everything<br />
          <span style={{ color: "#1b76ff" }}>clearly.</span>
        </h2>

        {/* Browser mockup — large, centered */}
        <div className="relative max-w-4xl mx-auto">
          <LargeDashboardMockup />

          {/* Floating chips */}
          <FeatureChip
            icon={Sparkles}
            text="AI categorization"
            accent="#1b76ff"
            className="-left-8 top-24 hidden lg:flex"
            delay={200}
          />
          <FeatureChip
            icon={TrendingUp}
            text="Track investments"
            accent="#1b76ff"
            className="-right-8 top-32 hidden lg:flex"
            delay={350}
          />
          <FeatureChip
            icon={ShieldCheck}
            text="Privacy first"
            accent="#1b76ff"
            className="-left-8 bottom-24 hidden lg:flex"
            delay={500}
          />
        </div>
      </div>
    </section>
  );
}
