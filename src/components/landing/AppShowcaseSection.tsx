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

export function AppShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const innerRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const inner   = innerRef.current;
    if (!section || !inner) return;

    const update = () => {
      const rect = section.getBoundingClientRect();
      // Only allow internal step scrolling once the section is fully in the viewport.
      // Until then, keep overflow:hidden so outer-page scroll brings it fully into view.
      // rect.top ≈ 0 means section top is flush with the viewport top.
      inner.style.overflowY = Math.abs(rect.top) <= 5 ? "scroll" : "hidden";
    };

    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
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
      }}
    >
      <div
        ref={innerRef}
        className="[&::-webkit-scrollbar]:hidden"
        style={{
          height:          "100%",
          overflowY:       "hidden",      // starts hidden; scroll listener enables when fully in view
          scrollSnapType:  "y mandatory",
          scrollbarWidth:  "none",
          msOverflowStyle: "none",
        } as React.CSSProperties}
      >
        {STATEMENTS.map((stmt) => (
          <div
            key={stmt.tag}
            style={{
              height:          "100vh",
              scrollSnapAlign: "start",
              display:         "flex",
              flexDirection:   "column",
              justifyContent:  "center",
              padding:         "0 clamp(2rem, 8vw, 9rem)",
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
        ))}
      </div>
    </section>
  );
}
