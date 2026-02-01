import { Upload, PieChart, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    number: "1",
    title: "Upload your statements",
    description: "Upload your bank statements in Excel or PDF format. We support most banks.",
    icon: Upload,
    link: { text: "Supported formats", href: "#" },
  },
  {
    number: "2",
    title: "Automatic analysis",
    description: "Our system automatically categorizes your transactions and generates personalized insights.",
    icon: PieChart,
    link: { text: "See example", href: "#" },
  },
  {
    number: "3",
    title: "Make better decisions",
    description: "Visualize your expenses, identify patterns, and optimize your finances with clear data.",
    icon: TrendingUp,
    link: { text: "Get started", href: "/auth" },
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 lg:py-32">
      <div className="container px-4 md:px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <div className="w-5 h-5 bg-primary rounded-full" />
            </div>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            From messy data to
            <br />
            <span className="text-muted-foreground">total financial clarity</span>
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Define your path and start improving your finances in minutes.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-0">
          {steps.map((step, index) => (
            <div 
              key={step.number}
              className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-center py-16 lg:py-24 ${
                index !== steps.length - 1 ? 'border-b border-border/30' : ''
              }`}
            >
              {/* Left side - Text content */}
              <div className={`${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                <div className="flex items-start gap-6">
                  <span className="text-4xl font-bold text-muted-foreground/30">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-4">
                      {step.title}
                    </h3>
                    <p className="text-lg text-muted-foreground mb-6">
                      {step.description}
                    </p>
                    {step.link.href.startsWith('/') ? (
                      <Link 
                        to={step.link.href}
                        className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                      >
                        {step.link.text}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <a 
                        href={step.link.href}
                        className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                      >
                        {step.link.text}
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Right side - Visual */}
              <div className={`${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                <div className="bg-card border border-border/50 rounded-2xl p-8 relative overflow-hidden">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
                  
                  <div className="relative flex items-center justify-center min-h-[200px]">
                    <step.icon className="w-24 h-24 text-primary/20" strokeWidth={1} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <step.icon className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
