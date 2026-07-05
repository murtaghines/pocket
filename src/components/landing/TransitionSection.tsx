import { AsteriskMark } from "@/components/brand";
import { useScrollProgress } from "@/hooks/useScrollProgress";

export function TransitionSection() {
  const { ref, progress } = useScrollProgress<HTMLElement>();

  const loadingProgress = Math.min(1, Math.max(0, progress + 1));

  const rotation = loadingProgress * 720;           // 2 full spins
  const scale    = 0.3 + loadingProgress * 0.9;    // 0.3 → 1.2  (grows as it spins)
  const opacity  = 0.4 + loadingProgress * 0.6;    // 0.4 → 1.0  (fades in)

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
        <AsteriskMark
          size={112}
          className="text-white"
          style={{
            transform: `rotate(${rotation}deg) scale(${scale})`,
            opacity,
          }}
        />
      </div>
    </section>
  );
}
