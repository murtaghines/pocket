import { Sparkles, TrendingUp, Globe, Lock, RefreshCw, Layers } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const benefits = [
  {
    Icon: Sparkles,
    title: "Instant categorization",
    body: "Every transaction is sorted the moment your statement lands. Rules → regex → AI fallback.",
    accent: "#1b76ff",
  },
  {
    Icon: TrendingUp,
    title: "Spot trends in seconds",
    body: "Beautiful charts make patterns and outliers obvious at a glance.",
    accent: "#FFBB03",
    dark: true,
  },
  {
    Icon: Globe,
    title: "Multi-currency, multi-bank",
    body: "Connect every account you have, in any currency. Pocket converts everything to your base.",
    accent: "#1b76ff",
  },
  {
    Icon: Lock,
    title: "Private by default",
    body: "Your data is encrypted and never shared. You stay in control of every byte.",
    accent: "#FFBB03",
    dark: true,
  },
  {
    Icon: RefreshCw,
    title: "It learns from you",
    body: "Recategorize once — Pocket remembers forever. Gets smarter with every correction.",
    accent: "#1b76ff",
  },
  {
    Icon: Layers,
    title: "Investments included",
    body: "Portfolio tracking by platform and asset type, separate from your spending view.",
    accent: "#FFBB03",
    dark: true,
  },
];

function BenefitCard({
  b,
  i,
}: {
  b: (typeof benefits)[number];
  i: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.2);
  const rotation = i % 3 === 0 ? -1.5 : i % 3 === 1 ? 1.5 : -1;

  return (
    <div
      ref={ref}
      className="bg-white rounded-3xl p-7 shadow-2xl transition-all duration-700 ease-out"
      style={{
        transform: inView ? `rotate(${rotation}deg) translateY(0)` : `rotate(${rotation}deg) translateY(24px)`,
        opacity: inView ? 1 : 0,
        transitionDelay: `${i * 80}ms`,
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: `${b.accent}18` }}
      >
        <b.Icon className="w-7 h-7" style={{ color: b.accent }} strokeWidth={1.8} />
      </div>
      <h3 className="text-lg font-black text-[#080808] mb-2 leading-tight">{b.title}</h3>
      <p className="text-sm text-[#6b7280] leading-relaxed">{b.body}</p>
    </div>
  );
}

export function ContactSection() {
  return (
    <section
      data-nav-theme="dark"
      className="py-24 lg:py-36 relative overflow-hidden"
      style={{ background: "#080808" }}
    >
      {/* Background texture — subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="container px-6 relative z-10">
        <div className="text-center mb-16">
          <p className="text-[10px] font-bold tracking-[0.3em] text-white/40 mb-4">WHY POCKET</p>
          <h2
            className="font-black text-white uppercase leading-[0.92] tracking-tight"
            style={{ fontSize: "clamp(2.5rem, 8vw, 6rem)" }}
          >
            Our
            <br />
            <span style={{ color: "#FFBB03" }}>benefits</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {benefits.map((b, i) => (
            <BenefitCard key={b.title} b={b} i={i} />
          ))}
        </div>

        {/* Bottom tagline */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-6 py-3">
            <div className="w-2 h-2 rounded-full bg-[#FFBB03]" />
            <p className="text-sm text-white/60 font-semibold">
              Zero manual entry. Just upload and go.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
