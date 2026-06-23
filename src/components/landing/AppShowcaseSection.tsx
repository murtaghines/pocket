import { useEffect, useRef } from "react";

const STATEMENTS = [
  {
    tag: "01",
    headline: ["Upload.", "Done."],
    body: "Connect your bank or drop your statements. We categorize every transaction automatically — groceries, subscriptions, rent, all of it.",
  },
  {
    tag: "02",
    headline: ["See where", "it all goes."],
    body: "Your full financial picture in one place. Income, expenses, and balance — clear, visual, real-time.",
  },
  {
    tag: "03",
    headline: ["Plan what", "comes next."],
    body: "Set budgets, track savings goals, and build habits that actually stick. Your future self will thank you.",
  },
];

const N = STATEMENTS.length;

export function AppShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const innerRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const inner   = innerRef.current;
    if (!section || !inner) return;

    let active     = false; // inner scroll enabled
    let grace      = false; // blocks re-enable right after exit
    let graceTimer = 0;
    let exitTimer  = 0;

    const startGrace = () => {
      clearTimeout(graceTimer);
      grace = true;
      graceTimer = window.setTimeout(() => { grace = false; }, 400);
    };

    const enable = () => {
      if (active) return;
      active = true;
      inner.scrollTop = 0;            // always start at step 01
      inner.style.overflowY = "scroll";
      // Correct any sub-pixel offset so section fills the viewport exactly
      const top = section.getBoundingClientRect().top;
      if (Math.abs(top) > 0.5) {
        window.scrollTo({ top: Math.round(top + window.scrollY) });
      }
    };

    const disable = () => {
      if (!active) return;
      active = false;
      clearTimeout(exitTimer);
      exitTimer = 0;
      inner.style.overflowY = "hidden";
      startGrace();
      // Reset to step 01 after the section has time to leave the viewport
      setTimeout(() => { inner.scrollTop = 0; }, 900);
    };

    // ── Window scroll: enable when section arrives at the viewport top ────────
    const onWindowScroll = () => {
      if (active || grace) return;
      const top = section.getBoundingClientRect().top;
      // Activate only once the section is within ±8px of the top —
      // this lets it slide in naturally before we take control.
      if (top > -8 && top < 8) enable();
    };

    // ── Wheel: detect boundary → schedule exit ────────────────────────────────
    const onWheel = (e: WheelEvent) => {
      if (!active) return;
      const dir     = e.deltaY > 0 ? 1 : -1;
      const vh      = window.innerHeight;
      const atLast  = inner.scrollTop >= (N - 1) * vh - 60;
      const atFirst = inner.scrollTop <= 60;

      if ((dir > 0 && atLast) || (dir < 0 && atFirst)) {
        // At a boundary: schedule exit so CSS snap can finish first
        if (!exitTimer) {
          exitTimer = window.setTimeout(disable, 550);
        }
      } else {
        // User scrolled away from the boundary → cancel pending exit
        clearTimeout(exitTimer);
        exitTimer = 0;
      }
    };

    window.addEventListener("scroll", onWindowScroll, { passive: true });
    window.addEventListener("wheel",  onWheel,        { passive: true });

    return () => {
      window.removeEventListener("scroll", onWindowScroll);
      window.removeEventListener("wheel",  onWheel);
      clearTimeout(graceTimer);
      clearTimeout(exitTimer);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      data-nav-theme="light"
      style={{
        background:   "#ffffff",
        borderRadius: "2rem 2rem 0 0",
        position:     "relative",
        zIndex:       1,
        height:       "100vh",
        overflow:     "hidden",
      }}
    >
      {/* Inner scroll container — hidden until section is fully in view */}
      <div
        ref={innerRef}
        className="[&::-webkit-scrollbar]:hidden"
        style={{
          height:             "100%",
          overflowY:          "hidden",
          scrollSnapType:     "y mandatory",
          overscrollBehavior: "contain", // prevents chaining to outer page
          scrollbarWidth:     "none",
          msOverflowStyle:    "none",
        } as React.CSSProperties}
      >
        {STATEMENTS.map((stmt) => (
          <div
            key={stmt.tag}
            style={{
              height:          "100vh",
              scrollSnapAlign: "start",
              scrollSnapStop:  "always", // one step per gesture — no skipping
              display:         "flex",
              flexDirection:   "column",
              justifyContent:  "center",
              padding:         "0 clamp(2rem, 8vw, 9rem)",
            } as React.CSSProperties}
          >
            <div
              className="font-bold tabular-nums mb-8"
              style={{ fontSize: "1rem", letterSpacing: "0.18em", color: "#1b76ff" }}
            >
              {stmt.tag}
            </div>

            <h2
              className="font-black text-[#080808] uppercase leading-[0.88] tracking-tight"
              style={{ fontSize: "clamp(2.25rem, 6vw, 6rem)" }}
            >
              {stmt.headline.map((line, li) => (
                <span key={li} className="block">{line}</span>
              ))}
            </h2>

            <p
              style={{
                marginTop:  "2.5rem",
                fontSize:   "clamp(0.95rem, 1.4vw, 1.15rem)",
                maxWidth:   "36ch",
                color:      "rgba(8,8,8,0.45)",
                lineHeight: 1.65,
              }}
            >
              {stmt.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
