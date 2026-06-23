import { useEffect, useRef, useState } from "react";

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
const COOLDOWN_MS = 700;

export function AppShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const stepRef   = useRef(0);
  const cooldown  = useRef(false);
  const touchY    = useRef<number | null>(null);

  // Keep stepRef in sync so event-handler closures always read current step
  useEffect(() => { stepRef.current = step; }, [step]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    // Is section near/covering the viewport (within ±80px of being fully pinned)?
    const isActive = () => {
      const r = el.getBoundingClientRect();
      return r.top <= 80 && r.top >= -80 && r.height >= window.innerHeight * 0.8;
    };

    // Is section snapped exactly to the viewport top?
    const isSnapped = () => Math.abs(el.getBoundingClientRect().top) <= 2;

    // Try to advance one step in direction dir.
    // Returns true if the event was "consumed" (should be prevented), false if at boundary.
    const advance = (dir: 1 | -1): boolean => {
      const next = stepRef.current + dir;
      if (next < 0 || next >= N) return false; // at boundary → let scroll exit
      if (cooldown.current) return true;        // in cooldown → absorb but don't advance
      cooldown.current = true;
      setStep(next);
      setTimeout(() => { cooldown.current = false; }, COOLDOWN_MS);
      return true;
    };

    const onWheel = (e: WheelEvent) => {
      if (!isActive()) return;

      const dir = e.deltaY > 0 ? 1 : -1;

      // At boundary in this direction → let scroll pass through so page exits naturally
      const atBoundary =
        (dir === 1 && stepRef.current >= N - 1) ||
        (dir === -1 && stepRef.current <= 0);
      if (atBoundary) return;

      e.preventDefault();

      if (!isSnapped()) {
        // Section drifted slightly → snap it to viewport first, advance on next event
        window.scrollBy({ top: el.getBoundingClientRect().top });
      } else {
        advance(dir);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      touchY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchY.current === null || !isActive()) return;
      const dy = touchY.current - e.touches[0].clientY;
      if (Math.abs(dy) < 40) return; // minimum swipe distance
      const dir = dy > 0 ? 1 : -1;
      touchY.current = e.touches[0].clientY; // reset for incremental swipes

      const atBoundary =
        (dir === 1 && stepRef.current >= N - 1) ||
        (dir === -1 && stepRef.current <= 0);
      if (atBoundary) return;

      e.preventDefault();
      if (isSnapped()) advance(dir);
    };

    const onTouchEnd = () => { touchY.current = null; };

    window.addEventListener("wheel",      onWheel,      { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove",  onTouchMove,  { passive: false });
    window.addEventListener("touchend",   onTouchEnd,   { passive: true });

    return () => {
      window.removeEventListener("wheel",      onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove",  onTouchMove);
      window.removeEventListener("touchend",   onTouchEnd);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      data-nav-theme="light"
      style={{
        background:    "#ffffff",
        borderRadius:  "2rem 2rem 0 0",
        position:      "relative",
        zIndex:        1,
        height:        "100vh",
        overflow:      "hidden",
      }}
    >
      {STATEMENTS.map((stmt, i) => {
        // past → above (-100vh) · active → center (0) · future → below (+100vh)
        const yVh = i < step ? -100 : i === step ? 0 : 100;

        return (
          <div
            key={stmt.tag}
            className="absolute inset-0 flex flex-col justify-center"
            style={{
              transform:  `translateY(${yVh}vh)`,
              transition: "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)",
              willChange: "transform",
              padding:    "0 clamp(2rem, 8vw, 9rem)",
            }}
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
        );
      })}
    </section>
  );
}
