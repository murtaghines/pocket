import { Upload, PieChart, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    number: "1",
    title: "Upload your statements",
    description: "Upload your bank statements in Excel or PDF format. We support most banks.",
    icon: Upload,
  },
  {
    number: "2",
    title: "Automatic analysis",
    description: "Our system automatically categorizes your transactions and generates personalized insights.",
    icon: PieChart,
  },
  {
    number: "3",
    title: "Make better decisions",
    description: "Visualize your expenses, identify patterns, and optimize your finances with clear data.",
    icon: TrendingUp,
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 lg:py-32 bg-[#f8f8f8]">
      <div className="container px-4 md:px-6">
        {/* Section header */}
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-[#0a0a0a]">
            From messy data to
            <br />
            <span className="text-[#6b7280]">total financial clarity</span>
          </h2>
          
          <p className="text-lg text-[#6b7280] max-w-xl mx-auto">
            Define your path and start improving your finances in minutes.
          </p>
        </div>

        {/* Steps - alternating layout */}
        <div className="space-y-0">
          {steps.map((step, index) => (
            <div 
              key={step.number}
              className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-center ${
                index !== steps.length - 1 ? 'border-b border-[#e5e5e5]' : ''
              }`}
            >
              {/* Left side - Text content */}
              <div className={`py-16 lg:py-24 ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                <div className="flex items-start gap-6">
                  <span className="text-4xl font-bold text-[#d1d5db]">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-4 text-[#0a0a0a]">
                      {step.title}
                    </h3>
                    <p className="text-lg text-[#6b7280]">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right side - Visual card (dark) */}
              <div className={`py-16 lg:py-24 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                <div className="bg-[#1a1a1a] rounded-2xl p-8 relative overflow-hidden min-h-[280px] flex items-center justify-center">
                  <step.icon className="w-20 h-20 text-white/20" strokeWidth={1} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center">
                      <step.icon className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Get started link */}
        <div className="text-center mt-12">
          <Link 
            to="/auth"
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium text-lg"
          >
            Get started
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
