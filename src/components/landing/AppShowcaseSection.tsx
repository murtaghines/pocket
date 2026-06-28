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

const N            = STATEMENTS.length;
const COOLDOWN     = 700; // ms — minimum time between step changes
const GRACE        = 800; // ms — blocks re-lock right after exit (increased for inertia)
const EXIT_TRAVEL  = 200; // px of actual scroll travel before re-lock is possible

export function AppShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const stepRef  = useRef(0);
  const locked   = useRef(false);
  const cooldown = useRef(false);
  const grace    = useRef(false);

  useEffect(() => { stepRef.current = step; }, [step]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    let lastScrollY  = window.scrollY;
    let prevTop      = el.getBoundingClientRect().top;
    let graceTimer   = 0;
    let unlockScrollY: number | null = null; // scroll position when we last unlocked

    const startCooldown = () => {
      cooldown.current = true;
      setTimeout(() => { cooldown.current = false; }, COOLDOWN);
    };

    const startGrace = () => {
      grace.current = true;
      clearTimeout(graceTimer);
      graceTimer = window.setTimeout(() => { grace.current = false; }, GRACE);
    };

    // Snap section to exact viewport top (corrects sub-pixel drift)
    const snapToTop = () => {
      const top = el.getBoundingClientRect().top;
      if (Math.abs(top) > 0.5) {
        window.scrollTo({ top: Math.round(top + window.scrollY) });
      }
    };

    const lock = (initialStep: number) => {
      if (locked.current) return;
      locked.current = true;
      stepRef.current = initialStep;
      setStep(initialStep);
      snapToTop();
      startCooldown(); // absorb arrival momentum
    };

    const unlock = () => {
      locked.current = false;
      unlockScrollY = window.scrollY; // record position for the distance gate
      startGrace(); // prevent immediate re-lock during exit momentum
    };

    // ── Scroll listener: detects section entering the viewport ────────────────
    // Uses "crossed the threshold" logic so fast swipes can't skip the section.
    const onScroll = () => {
      const currY = window.scrollY;
      const dir   = currY >= lastScrollY ? 1 : -1;
      lastScrollY = currY;

      if (locked.current) {
        // While locked: correct any drift so section stays pinned at top
        const drift = el.getBoundingClientRect().top;
        if (Math.abs(drift) > 0.5) snapToTop();
        return;
      }

      if (grace.current) return;

      // Distance gate: after grace expires, also block re-lock until the page
      // has actually scrolled EXIT_TRAVEL px away from where we unlocked.
      // Guards against rubber-band / momentum bouncing the section back in range.
      if (unlockScrollY !== null) {
        if (Math.abs(currY - unlockScrollY) < EXIT_TRAVEL) return;
        unlockScrollY = null; // far enough away — allow re-lock normally
      }

      const top = el.getBoundingClientRect().top;

      // "In zone": section is within ±40px of the viewport top
      const inZone = Math.abs(top) < 40;

      // "Crossed": one event jumped over the zone entirely (very fast scroll)
      // prevTop and top straddle the ±40 threshold in the scroll direction
      const crossed =
        (dir > 0 && prevTop > 40  && top <= 40)  || // going down, section passed through
        (dir < 0 && prevTop < -40 && top >= -40);   // going up, section passed through

      prevTop = top;

      if (inZone || crossed) {
        // Start at step 01 when approaching from below, step 03 from above
        lock(dir < 0 ? N - 1 : 0);
      }
    };

    // ── Wheel listener: advance steps while locked ────────────────────────────
    const onWheel = (e: WheelEvent) => {
      if (!locked.current) return;

      const dir: 1 | -1 = e.deltaY > 0 ? 1 : -1;
      const next = stepRef.current + dir;

      if (next < 0 || next >= N) {
        // At boundary: release lock and let the page scroll naturally
        unlock();
        return; // don't prevent — outer page handles the exit scroll
      }

      // Absorb this event so the outer page doesn't also scroll
      e.preventDefault();

      if (!cooldown.current) {
        setStep(next);
        startCooldown();
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true  });
    window.addEventListener("wheel",  onWheel,  { passive: false });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel",  onWheel);
      clearTimeout(graceTimer);
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
        // Steps below current sit at +100vh, current at 0, steps above at -100vh
        const yVh = i < step ? -100 : i === step ? 0 : 100;
        return (
          <div
            key={stmt.tag}
            className="absolute inset-0 flex flex-col justify-center"
            style={{
              transform:  `translateY(${yVh}vh)`,
              transition: "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
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
              className="font-heading font-bold text-[#080808] uppercase leading-[0.88] tracking-tight"
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
