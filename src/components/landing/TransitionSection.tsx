import { useInView } from "@/hooks/useInView";
import pocketIcon from "@/assets/pocket-icon.png";

// Circle circumference = 2 * π * 44 = 276.46
const CIRCUMFERENCE = 276.46;

export function TransitionSection() {
  const { ref, inView } = useInView<HTMLElement>(0.4);

  return (
    <section
      ref={ref}
      data-nav-theme="dark"
      className="relative flex flex-col items-center justify-center"
      style={{ background: "#1b76ff", minHeight: "50vh" }}
    >
      {/* Pocket icon with animated loading ring */}
      <div className="relative flex items-center justify-center">
        {/* Outer ring — animated SVG */}
        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          className="absolute"
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Track ring */}
          <circle
            cx="70"
            cy="70"
            r="44"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="2.5"
          />
          {/* Animated progress ring */}
          <circle
            cx="70"
            cy="70"
            r="44"
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={inView ? 0 : CIRCUMFERENCE}
            style={{
              transition: inView
                ? "stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1)"
                : "none",
            }}
          />
        </svg>

        {/* Pocket icon box */}
        <div
          className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-2xl"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "scale(1)" : "scale(0.75)",
            transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
          }}
        >
          <img src={pocketIcon} alt="Pocket" className="w-12 h-12" />
        </div>
      </div>

      {/* Small label */}
      <p
        className="mt-8 text-[10px] font-bold tracking-[0.35em] uppercase text-white"
        style={{
          opacity: inView ? 0.45 : 0,
          transition: "opacity 0.6s ease-out 0.4s",
        }}
      >
        pocket
      </p>
    </section>
  );
}
