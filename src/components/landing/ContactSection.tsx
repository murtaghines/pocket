import { Bell, TrendingUp, Globe } from "lucide-react";

const benefits = [
  {
    icon: Bell,
    title: "Instant categorization",
    body: "Every transaction is sorted the moment your statement lands.",
  },
  {
    icon: TrendingUp,
    title: "Spot trends in seconds",
    body: "Beautiful charts make patterns and outliers obvious.",
  },
  {
    icon: Globe,
    title: "Multi-currency, multi-bank",
    body: "Connect every account you have, in any currency.",
  },
];

export function ContactSection() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden" style={{ background: "#0A1F2E" }}>
      <div className="container px-6 relative z-10">
        <div className="text-center mb-16">
          <p className="text-xs font-bold tracking-[0.25em] text-white/50 mb-4">WHY POCKET</p>
          <h2
            className="font-black text-white uppercase leading-[0.92] tracking-tight"
            style={{ fontSize: "clamp(2.5rem, 8vw, 6rem)" }}
          >
            Our benefits
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {benefits.map((b, i) => (
            <div
              key={b.title}
              className="bg-white rounded-3xl p-8 shadow-2xl"
              style={{ transform: `rotate(${i % 2 === 0 ? -2 : 2}deg)` }}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#3391D0]/10 flex items-center justify-center mb-6">
                <b.icon className="w-7 h-7 text-[#3391D0]" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-[#0F4264] mb-2">{b.title}</h3>
              <p className="text-sm text-[#6b7280] leading-relaxed">{b.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <p className="text-xs font-bold tracking-[0.25em] text-[#FDB813] mb-3">PRIVATE BY DEFAULT</p>
          <p className="text-white/70 max-w-xl mx-auto">
            Your data is encrypted and never shared. You stay in control of every byte.
          </p>
        </div>
      </div>
    </section>
  );
}
