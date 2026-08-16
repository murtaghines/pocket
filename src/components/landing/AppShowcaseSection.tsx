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

  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => { stepRef.current = step; }, [step]);

  useEffect(() => {
    if (!isDesktop) return;

    const el = sectionRef.current;
    if (!el) return;

    let lastScrollY  = window.scrollY;
    let prevTop      = el.getBoundingClientRect().top;
    let graceTimer   = 0;
    let unlockScrollY: number | null = null;

    const startCooldown = () => {
      cooldown.current = true;
      setTimeout(() => { cooldown.current = false; }, COOLDOWN);
    };

    const startGrace = () => {
      grace.current = true;
      clearTimeout(graceTimer);
      graceTimer = window.setTimeout(() => { grace.current = false; }, GRACE);
    };

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
      startCooldown();
    };

    const unlock = () => {
      locked.current = false;
      unlockScrollY = window.scrollY;
      startGrace();
    };

    const onScroll = () => {
      const currY = window.scrollY;
      const dir   = currY >= lastScrollY ? 1 : -1;
      lastScrollY = currY;

      if (locked.current) {
        const drift = el.getBoundingClientRect().top;
        if (Math.abs(drift) > 0.5) snapToTop();
        return;
      }

      if (grace.current) return;

      if (unlockScrollY !== null) {
        if (Math.abs(currY - unlockScrollY) < EXIT_TRAVEL) return;
        unlockScrollY = null;
      }

      const top = el.getBoundingClientRect().top;
      const inZone = Math.abs(top) < 40;
      const crossed =
        (dir > 0 && prevTop > 40  && top <= 40)  ||
        (dir < 0 && prevTop < -40 && top >= -40);

      prevTop = top;

      if (inZone || crossed) {
        lock(dir < 0 ? N - 1 : 0);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!locked.current) return;

      const dir: 1 | -1 = e.deltaY > 0 ? 1 : -1;
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

    window.addEventListener("scroll", onScroll, { passive: true  });
    window.addEventListener("wheel",  onWheel,  { passive: false });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel",  onWheel);
      clearTimeout(graceTimer);
    };
  }, [isDesktop]);

  /* ── Mobile: stacked flow layout ──────────────────────────────────────── */
  if (!isDesktop) {
    return (
      <section
        data-nav-theme="light"
        className="relative bg-white"
        style={{ borderRadius: "2rem 2rem 0 0", zIndex: 1 }}
      >
        {STATEMENTS.map((stmt) => (
          <div
            key={stmt.tag}
            className="flex flex-col justify-center"
            style={{ padding: "clamp(4rem, 10vw, 6rem) clamp(1.5rem, 6vw, 3rem)" }}
          >
            <div
              className="font-bold tabular-nums mb-6"
              style={{ fontSize: "1rem", letterSpacing: "0.18em", color: "#1b76ff" }}
            >
              {stmt.tag}
            </div>
            <h2
              className="font-heading font-bold text-[#080808] uppercase leading-[0.88] tracking-tight"
              style={{ fontSize: "clamp(2rem, 8vw, 3.5rem)" }}
            >
              {stmt.headline.map((line, li) => (
                <span key={li} className="block">{line}</span>
              ))}
            </h2>
            <p
              className="text-[#080808]/45 leading-relaxed"
              style={{
                marginTop: "1.5rem",
                fontSize: "clamp(0.95rem, 3.8vw, 1.1rem)",
                maxWidth: "36ch",
              }}
            >
              {stmt.body}
            </p>
          </div>
        ))}
      </section>
    );
  }

  /* ── Desktop: scroll-lock step-through ────────────────────────────────── */
  return (
    <section
      ref={sectionRef}
      data-nav-theme="light"
      style={{
        background:   "#e5e7eb",
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
