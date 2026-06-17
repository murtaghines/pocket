import pocketLogoWhite from "@/assets/pocket-logo-white.png";
import { useScrollProgress } from "@/hooks/useScrollProgress";

export function TransitionSection() {
  const { ref, progress } = useScrollProgress<HTMLElement>();

  // progress: -1 (section entering) → +1 (section exiting)
  const loadingProgress = Math.min(1, Math.max(0, (progress + 1) / 2));
  const pct = Math.round(loadingProgress * 100);

  // Logo spins 2 full rotations as progress goes 0→1
  const rotation = loadingProgress * 720;

  return (
    <section
      ref={ref}
      data-nav-theme="dark"
      style={{ background: "#1b76ff", minHeight: "130vh", position: "relative" }}
    >
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center">

        {/* Spinning logo */}
        <img
          src={pocketLogoWhite}
          alt="Pocket"
          className="w-20 h-20"
          style={{ transform: `rotate(${rotation}deg)` }}
        />

        {/* Percentage */}
        <div
          className="text-white font-black mt-10 tabular-nums"
          style={{
            fontSize: "clamp(1.75rem, 3vw, 2.75rem)",
            letterSpacing: "-0.02em",
          }}
        >
          {pct}%
        </div>
      </div>
    </section>
  );
}
