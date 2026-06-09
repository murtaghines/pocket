import { useInView } from "@/hooks/useInView";

export function StatementSection() {
  const { ref, inView } = useInView<HTMLElement>(0.15);

  const words = [
    { text: "WHETHER", color: "#1b76ff" },
    { text: "YOU", color: "#FFBB03" },
    { text: "SPEND,", color: "#080808" },
    { text: "SAVE", color: "#1b76ff" },
    { text: "OR", color: "#080808" },
    { text: "INVEST,", color: "#FFBB03" },
    { text: "POCKET", color: "#1b76ff" },
    { text: "HAS", color: "#080808" },
    { text: "YOU", color: "#FFBB03" },
    { text: "COVERED.", color: "#080808" },
  ];

  return (
    <section
      ref={ref}
      data-nav-theme="light"
      className="bg-white py-32 lg:py-56 overflow-hidden"
    >
      <div className="container px-6">
        <div
          className="font-black uppercase leading-[0.9] tracking-tight transition-all duration-1000 ease-out"
          style={{
            fontSize: "clamp(2.5rem, 9vw, 8rem)",
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(32px)",
          }}
        >
          {words.map((w, i) => (
            <span
              key={i}
              style={{
                color: w.color,
                display: "inline-block",
                marginRight: "0.25em",
                transitionDelay: `${i * 60}ms`,
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
              }}
            >
              {w.text}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
