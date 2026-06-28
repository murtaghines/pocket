import { useEffect, useRef, useState } from "react";

/* ── Visuals ─────────────────────────────────────────────────────────────── */

function UploadVisual() {
  return (
    <div className="w-full max-w-[260px] space-y-2">
      <div className="bg-white rounded-2xl border-2 border-dashed border-[#1b76ff]/30 p-4 text-center">
        <div className="w-8 h-8 rounded-xl bg-[#1b76ff]/10 mx-auto mb-2 flex items-center justify-center">
          <div className="w-4 h-0.5 bg-[#1b76ff] rounded" />
        </div>
        <div className="text-[10px] font-bold text-[#080808]">Drop your statement here</div>
        <div className="text-[8px] text-[#9ca3af] mt-0.5">PDF, CSV, Excel</div>
      </div>
      {[
        { name: "Enero_2025.pdf",   status: "Categorized",  color: "hsl(var(--success))" },
        { name: "Febrero_2025.pdf", status: "Categorized",  color: "hsl(var(--success))" },
        { name: "Marzo_2025.pdf",   status: "Processing…",  color: "#1b76ff" },
      ].map((f) => (
        <div key={f.name} className="bg-white rounded-xl px-3 py-2 flex items-center justify-between shadow-sm">
          <div className="text-[8px] font-semibold text-[#080808]">{f.name}</div>
          <div className="text-[8px] font-bold" style={{ color: f.color }}>{f.status}</div>
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
    <div className="w-full max-w-[260px] space-y-2.5">
      {cats.map((c, i) => (
        <div key={c.name}>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] font-semibold text-white">{c.name}</span>
            <span className="text-[10px] font-bold tabular-nums text-white/70">{c.amount}</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: `rgba(255,255,255,${0.9 - i * 0.18})` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function InvestmentsVisual() {
  const bars = [40, 55, 48, 70, 62, 80, 74, 90, 85, 96];
  return (
    <div className="w-full max-w-[260px] space-y-2">
      <div className="bg-white/5 rounded-2xl p-3">
        <div className="text-[8px] text-white/40 mb-0.5 font-medium uppercase tracking-wider">Portfolio</div>
        <div className="text-xl font-black text-white tabular-nums">€24,800</div>
        <div className="text-[9px] font-semibold mt-0.5" style={{ color: "hsl(var(--success))" }}>↑ +4.2% this year</div>
        <div className="flex items-end gap-0.5 h-8 mt-2">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: `rgba(255,255,255,${0.2 + (i / bars.length) * 0.5})` }} />
          ))}
        </div>
      </div>
      {[
        { name: "ETF MSCI World", pct: "+12.4%", val: "€14.200" },
        { name: "S&P 500",        pct: "+9.1%",  val: "€8.600"  },
      ].map((a) => (
        <div key={a.name} className="bg-white/5 rounded-xl px-3 py-2 flex items-center justify-between">
          <div className="text-[9px] font-semibold text-white/80">{a.name}</div>
          <div>
            <div className="text-[8px] font-bold text-right" style={{ color: "hsl(var(--success))" }}>{a.pct}</div>
            <div className="text-[9px] font-black tabular-nums text-white">{a.val}</div>
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
    <div className="w-full max-w-[260px] space-y-2">
      <div className="text-[8px] font-bold uppercase tracking-widest text-[#1b76ff] mb-1">Savings goals</div>
      {goals.map((g) => {
        const pct = Math.round((g.current / g.target) * 100);
        return (
          <div key={g.name} className="bg-[#f4f6fa] rounded-xl p-3">
            <div className="flex justify-between mb-1.5">
              <span className="text-[9px] font-semibold text-[#080808]">{g.name}</span>
              <span className="text-[9px] font-bold tabular-nums text-[#080808]">{pct}%</span>
            </div>
            <div className="h-1 bg-black/[0.08] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: g.color }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[8px] tabular-nums text-[#9ca3af]">€{g.current.toLocaleString()}</span>
              <span className="text-[8px] tabular-nums text-[#9ca3af]">of €{g.target.toLocaleString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Card data ───────────────────────────────────────────────────────────── */

const CARDS = [
  { bg: "#ffffff", dark: false, title: "Upload. Done.",           sub: "Import your bank statement and Pocket categorizes every transaction automatically — no manual work.",    visual: <UploadVisual /> },
  { bg: "#1b76ff", dark: true,  title: "See where it goes.",      sub: "Know exactly which categories eat your money, every month.",                                             visual: <CategoriesVisual /> },
  { bg: "#111111", dark: true,  title: "Track your investments.", sub: "Add your portfolio and watch it grow alongside your savings.",                                           visual: <InvestmentsVisual /> },
  { bg: "#ffffff", dark: false, title: "Plan ahead.",             sub: "Set savings goals, track your progress, and stay ahead of what's coming.",                              visual: <BudgetVisual /> },
];

// Stacking offsets in vw/vh units.
// At p=0 (stacked): each card is translated toward the grid center.
// At p=1 (spread):  translate is 0 → natural grid position.
// Grid center is roughly at 0 horizontal and 0 vertical relative to grid midpoint.
// vw offsets bring left/right cards toward horizontal center.
// vh offsets bring top/bottom cards toward vertical center.
const STACK = [
  { dx: 26, dy: 22, r: -7 },  // top-left    → moves right + down to center
  { dx: -26, dy: 22, r: 6 },  // top-right   → moves left  + down
  { dx: 26, dy: -22, r: -4 }, // bottom-left → moves right + up
  { dx: -26, dy: -22, r: 3 }, // bottom-right (visible on top) → moves left + up
];

/* ── Section ─────────────────────────────────────────────────────────────── */
export function ContactSection() {
  const outerRef  = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const hasOpened = useRef(false); // once opened, cards never re-stack on scroll-up

  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isDesktop || reduce) { setProgress(1); return; }

    let raf = 0;
    const update = () => {
      const el = outerRef.current;
      if (!el) return;
      const rect       = el.getBoundingClientRect();
      // Sticky panel is 100vh, so animation window = outer_height - 100vh
      const scrollable = rect.height - window.innerHeight;
      const scrolled   = Math.max(0, -rect.top);
      const raw        = scrollable > 0 ? Math.min(1, scrolled / scrollable) : 0;
      // Lock open when visually ~99% spread (raw=0.65 → eased≈0.993)
      if (raw >= 0.65) hasOpened.current = true;
      setProgress(hasOpened.current ? 1 : raw);
    };

    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", onScroll); };
  }, [isDesktop]);

  // Ease-in-out, accelerated so cards fully open early in the scroll window
  const eased = Math.min(1, progress * 1.45);
  const p     = eased < 0.5 ? 2 * eased * eased : -1 + (4 - 2 * eased) * eased;

  return (
    /*
     * Outer div: 190vh on desktop.
     * Sticky panel = 100vh  →  animation window = 90vh.
     * Cards reach ~99% open at 65% of 90vh ≈ 58vh of scroll.
     * After that, 32vh of scroll with cards static before next section enters.
     * Fast, no long wait.
     */
    <div
      ref={outerRef}
      data-nav-theme="dark"
      style={{ height: isDesktop ? "190vh" : "auto" }}
    >
      {/* Sticky viewport-filling panel */}
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
          style={{ padding: "clamp(6rem, 8vw, 8rem) clamp(1.5rem, 5vw, 4.5rem) clamp(3rem, 5vw, 5rem)" }}
        >
          {/* Headline */}
          <h2
            className="font-heading font-bold text-white uppercase leading-[0.9] tracking-tight mb-10 lg:mb-12 shrink-0"
            style={{ fontSize: "clamp(2rem, 4.5vw, 4.5rem)" }}
          >
            Built for<br />
            <span style={{ color: "#1b76ff" }}>real life.</span>
          </h2>

          {/* 2×2 grid — cards fan out from stack as progress increases */}
          <div
            className="grid gap-3 lg:gap-4 min-h-0 flex-1"
            style={{ gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr",
                     gridTemplateRows:    isDesktop ? "1fr 1fr" : "auto" }}
          >
            {CARDS.map((card, i) => {
              const s   = STACK[i];
              const inv = 1 - p;
              const transform = isDesktop
                ? `translate(${s.dx * inv}vw, ${s.dy * inv}vh) rotate(${s.r * inv}deg)`
                : "none";

              return (
                <div
                  key={i}
                  style={{
                    transform,
                    zIndex: i + 1,
                    willChange: "transform",
                  }}
                >
                  {/* Card */}
                  <div
                    className="rounded-3xl overflow-hidden flex flex-col h-full"
                    style={{ background: card.bg }}
                  >
                    {/* Visual — fills remaining space */}
                    <div className="flex-1 px-5 pt-5 lg:px-6 lg:pt-6 flex items-center justify-center overflow-hidden">
                      {card.visual}
                    </div>

                    {/* Text label at bottom */}
                    <div className="px-5 py-4 lg:px-6 lg:py-5 shrink-0">
                      <h3
                        className="font-black leading-tight mb-1"
                        style={{
                          fontSize: "clamp(1rem, 1.8vw, 1.4rem)",
                          color: card.dark ? "#ffffff" : "#080808",
                        }}
                      >
                        {card.title}
                      </h3>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: card.dark ? "rgba(255,255,255,0.5)" : "rgba(8,8,8,0.45)" }}
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
