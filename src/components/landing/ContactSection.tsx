import { useEffect, useRef, useState } from "react";

/* ── Visuals ─────────────────────────────────────────────────────────────── */

function UploadVisual() {
  return (
    <div className="w-full max-w-[280px] space-y-2 mt-2">
      <div className="bg-white rounded-2xl border-2 border-dashed border-[#1b76ff]/30 p-5 text-center">
        <div className="w-10 h-10 rounded-xl bg-[#1b76ff]/10 mx-auto mb-3 flex items-center justify-center">
          <div className="w-5 h-0.5 bg-[#1b76ff] rounded" />
        </div>
        <div className="text-[11px] font-bold text-[#080808]">Drop your statement here</div>
        <div className="text-[9px] text-[#9ca3af] mt-1">PDF, CSV, Excel</div>
      </div>
      {[
        { name: "Enero_2025.pdf",  status: "Categorized",  color: "hsl(var(--success))" },
        { name: "Febrero_2025.pdf", status: "Categorized", color: "hsl(var(--success))" },
        { name: "Marzo_2025.pdf",  status: "Processing…",  color: "#1b76ff" },
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
    { name: "Groceries", pct: 42, amount: "€387" },
    { name: "Transport", pct: 28, amount: "€258" },
    { name: "Housing",   pct: 18, amount: "€166" },
    { name: "Leisure",   pct: 12, amount: "€110" },
  ];
  return (
    <div className="w-full max-w-[280px] space-y-3 mt-2">
      {cats.map((c, i) => (
        <div key={c.name}>
          <div className="flex justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-white">{c.name}</span>
            <span className="text-[11px] font-bold tabular-nums text-white/70">{c.amount}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${c.pct}%`, background: `rgba(255,255,255,${0.9 - i * 0.18})` }}
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
        <div className="text-2xl font-black text-white tabular-nums">€24,800</div>
        <div className="text-[10px] font-semibold mt-0.5" style={{ color: "hsl(var(--success))" }}>↑ +4.2% this year</div>
        <div className="flex items-end gap-0.5 h-10 mt-3">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: `rgba(255,255,255,${0.2 + (i / bars.length) * 0.5})` }} />
          ))}
        </div>
      </div>
      {[
        { name: "ETF MSCI World", pct: "+12.4%", val: "€14.200" },
        { name: "S&P 500",        pct: "+9.1%",  val: "€8.600"  },
      ].map((a) => (
        <div key={a.name} className="bg-white/5 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <div className="text-[10px] font-semibold text-white/80">{a.name}</div>
          <div>
            <div className="text-[9px] font-bold text-right" style={{ color: "hsl(var(--success))" }}>{a.pct}</div>
            <div className="text-[10px] font-black tabular-nums text-white">{a.val}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BudgetVisual() {
  const goals = [
    { name: "Emergency fund", current: 3200, target: 5000, color: "#1b76ff" },
    { name: "New laptop",     current: 850,  target: 1200, color: "#FFD027" },
    { name: "Vacation",       current: 1100, target: 2500, color: "hsl(var(--success))" },
  ];
  return (
    <div className="w-full max-w-[280px] space-y-2.5 mt-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-[#1b76ff] mb-1">
        Savings goals
      </div>
      {goals.map((g) => {
        const pct = Math.round((g.current / g.target) * 100);
        return (
          <div key={g.name} className="bg-[#f4f6fa] rounded-2xl p-4">
            <div className="flex justify-between mb-2">
              <span className="text-[10px] font-semibold text-[#080808]">{g.name}</span>
              <span className="text-[10px] font-bold tabular-nums text-[#080808]">{pct}%</span>
            </div>
            <div className="h-1.5 bg-black/[0.08] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: g.color }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[9px] tabular-nums text-[#9ca3af]">€{g.current.toLocaleString()}</span>
              <span className="text-[9px] tabular-nums text-[#9ca3af]">of €{g.target.toLocaleString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Card data ───────────────────────────────────────────────────────────── */

const CARDS = [
  {
    bg: "#ffffff",
    dark: false,
    title: "Upload. Done.",
    sub: "Import your bank statement and Pocket categorizes every transaction automatically — no manual work.",
    visual: <UploadVisual />,
  },
  {
    bg: "#1b76ff",
    dark: true,
    title: "See where it goes.",
    sub: "Know exactly which categories eat your money, every month.",
    visual: <CategoriesVisual />,
  },
  {
    bg: "#111111",
    dark: true,
    title: "Track your investments.",
    sub: "Add your portfolio and watch it grow alongside your savings.",
    visual: <InvestmentsVisual />,
  },
  {
    bg: "#ffffff",
    dark: false,
    title: "Plan ahead.",
    sub: "Set savings goals, track your progress, and stay ahead of what's coming.",
    visual: <BudgetVisual />,
  },
];

// Stacked-state offsets per grid position (% of card's own size).
// At progress=0 every card translates+rotates toward the center of the grid.
// At progress=1 all transforms are zero → natural grid layout.
const STACK = [
  { dx:  52, dy:  50, r: -6 }, // top-left   → moves right + down to stack center
  { dx: -52, dy:  50, r:  5 }, // top-right  → moves left  + down
  { dx:  52, dy: -50, r: -3 }, // bottom-left → moves right + up
  { dx: -52, dy: -50, r:  2 }, // bottom-right (visible on top) → moves left + up
];

/* ── Section ─────────────────────────────────────────────────────────────── */
export function ContactSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0); // 0 = stacked, 1 = spread
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!isDesktop) { setProgress(1); return; }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setProgress(1); return; }

    let frame = 0;
    const update = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const scrolled = Math.max(0, -rect.top);
      setProgress(scrollable > 0 ? Math.min(1, scrolled / scrollable) : 1);
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [isDesktop]);

  // Ease-in-out curve
  const p = progress < 0.5
    ? 2 * progress * progress
    : -1 + (4 - 2 * progress) * progress;

  return (
    <div
      ref={sectionRef}
      data-nav-theme="dark"
      style={{ height: isDesktop ? "280vh" : "auto" }}
    >
      <div
        className="bg-[#080808]"
        style={{
          position: isDesktop ? "sticky" : "relative",
          top: 0,
          height: isDesktop ? "100vh" : "auto",
          overflow: "hidden",
        }}
      >
        <div
          className="h-full flex flex-col justify-center"
          style={{ padding: "clamp(2rem, 5vw, 4rem) clamp(1.5rem, 6vw, 5rem)" }}
        >
          {/* Section headline */}
          <h2
            className="font-heading font-bold text-white uppercase leading-[0.9] tracking-tight mb-8 lg:mb-10"
            style={{ fontSize: "clamp(2.25rem, 5.5vw, 5.5rem)" }}
          >
            Built for<br />
            <span style={{ color: "#1b76ff" }}>real life.</span>
          </h2>

          {/* 2×2 card grid — cards fan out from stacked as scroll progresses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
            {CARDS.map((card, i) => {
              const s = STACK[i];
              const tx = s.dx * (1 - p);
              const ty = s.dy * (1 - p);
              const rot = s.r  * (1 - p);

              return (
                <div
                  key={i}
                  style={{
                    transform: `translate(${tx}%, ${ty}%) rotate(${rot}deg)`,
                    zIndex: i + 1,
                    willChange: "transform",
                  }}
                >
                  {/* Card */}
                  <div
                    className="rounded-3xl overflow-hidden flex flex-col justify-between"
                    style={{
                      background: card.bg,
                      minHeight: "clamp(240px, 28vh, 340px)",
                    }}
                  >
                    {/* Visual */}
                    <div className="flex-1 px-6 pt-6 lg:px-8 lg:pt-8 flex items-start justify-center overflow-hidden">
                      {card.visual}
                    </div>

                    {/* Text */}
                    <div className="p-6 lg:p-8 pt-4">
                      <h3
                        className="font-black leading-tight mb-1.5"
                        style={{
                          fontSize: "clamp(1.1rem, 2.2vw, 1.6rem)",
                          color: card.dark ? "#ffffff" : "#080808",
                        }}
                      >
                        {card.title}
                      </h3>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: card.dark ? "rgba(255,255,255,0.55)" : "rgba(8,8,8,0.5)" }}
                      >
                        {card.sub}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
