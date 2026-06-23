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

const N        = STATEMENTS.length;
const COOLDOWN = 750; // ms between step advances
const GRACE    = 600; // ms after unlock before re-snapping is allowed

export function AppShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const stepRef  = useRef(0);
  const locked   = useRef(false);
  const cooldown = useRef(false);
  const grace    = useRef(false); // blocks re-snap right after exit

  useEffect(() => { stepRef.current = step; }, [step]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const startCooldown = () => {
      cooldown.current = true;
      setTimeout(() => { cooldown.current = false; }, COOLDOWN);
    };

    const snapTo = () => {
      // scrollTo with exact integer px — eliminates sub-pixel drift
      const exact = Math.round(el.getBoundingClientRect().top + window.scrollY);
      window.scrollTo({ top: exact });
    };

    const unlock = () => {
      locked.current = false;
      grace.current  = true;
      setTimeout(() => { grace.current = false; }, GRACE);
    };

    let lastScrollY = window.scrollY;

    // Scroll listener: snaps section into view when it enters the viewport.
    // Fires AFTER the page moved, so rect.top is already up-to-date.
    const onScroll = () => {
      const currY = window.scrollY;
      const dir   = currY >= lastScrollY ? 1 : -1;
      lastScrollY = currY;

      // While locked, keep section pinned exactly at the viewport top.
      // This fixes any residual sub-pixel drift between scroll events.
      if (locked.current) {
        const drift = el.getBoundingClientRect().top;
        if (Math.abs(drift) > 0.5) snapTo();
        return;
      }

      if (grace.current) return;

      const top = el.getBoundingClientRect().top;
      const vh  = window.innerHeight;

      // Snap when section is partially inside the viewport and moving toward center
      const entering =
        (dir > 0 && top > 0 && top < vh) ||   // coming from below
        (dir < 0 && top < 0 && top > -vh);    // coming from above

      if (entering) {
        // Reset step to match approach direction: 01 from below, 03 from above
        const initial = dir > 0 ? 0 : N - 1;
        stepRef.current = initial;
        setStep(initial);
        locked.current = true;
        snapTo();
        startCooldown();
      }
    };

    // Wheel listener: advance steps one at a time while locked.
    const onWheel = (e: WheelEvent) => {
      if (!locked.current) return;

      const dir: 1 | -1 = e.deltaY > 0 ? 1 : -1;
      const next = stepRef.current + dir;

      if (next < 0 || next >= N) {
        unlock(); // let this event scroll the outer page naturally
        return;
      }

      e.preventDefault();
      if (!cooldown.current) {
        setStep(next);
        startCooldown();
      }
    };

    // Touch support
    let touchStartY = 0;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!locked.current) return;

      const dy = touchStartY - e.touches[0].clientY;
      if (Math.abs(dy) < 30) return;

      const dir: 1 | -1 = dy > 0 ? 1 : -1;
      touchStartY = e.touches[0].clientY;
      const next = stepRef.current + dir;

      if (next < 0 || next >= N) {
        unlock();
        return;
      }

      e.preventDefault();
      if (!cooldown.current) {
        setStep(next);
        startCooldown();
      }
    };

    window.addEventListener("scroll",     onScroll,     { passive: true  });
    window.addEventListener("wheel",      onWheel,      { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true  });
    window.addEventListener("touchmove",  onTouchMove,  { passive: false });

    return () => {
      window.removeEventListener("scroll",     onScroll);
      window.removeEventListener("wheel",      onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove",  onTouchMove);
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
