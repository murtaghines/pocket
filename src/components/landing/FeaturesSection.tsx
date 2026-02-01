import { FileSpreadsheet, Shield, Zap, PiggyBank, BarChart3, Globe } from "lucide-react";

const features = [
  {
    label: "AUTOMATED",
    icon: FileSpreadsheet,
    title: "Smart import",
    titleSecondLine: "of statements",
    description: "Upload your Excel or PDF files and our system automatically extracts and categorizes all your transactions.",
    color: "from-green-500/20 to-green-500/5",
    iconBg: "bg-green-500/10",
    iconColor: "text-green-500",
  },
  {
    label: "SECURE",
    icon: Shield,
    title: "Privacy",
    titleSecondLine: "guaranteed",
    description: "Your financial data is encrypted and protected. We never share your information with third parties.",
    color: "from-red-500/20 to-red-500/5",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
  },
  {
    label: "INTELLIGENT",
    icon: Zap,
    title: "Automatic",
    titleSecondLine: "categorization",
    description: "AI learns from your patterns and automatically categorizes your expenses with precision.",
    color: "from-primary/20 to-primary/5",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    label: "INVESTMENTS",
    icon: PiggyBank,
    title: "Investment",
    titleSecondLine: "tracking",
    description: "Connect your investment accounts and visualize your entire portfolio in a single dashboard.",
    color: "from-yellow-500/20 to-yellow-500/5",
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-500",
  },
  {
    label: "ANALYTICS",
    icon: BarChart3,
    title: "Detailed",
    titleSecondLine: "reports",
    description: "Interactive charts and monthly reports that help you understand your financial habits.",
    color: "from-purple-500/20 to-purple-500/5",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
  },
  {
    label: "MULTI-CURRENCY",
    icon: Globe,
    title: "International",
    titleSecondLine: "support",
    description: "Work with multiple currencies and banks from different countries. Automatic currency conversion.",
    color: "from-cyan-500/20 to-cyan-500/5",
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-500",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 lg:py-32 bg-card/30">
      <div className="container px-4 md:px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="text-sm text-muted-foreground tracking-wider uppercase mb-4 block">
            Features
          </span>
          <h2 className="text-3xl md:text-5xl font-bold">
            Everything you need to
            <br />
            <span className="text-muted-foreground">manage your money</span>
          </h2>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div 
              key={feature.title}
              className="group bg-card border border-border/50 rounded-2xl p-6 hover:border-border transition-all duration-300 relative overflow-hidden"
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              
              <div className="relative z-10">
                {/* Label */}
                <span className="text-xs text-muted-foreground tracking-wider">
                  {feature.label}
                </span>

                {/* Icon */}
                <div className="mt-8 mb-6">
                  <div className={`w-16 h-16 rounded-2xl ${feature.iconBg} flex items-center justify-center`}>
                    <feature.icon className={`w-8 h-8 ${feature.iconColor}`} />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold mb-1">
                  {feature.title}
                </h3>
                <h3 className="text-xl font-bold text-muted-foreground mb-4">
                  {feature.titleSecondLine}
                </h3>

                {/* Description */}
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
