import { useEffect, useState } from "react";
import { AsteriskMark } from "@/components/brand";
import { useScrollProgress } from "@/hooks/useScrollProgress";

export function TransitionSection() {
  const { ref, progress } = useScrollProgress<HTMLElement>();

  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const loadingProgress = Math.min(1, Math.max(0, progress + 1));

  const rotation = loadingProgress * 720;
  const scale    = 0.3 + loadingProgress * 0.9;
  const opacity  = 0.4 + loadingProgress * 0.6;

  return (
    <section
      ref={ref}
      data-nav-theme="dark"
      style={{ background: "#1b76ff", minHeight: isDesktop ? "200vh" : "80vh", position: "relative" }}
    >
      <div
        className="sticky top-0 h-screen flex items-center justify-center"
        style={{ zIndex: 10 }}
      >
        <AsteriskMark
          size={isDesktop ? 112 : 72}
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
