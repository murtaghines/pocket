import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section
      data-nav-theme="dark"
      className="relative overflow-hidden py-28 lg:py-40"
      style={{ background: "#1b76ff" }}
    >
      {/* Ghost "POCKET" fills the bottom */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-0 select-none overflow-hidden">
        <div
          className="font-black uppercase text-white leading-[0.82] tracking-tight"
          style={{ fontSize: "clamp(6rem, 26vw, 24rem)", opacity: 0.09 }}
        >
          POCKET
        </div>
      </div>

      <div className="container px-6 text-center relative z-10">
        <p className="text-[10px] font-bold tracking-[0.35em] text-white/70 mb-6">
          JOIN PEOPLE TAKING CONTROL
        </p>

        <h2
          className="font-heading font-bold text-white uppercase leading-[0.88] tracking-tight"
          style={{ fontSize: "clamp(3rem, 13vw, 11rem)" }}
        >
          Start with
          <br />
          <span style={{ color: "#FFD027" }}>pocket</span>
        </h2>

        <div className="mt-12 flex justify-center">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 bg-white text-[#080808] font-semibold rounded-full px-8 py-4 text-base shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02]"
          >
            Sign up for free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <p className="mt-8 text-white/50 text-sm">
          Free forever · No credit card required
        </p>
      </div>
    </section>
  );
}
