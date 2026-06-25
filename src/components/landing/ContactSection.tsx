import { useInView } from "@/hooks/useInView";

/* ── Individual bento card ─────────────────────────────────────────────────── */
function BentoCard({
  bg,
  title,
  sub,
  delay = 0,
  children,
  tall = false,
}: {
  bg: string;
  title: string;
  sub: string;
  delay?: number;
  children: React.ReactNode;
  tall?: boolean;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.1);
  const isDark = bg === "#1b76ff" || bg === "#080808" || bg === "#0a0a0a";

  return (
    <div
      ref={ref}
      className={`rounded-3xl overflow-hidden flex flex-col justify-between transition-all duration-700 ease-out ${tall ? "min-h-[420px] lg:min-h-[480px]" : "min-h-[340px] lg:min-h-[380px]"}`}
      style={{
        background: bg,
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(32px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {/* Visual area */}
      <div className="flex-1 p-6 lg:p-8 flex items-start justify-center overflow-hidden">
        {children}
      </div>

      {/* Text area */}
      <div className="p-6 lg:p-8 pt-0">
        <h3
          className="font-black leading-tight mb-2"
          style={{
            fontSize: "clamp(1.4rem, 3vw, 2rem)",
            color: isDark ? "#ffffff" : "#080808",
          }}
        >
          {title}
        </h3>
        <p
          className="text-sm leading-relaxed"
          style={{ color: isDark ? "rgba(255,255,255,0.55)" : "rgba(8,8,8,0.5)" }}
        >
          {sub}
        </p>
      </div>
    </div>
  );
}

/* ── Mini visuals for each card ────────────────────────────────────────────── */

function UploadVisual() {
  return (
    <div className="w-full max-w-[280px] space-y-2 mt-2">
      {/* Upload area */}
      <div className="bg-white rounded-2xl border-2 border-dashed border-[#1b76ff]/30 p-5 text-center">
        <div className="w-10 h-10 rounded-xl bg-[#1b76ff]/10 mx-auto mb-3 flex items-center justify-center">
          <div className="w-5 h-0.5 bg-[#1b76ff] rounded" />
        </div>
        <div className="text-[11px] font-bold text-[#080808]">Drop your statement here</div>
        <div className="text-[9px] text-[#9ca3af] mt-1">PDF, CSV, Excel</div>
      </div>

      {/* Progress / result rows */}
      {[
        { name: "Enero_2025.pdf", status: "Categorized", color: "hsl(var(--success))" },
        { name: "Febrero_2025.pdf", status: "Categorized", color: "hsl(var(--success))" },
        { name: "Marzo_2025.pdf", status: "Processing...", color: "#1b76ff" },
      ].map((f) => (
        <div key={f.name} className="bg-white rounded-xl px-4 py-2.5 flex items-center justify-between shadow-sm">
          <div className="text-[9px] font-semibold text-[#080808]">{f.name}</div>
          <div className="text-[9px] font-bold" style={{ color: f.color }}>{f.status}</div>
        </div>
      ))}
    </div>
  );
}

function CategoriesVisual() {
  const cats = [
    { name: "Groceries", pct: 42, amount: "€387", color: "rgba(255,255,255,0.9)" },
    { name: "Transport", pct: 28, amount: "€258", color: "rgba(255,255,255,0.75)" },
    { name: "Housing", pct: 18, amount: "€166", color: "rgba(255,255,255,0.6)" },
    { name: "Leisure", pct: 12, amount: "€110", color: "rgba(255,255,255,0.4)" },
  ];

  return (
    <div className="w-full max-w-[280px] space-y-3 mt-2">
      {cats.map((c) => (
        <div key={c.name}>
          <div className="flex justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-white">{c.name}</span>
            <span className="text-[11px] font-bold text-white/70">{c.amount}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${c.pct}%`, background: c.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function InvestmentsVisual() {
  const bars = [40, 55, 48, 70, 62, 80, 74, 90, 85, 96];
  return (
    <div className="w-full max-w-[280px] space-y-3 mt-2">
      <div className="bg-white/5 rounded-2xl p-4">
        <div className="text-[9px] text-white/40 mb-1 font-medium uppercase tracking-wider">Portfolio</div>
        <div className="text-2xl font-black text-white">€24,800</div>
        <div className="text-[10px] font-semibold mt-0.5" style={{ color: "hsl(var(--success))" }}>↑ +4.2% this year</div>

        <div className="flex items-end gap-0.5 h-10 mt-3">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t"
              style={{ height: `${h}%`, background: `rgba(255,255,255,${0.2 + (i / bars.length) * 0.5})` }}
            />
          ))}
        </div>
      </div>

      {[
        { name: "ETF MSCI World", pct: "+12.4%", val: "€14.200" },
        { name: "S&P 500", pct: "+9.1%", val: "€8.600" },
      ].map((a) => (
        <div key={a.name} className="bg-white/5 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <div className="text-[10px] font-semibold text-white/80">{a.name}</div>
          <div>
            <div className="text-[9px] font-bold text-right" style={{ color: "hsl(var(--success))" }}>{a.pct}</div>
            <div className="text-[10px] font-black text-white">{a.val}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Section ───────────────────────────────────────────────────────────────── */
export function ContactSection() {
  return (
    <section
      data-nav-theme="dark"
      className="bg-[#080808] py-32 lg:py-48"
    >
      <div className="container px-6">
        {/* Section headline */}
        <h2
          className="font-heading font-bold text-white uppercase leading-[0.9] tracking-tight mb-16 lg:mb-20"
          style={{ fontSize: "clamp(2.5rem, 7vw, 6.5rem)" }}
        >
          Built for<br />
          <span style={{ color: "#1b76ff" }}>real life.</span>
        </h2>

        {/* Bento grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 1: Upload & auto-categorize (white) */}
          <BentoCard
            bg="#ffffff"
            title="Upload. Done."
            sub="Import your bank statement and Pocket categorizes every transaction automatically — no manual work."
            delay={0}
          >
            <UploadVisual />
          </BentoCard>

          {/* Card 2: Categories (blue) */}
          <BentoCard
            bg="#1b76ff"
            title="See where it goes."
            sub="Know exactly which categories eat your money, every month."
            delay={120}
          >
            <CategoriesVisual />
          </BentoCard>
        </div>

        {/* Full-width bottom card: investments (dark) */}
        <div className="mt-4">
          <BentoCard
            bg="#111111"
            title="Track your investments."
            sub="Add your portfolio and watch it grow alongside your savings."
            delay={240}
          >
            <InvestmentsVisual />
          </BentoCard>
        </div>
      </div>
    </section>
  );
}
