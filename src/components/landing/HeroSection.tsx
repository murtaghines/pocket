import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import pocketIcon from "@/assets/pocket-icon.png";
import { useScrollProgress } from "@/hooks/useScrollProgress";

export function HeroSection() {
  const { ref, progress } = useScrollProgress<HTMLElement>();

  const headlineY = progress * -80;
  const cardY = progress * -40;

  return (
    <section
      ref={ref}
      data-nav-theme="dark"
      className="relative pt-28 pb-16 lg:pt-40 lg:pb-24 overflow-hidden min-h-screen"
      style={{ background: "#1b76ff" }}
    >
      {/* Ghost text — bottom-anchored, two words so NEVER+BEFORE show below the headline */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-0 select-none overflow-hidden">
        <div
          className="font-black uppercase text-white leading-[0.82] tracking-tight"
          style={{ opacity: 0.15 }}
        >
          {(["NEVER", "BEFORE"] as const).map((word, i) => (
            <div
              key={word}
              className="will-change-transform"
              style={{
                fontSize: "clamp(5rem, 20vw, 18rem)",
                transform: `translate3d(0, ${progress * (10 + i * 14)}px, 0)`,
              }}
            >
              {word}
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="container px-4 md:px-6 relative z-10">
        {/* Massive headline */}
        <h1
          className="font-black text-white tracking-tight uppercase leading-[0.88] will-change-transform"
          style={{
            fontSize: "clamp(3rem, 13vw, 12rem)",
            transform: `translate3d(0, ${headlineY}px, 0)`,
          }}
        >
          Track your
          <br />
          money
        </h1>

        {/* Floating card — clickable, goes to /auth */}
        <Link
          to="/auth"
          className="my-8 lg:my-10 inline-flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/25 rounded-2xl p-4 lg:p-5 will-change-transform hover:bg-white/15 transition-colors duration-200 cursor-pointer"
          style={{ transform: `translate3d(0, ${cardY}px, 0)` }}
        >
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl bg-white flex items-center justify-center shadow-lg shrink-0">
            <img src={pocketIcon} alt="Pocket" className="w-10 h-10 lg:w-12 lg:h-12" />
          </div>
          <div className="text-white">
            <div className="text-[10px] tracking-[0.22em] font-bold opacity-75 mb-1">FREE FOREVER</div>
            <div className="text-base font-bold leading-tight">
              Get started
              <br />
              in 30 seconds
            </div>
          </div>
        </Link>

        {/* Mobile sub-copy */}
        <p className="lg:hidden mt-4 text-white/80 text-base max-w-md leading-relaxed">
          Upload your bank statements, auto-categorize every transaction and see your full financial picture in one place.
        </p>

        <div className="mt-8 lg:mt-10">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 bg-white text-[#080808] font-semibold rounded-full px-7 py-4 text-base shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02]"
          >
            Get started for free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
