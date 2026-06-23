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

// localP = where the statement is within its own segment [0,1]
// 0 = just entering from below, 0.5 = centered, 1 = just exited above
function getY(localP: number): number {
  if (localP <= 0)   return 100;                              // below viewport
  if (localP >= 1)   return -100;                             // above viewport
  if (localP < 0.25) return (1 - localP / 0.25) * 100;       // enter: slides up from 100vh
  if (localP > 0.75) return -((localP - 0.75) / 0.25) * 100; // exit: slides up to -100vh
  return 0;                                                   // resting — page feels static
}

export function AppShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect  = el.getBoundingClientRect();
      const vh    = window.innerHeight;
      // stickyRange = how many px of scroll the sticky content covers
      const stickyRange = el.offsetHeight - vh;
      if (stickyRange <= 0) return;
      // scrolled = how far the section top has passed the viewport top
      const scrolled = -rect.top;
      setP(Math.min(1, Math.max(0, scrolled / stickyRange)));
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      data-nav-theme="light"
      style={{
        background: "#ffffff",
        borderRadius: "2rem 2rem 0 0",
        position: "relative",
        zIndex: 1,
        // 100vh per statement + 100vh buffer = the sticky range covers exactly N segments
        minHeight: `${N * 100 + 100}vh`,
      }}
    >
      {/* Sticky viewport — background stays fixed, only text moves */}
      <div
        className="sticky top-0 h-screen overflow-hidden"
        style={{ zIndex: 10 }}
      >
        {STATEMENTS.map((stmt, i) => {
          // localP: 0 when this statement's segment starts, 1 when it ends
          // each statement owns 1/N of the total p range, centered at (i + 0.5) / N
          const localP = p * N - i;
          const translateY = getY(localP);

          return (
            <div
              key={stmt.tag}
              className="absolute inset-0 flex flex-col justify-center"
              style={{
                transform: `translateY(${translateY}vh)`,
                willChange: "transform",
                padding: "0 clamp(2rem, 8vw, 9rem)",
              }}
            >
              {/* Tag */}
              <div
                className="font-bold tabular-nums mb-8"
                style={{
                  fontSize: "1rem",
                  letterSpacing: "0.18em",
                  color: "#1b76ff",
                }}
              >
                {stmt.tag}
              </div>

              {/* Headline */}
              <h2
                className="font-black text-[#080808] uppercase leading-[0.88] tracking-tight"
                style={{ fontSize: "clamp(2.25rem, 6vw, 6rem)" }}
              >
                {stmt.headline.map((line, li) => (
                  <span key={li} className="block">{line}</span>
                ))}
              </h2>

              {/* Body */}
              <p
                style={{
                  marginTop: "2.5rem",
                  fontSize: "clamp(0.95rem, 1.4vw, 1.15rem)",
                  maxWidth: "36ch",
                  color: "rgba(8,8,8,0.45)",
                  lineHeight: 1.65,
                }}
              >
                {stmt.body}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
