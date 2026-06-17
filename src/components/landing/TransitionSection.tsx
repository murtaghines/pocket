import pocketIcon from "@/assets/pocket-icon.png";
import { useScrollProgress } from "@/hooks/useScrollProgress";

export function TransitionSection() {
  const { ref, progress } = useScrollProgress<HTMLElement>();

  // progress: -1 (section just below viewport) → +1 (section just above viewport)
  // map to 0→100 loading percentage
  const loadingProgress = Math.min(1, Math.max(0, (progress + 1) / 2));
  const pct = Math.round(loadingProgress * 100);

  // Circle: r=52, circumference = 2 * π * 52 = 326.73
  const R = 52;
  const C = 2 * Math.PI * R;
  const dashOffset = C * (1 - loadingProgress);

  return (
    // 200vh gives the user ~2 full-screen heights of scroll before reaching white
    <section
      ref={ref}
      data-nav-theme="dark"
      style={{ background: "#1b76ff", minHeight: "200vh", position: "relative" }}
    >
      {/* Sticky so loading UI stays centered while user scrolls through */}
      <div
        className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden"
      >
        {/* Ghost large number — background depth */}
        <div
          className="absolute font-black text-white select-none pointer-events-none"
          style={{
            fontSize: "clamp(10rem, 35vw, 32rem)",
            lineHeight: 1,
            opacity: 0.06,
            letterSpacing: "-0.05em",
          }}
        >
          {pct}
        </div>

        {/* Logo + circular progress ring */}
        <div className="relative flex items-center justify-center" style={{ zIndex: 1 }}>
          <svg
            width="160"
            height="160"
            viewBox="0 0 160 160"
            className="absolute"
            style={{ transform: "rotate(-90deg)" }}
          >
            {/* Track */}
            <circle
              cx="80" cy="80" r={R}
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="2"
            />
            {/* Progress arc — updates with scroll */}
            <circle
              cx="80" cy="80" r={R}
              fill="none"
              stroke="rgba(255,255,255,0.90)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 0.06s linear" }}
            />
          </svg>

          {/* Pocket icon */}
          <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-2xl">
            <img src={pocketIcon} alt="Pocket" className="w-12 h-12" />
          </div>
        </div>

        {/* Percentage counter */}
        <div
          className="text-white font-black mt-10 tabular-nums"
          style={{
            fontSize: "clamp(1.75rem, 3vw, 2.75rem)",
            letterSpacing: "-0.02em",
            zIndex: 1,
          }}
        >
          {pct}%
        </div>

        {/* Label */}
        <p
          className="text-white font-bold uppercase tracking-[0.32em] mt-3"
          style={{ fontSize: "0.6rem", opacity: 0.4, zIndex: 1 }}
        >
          pocket
        </p>
      </div>
    </section>
  );
}
