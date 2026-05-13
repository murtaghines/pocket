import { Link } from "react-router-dom";
import pocketIcon from "@/assets/pocket-icon.png";

export function CTASection() {
  return (
    <section data-nav-theme="dark" className="relative overflow-hidden py-24 lg:py-36" style={{ background: "#1b76ff" }}>
      <div className="container px-6 text-center relative z-10">
        <p className="text-xs font-bold tracking-[0.3em] text-white/80 mb-6">
          JOIN PEOPLE TAKING CONTROL
        </p>

        <h2
          className="font-black text-white uppercase leading-[0.88] tracking-tight"
          style={{ fontSize: "clamp(3rem, 13vw, 12rem)" }}
        >
          Start with
          <br />
          pocket
        </h2>

        <div className="mt-12 flex justify-center">
          <Link
            to="/auth"
            className="inline-flex items-center bg-white text-[#080808] font-semibold rounded-full px-8 py-4 text-base shadow-xl hover:shadow-2xl transition-shadow"
          >
            Sign up for free
          </Link>
        </div>

        <div className="mt-20 flex flex-col items-center gap-3">
          <img src={pocketIcon} alt="Pocket" className="w-16 h-16 brightness-0 invert" />
          <div className="text-white text-2xl font-bold">100%</div>
          <div className="text-white/70 text-xs tracking-[0.2em]">FREE TO START</div>
        </div>
      </div>
    </section>
  );
}
