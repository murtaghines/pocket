import { useInView } from "@/hooks/useInView";

const STATEMENTS = [
  {
    tag: "01",
    headline: ["Upload.", "Done."],
    body: "Connect your bank or drop your statements. We categorize every transaction automatically — groceries, subscriptions, rent, all of it.",
  },
  {
    tag: "02",
    headline: ["See where", "it all goes."],
    body: "Your full financial picture in one place. Income, expenses, and balance — clear, visual, real-time.",
  },
  {
    tag: "03",
    headline: ["Plan what", "comes next."],
    body: "Set budgets, track savings goals, and build habits that actually stick. Your future self will thank you.",
  },
];

function Statement({
  tag,
  headline,
  body,
  index,
}: {
  tag: string;
  headline: string[];
  body: string;
  index: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.25);

  return (
    <div
      ref={ref}
      className="min-h-screen flex flex-col justify-center"
      style={{ padding: "0 clamp(2rem, 8vw, 9rem)" }}
    >
      {/* Tag */}
      <div
        className="font-bold tabular-nums mb-8 transition-all duration-700"
        style={{
          fontSize: "0.7rem",
          letterSpacing: "0.22em",
          color: "#1b76ff",
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(20px)",
          transitionDelay: "0ms",
        }}
      >
        {tag}
      </div>

      {/* Headline */}
      <h2
        className="font-black text-white uppercase leading-[0.88] tracking-tight"
        style={{ fontSize: "clamp(3.5rem, 10vw, 9.5rem)" }}
      >
        {headline.map((line, i) => (
          <span
            key={i}
            className="block transition-all duration-700"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(60px)",
              transitionDelay: `${80 + i * 80}ms`,
            }}
          >
            {line}
          </span>
        ))}
      </h2>

      {/* Body */}
      <p
        className="mt-10 leading-relaxed transition-all duration-700"
        style={{
          fontSize: "clamp(0.95rem, 1.4vw, 1.15rem)",
          maxWidth: "36ch",
          color: "rgba(255,255,255,0.42)",
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(24px)",
          transitionDelay: "280ms",
        }}
      >
        {body}
      </p>
    </div>
  );
}

export function AppShowcaseSection() {
  return (
    <section
      data-nav-theme="dark"
      style={{
        background: "#080808",
        borderRadius: "2rem 2rem 0 0",
        position: "relative",
        zIndex: 1,
      }}
    >
      {STATEMENTS.map((s, i) => (
        <Statement key={s.tag} {...s} index={i} />
      ))}
    </section>
  );
}
