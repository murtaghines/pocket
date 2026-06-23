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

const N         = STATEMENTS.length;
const COOLDOWN  = 750;  // ms between step advances
const SNAP_ZONE = 80;   // px — snap section into place when this close to the viewport top

export function AppShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const stepRef  = useRef(0);
  const locked   = useRef(false); // true while section owns the scroll
  const cooldown = useRef(false); // true during step transition
  const touchY   = useRef<number | null>(null);

  useEffect(() => { stepRef.current = step; }, [step]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const startCooldown = () => {
      cooldown.current = true;
      setTimeout(() => { cooldown.current = false; }, COOLDOWN);
    };

    // Snap the section exactly to viewport top and lock it
    const snapAndLock = () => {
      const top = el.getBoundingClientRect().top;
      if (top !== 0) window.scrollBy({ top });   // instant, no animation
      locked.current = true;
      startCooldown(); // absorb the momentum that brought us here
    };

    // Core logic shared by wheel and touch
    const handle = (dir: 1 | -1, prevent: () => void) => {
      const top = el.getBoundingClientRect().top;

      if (!locked.current) {
        // Snap in when the section is within SNAP_ZONE of being fully visible
        const entering =
          (dir > 0 && top > 0 && top <= SNAP_ZONE) ||
          (dir < 0 && top < 0 && top >= -SNAP_ZONE);
        if (entering) { prevent(); snapAndLock(); }
        return;
      }

      // Section is locked — manage discrete steps
      const next = stepRef.current + dir;

      if (next < 0 || next >= N) {
        // At boundary: unlock and let this scroll exit naturally
        locked.current = false;
        return; // don't prevent — outer page scrolls away
      }

      prevent();
      if (!cooldown.current) {
        setStep(next);
        startCooldown();
      }
    };

    const onWheel      = (e: WheelEvent)   => handle(e.deltaY > 0 ? 1 : -1, () => e.preventDefault());
    const onTouchStart = (e: TouchEvent)   => { touchY.current = e.touches[0].clientY; };
    const onTouchEnd   = ()                => { touchY.current = null; };
    const onTouchMove  = (e: TouchEvent)   => {
      if (touchY.current === null) return;
      const dy = touchY.current - e.touches[0].clientY;
      if (Math.abs(dy) < 30) return;
      const dir: 1 | -1 = dy > 0 ? 1 : -1;
      touchY.current = e.touches[0].clientY;
      handle(dir, () => e.preventDefault());
    };

    window.addEventListener("wheel",      onWheel,      { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true  });
    window.addEventListener("touchmove",  onTouchMove,  { passive: false });
    window.addEventListener("touchend",   onTouchEnd,   { passive: true  });

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
        background:   "#ffffff",
        borderRadius: "2rem 2rem 0 0",
        position:     "relative",
        zIndex:       1,
        height:       "100vh",
        overflow:     "hidden",
      }}
    >
      {STATEMENTS.map((stmt, i) => {
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
