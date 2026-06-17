import pocketLogoWhite from "@/assets/pocket-logo-white.png";
import { useScrollProgress } from "@/hooks/useScrollProgress";

export function TransitionSection() {
  const { ref, progress } = useScrollProgress<HTMLElement>();

  const loadingProgress = Math.min(1, Math.max(0, progress + 1));

  const rotation = loadingProgress * 720;           // 2 full spins
  const scale    = 0.3 + loadingProgress * 0.9;    // 0.3 → 1.2  (grows as it spins)
  const opacity  = 0.4 + loadingProgress * 0.6;    // 0.4 → 1.0  (fades in)
  const glow     = loadingProgress * 32;            // 0 → 32px white glow

  return (
    <section
      ref={ref}
      data-nav-theme="dark"
      style={{ background: "#1b76ff", minHeight: "200vh", position: "relative" }}
    >
      <div
        className="sticky top-0 h-screen flex items-center justify-center"
        style={{ zIndex: 10 }}
      >
        <img
          src={pocketLogoWhite}
          alt="Pocket"
          className="w-28 h-28"
          style={{
            transform: `rotate(${rotation}deg) scale(${scale})`,
            opacity,
            filter: `drop-shadow(0 0 ${glow}px rgba(255,255,255,0.45))`,
          }}
        />
      </div>
    </section>
  );
}
