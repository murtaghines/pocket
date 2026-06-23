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

/**
 * localP: position of a statement within its own timeline
 *   < -0.5 → below viewport (invisible)
 *   -0.5→0 → ENTERING from below (100vh → 0)
 *    0→0.5 → RESTING at center (page feels static, user reads)
 *   0.5→1  → EXITING upward (0 → -100vh)
 *   > 1    → above viewport (invisible)
 *
 * The exit of statement i and entry of statement i+1 happen SIMULTANEOUSLY
 * because localP_{i+1} = localP_i - 1: when i starts exiting (localP=0.5),
 * i+1 starts entering (localP=-0.5). Both visible at the same time → push effect.
 */
function getY(localP: number): number {
  if (localP <= -0.5) return 100;
  if (localP >= 1.0)  return -100;
  if (localP < 0)     return -localP * 200;        // enter: 100vh → 0
  if (localP < 0.5)   return 0;                    // rest
  return -(localP - 0.5) * 200;                    // exit: 0 → -100vh
}

export function AppShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect        = el.getBoundingClientRect();
      const vh          = window.innerHeight;
      const stickyRange = el.offsetHeight - vh;
      if (stickyRange <= 0) return;
      setP(Math.min(1, Math.max(0, -rect.top / stickyRange)));
    };
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", update); };
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
        // 300vh → stickyRange = 200vh
        // p timeline: [0,0.2] stmt0 rests · [0.2,0.4] 0 exits & 1 enters · [0.4,0.6] stmt1 rests · [0.6,0.8] 1 exits & 2 enters · [0.8,1] stmt2 rests
        minHeight: "300vh",
      }}
    >
      <div
        className="sticky top-0 h-screen overflow-hidden"
        style={{ zIndex: 10 }}
      >
        {STATEMENTS.map((stmt, i) => {
          // K = N - 0.5 = 2.5 ensures stmt 0 starts at rest (localP=0) when p=0,
          // and stmt 2 finishes at rest (localP=0.5) when p=1.
          const K      = N - 0.5;
          const localP = p * K - i;
          const yVh    = getY(localP);

          return (
            <div
              key={stmt.tag}
              className="absolute inset-0 flex flex-col justify-center"
              style={{
                transform:   `translateY(${yVh}vh)`,
                willChange:  "transform",
                padding:     "0 clamp(2rem, 8vw, 9rem)",
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
                  marginTop: "2.5rem",
                  fontSize:  "clamp(0.95rem, 1.4vw, 1.15rem)",
                  maxWidth:  "36ch",
                  color:     "rgba(8,8,8,0.45)",
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
