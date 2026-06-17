import { useState } from "react";
import { useScrollProgress } from "@/hooks/useScrollProgress";

export function HeroSection() {
  const { ref, progress } = useScrollProgress<HTMLElement>();
  const headlineY = progress * -60;

  // Toggle state: 0 = Spend/Money, 1 = Save/Future
  const [active, setActive] = useState(0);
  const [word, setWord] = useState("Money");
  const [wordOpacity, setWordOpacity] = useState(1);

  const handleToggle = (next: 0 | 1) => {
    if (next === active) return;
    // Fade out → change word → fade in
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
      className="relative overflow-hidden flex flex-col"
      style={{ background: "#1b76ff", minHeight: "100vh" }}
    >
      {/* ── Main content ── */}
      <div
        className="container px-4 md:px-6 relative pt-20 lg:pt-24 pb-4"
        style={{ zIndex: 10 }}
      >
        {/* Top-right description */}
        <div className="hidden lg:block absolute right-6 xl:right-14 top-32 max-w-[220px] text-white">
          <p className="text-[10px] font-bold tracking-[0.28em] mb-3 opacity-55 uppercase">
            Do more with Pocket
          </p>
          <p className="text-sm leading-relaxed opacity-75">
            Upload bank statements, auto-categorize every transaction with AI,
            and see your full financial picture in one place.
          </p>
        </div>

        {/* Headline */}
        <div
          className="will-change-transform"
          style={{ transform: `translate3d(0, ${headlineY}px, 0)` }}
        >
          <h1
            className="font-black text-white tracking-tight uppercase"
            style={{ fontSize: "clamp(3rem, 10vw, 9.5rem)", lineHeight: 0.88 }}
          >
            {/* Line 1 */}
            <span className="block">Track your</span>

            {/* Line 2: word + toggle slider */}
            <span className="flex items-center gap-5 lg:gap-6 flex-wrap lg:flex-nowrap mt-1">

              {/* Animated headline word */}
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

              {/* Toggle pill slider */}
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
                {/* Sliding white pill */}
                <div
                  className="absolute rounded-full bg-white transition-all duration-300 ease-in-out"
                  style={{
                    height: "calc(100% - 12px)",
                    width: "calc(50% - 3px)",
                    top: "6px",
                    left: active === 0 ? "6px" : "calc(50% - 3px)",
                  }}
                />

                {/* Spend side */}
                <button
                  onClick={() => handleToggle(0)}
                  className="relative z-10 w-1/2 text-center text-sm font-bold py-3 transition-colors duration-300 rounded-full"
                  style={{ color: active === 0 ? "#1b76ff" : "rgba(255,255,255,0.5)" }}
                >
                  Spend
                </button>

                {/* Save side */}
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
        </div>

        {/* Mobile description */}
        <p className="lg:hidden mt-6 text-white/75 text-base max-w-md leading-relaxed">
          Upload bank statements, auto-categorize every transaction and see your full financial picture.
        </p>
      </div>

      {/* Flexible spacer — tightly capped */}
      <div className="flex-1" style={{ minHeight: "0.5rem", maxHeight: "1rem" }} />

      {/* ── Ghost text — container px-4 md:px-6 matches headline left edge exactly ── */}
      <div
        className="overflow-hidden select-none pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <div className="container px-4 md:px-6">
          <div
            className="font-black uppercase text-white tracking-tight"
            style={{ opacity: 0.14, lineHeight: 0.82 }}
          >
            <div
              className="will-change-transform"
              style={{
                fontSize: "clamp(3rem, 13vw, 13rem)",
                whiteSpace: "nowrap",
                transform: `translate3d(0, ${progress * 6}px, 0)`,
              }}
            >
              LIKE NEVER
            </div>
            <div
              className="will-change-transform"
              style={{
                fontSize: "clamp(3rem, 13vw, 13rem)",
                whiteSpace: "nowrap",
                transform: `translate3d(0, ${progress * 14}px, 0)`,
              }}
            >
              BEFORE
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
