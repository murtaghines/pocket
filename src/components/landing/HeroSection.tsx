import { useState } from "react";
import { useScrollProgress } from "@/hooks/useScrollProgress";

export function HeroSection() {
  const { ref, progress } = useScrollProgress<HTMLElement>();
  const headlineY = progress * -60;

  const [active, setActive] = useState(0);
  const [word, setWord] = useState("Money");
  const [wordOpacity, setWordOpacity] = useState(1);

  const handleToggle = (next: 0 | 1) => {
    if (next === active) return;
    setWordOpacity(0);
    setTimeout(() => {
      setActive(next);
      setWord(next === 0 ? "Money" : "Future");
      setWordOpacity(1);
    }, 200);
  };

  return (
    <section
      ref={ref}
      data-nav-theme="dark"
      className="relative overflow-hidden"
      style={{ background: "#1b76ff", height: "100vh" }}
    >
      {/* Top-right description (desktop only) */}
      <div
        className="hidden lg:block absolute text-white"
        style={{ top: "7rem", right: "3.5rem", maxWidth: "220px", zIndex: 10 }}
      >
        <p className="text-[10px] font-bold tracking-[0.28em] mb-3 opacity-55 uppercase">
          Do more with Pocket
        </p>
        <p className="text-sm leading-relaxed opacity-75">
          Upload bank statements, auto-categorize every transaction with AI,
          and see your full financial picture in one place.
        </p>
      </div>

      {/* Bottom-left anchored text block */}
      <div
        className="absolute bottom-0 left-0 right-0 overflow-hidden"
        style={{ zIndex: 10, paddingBottom: "clamp(1.5rem, 4vh, 3rem)" }}
      >
        {/* Headline — scroll parallax */}
        <div
          className="will-change-transform"
          style={{ transform: `translate3d(0, ${headlineY}px, 0)` }}
        >
          <h1
            className="font-heading font-bold text-white uppercase"
            style={{ fontSize: "clamp(3.5rem, 11.5vw, 11rem)", lineHeight: 0.88, letterSpacing: "-0.01em" }}
          >
            <span className="block">Track your</span>

            <span className="flex items-center gap-5 lg:gap-6 flex-wrap lg:flex-nowrap mt-1">
              <span
                className="will-change-transform"
                style={{
                  opacity: wordOpacity,
                  transition: "opacity 0.18s ease",
                  display: "inline-block",
                }}
              >
                {word}
              </span>

              {/* Toggle pill */}
              <div
                className="inline-flex items-center rounded-full shrink-0 relative cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  backdropFilter: "blur(12px)",
                  padding: "6px",
                  fontSize: "initial",
                  fontWeight: "initial",
                  textTransform: "none",
                  letterSpacing: "normal",
                  lineHeight: "initial",
                  minWidth: "210px",
                }}
              >
                <div
                  className="absolute rounded-full bg-white transition-all duration-300 ease-in-out"
                  style={{
                    height: "calc(100% - 12px)",
                    width: "calc(50% - 3px)",
                    top: "6px",
                    left: active === 0 ? "6px" : "calc(50% - 3px)",
                  }}
                />
                <button
                  onClick={() => handleToggle(0)}
                  className="relative z-10 w-1/2 text-center text-sm font-bold py-3 transition-colors duration-300 rounded-full"
                  style={{ color: active === 0 ? "#1b76ff" : "rgba(255,255,255,0.5)" }}
                >
                  Spend
                </button>
                <button
                  onClick={() => handleToggle(1)}
                  className="relative z-10 w-1/2 text-center text-sm font-bold py-3 transition-colors duration-300 rounded-full"
                  style={{ color: active === 1 ? "#1b76ff" : "rgba(255,255,255,0.5)" }}
                >
                  Save
                </button>
              </div>
            </span>
          </h1>

          {/* Mobile description — between headline and ghost text */}
          <p
            className="lg:hidden text-white/75 leading-relaxed"
            style={{
              marginTop: "1.25rem",
              marginBottom: "0.5rem",
              fontSize: "clamp(0.85rem, 3.5vw, 1rem)",
              maxWidth: "34ch",
            }}
          >
            Upload bank statements, auto-categorize every transaction and see your full financial picture.
          </p>
        </div>

        {/* Ghost text — no horizontal padding, flush left, sits at very bottom */}
        <div
          className="select-none pointer-events-none font-black uppercase text-white"
          style={{ opacity: 0.14, lineHeight: 0.82, letterSpacing: "-0.01em" }}
        >
          <div
            className="will-change-transform"
            style={{
              fontSize: "clamp(3.5rem, 15vw, 15rem)",
              whiteSpace: "nowrap",
              transform: `translate3d(0, ${progress * 6}px, 0)`,
            }}
          >
            LIKE NEVER
          </div>
          <div
            className="will-change-transform"
            style={{
              fontSize: "clamp(3.5rem, 15vw, 15rem)",
              whiteSpace: "nowrap",
              transform: `translate3d(0, ${progress * 14}px, 0)`,
            }}
          >
            BEFORE
          </div>
        </div>
      </div>
    </section>
  );
}
