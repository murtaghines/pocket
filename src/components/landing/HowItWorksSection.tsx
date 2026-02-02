import { Upload, Brain, Target, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "1",
    title: "Upload your statements.",
    description: "Simply drag and drop your bank statements in Excel or PDF format. We support most major banks and financial institutions worldwide.",
    icon: Upload,
    bgColor: "bg-white",
    textColor: "text-[#0a0a0a]",
  },
  {
    number: "2",
    title: "AI-powered analysis.",
    description: "Our intelligent system automatically categorizes every transaction, detects patterns, and generates personalized insights tailored to your spending habits.",
    icon: Brain,
    bgColor: "bg-[#f5f5f5]",
    textColor: "text-[#0a0a0a]",
  },
  {
    number: "3",
    title: "Take control.",
    description: "Get crystal-clear visibility into your finances. Track expenses, monitor savings goals, and make informed decisions with intuitive visualizations.",
    icon: Target,
    bgColor: "bg-white",
    textColor: "text-[#0a0a0a]",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-white">
      {/* Section header */}
      <div className="py-20 lg:py-28 border-b border-[#e5e5e5]">
        <div className="container px-4 md:px-6">
          <div className="max-w-3xl">
            <p className="text-sm text-[#6b7280] uppercase tracking-wider mb-4">
              How it works
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0a0a0a] leading-tight">
              From messy data to
              <br />
              <span className="text-[#9ca3af]">total financial clarity.</span>
            </h2>
          </div>
        </div>
      </div>

      {/* Steps - Vertical layout */}
      {steps.map((step, index) => (
        <div 
          key={step.number}
          className={`${step.bgColor} border-b border-[#e5e5e5]`}
        >
          <div className="container px-4 md:px-6">
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 py-16 lg:py-24 items-center">
              {/* Number */}
              <div className="lg:col-span-1">
                <span className="text-6xl lg:text-7xl font-bold text-[#0a0a0a]">
                  {step.number}
                </span>
              </div>
              
              {/* Content */}
              <div className="lg:col-span-5">
                <h3 className={`text-2xl md:text-3xl lg:text-4xl font-bold mb-4 ${step.textColor}`}>
                  {step.title}
                </h3>
                <p className="text-lg text-[#6b7280] leading-relaxed max-w-lg">
                  {step.description}
                </p>
              </div>
              
              {/* Visual placeholder - Icon card */}
              <div className="lg:col-span-6">
                <div className="bg-[#1a1a1a] rounded-2xl p-8 lg:p-12 flex items-center justify-center min-h-[280px] lg:min-h-[360px]">
                  <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-primary/20 flex items-center justify-center">
                    <step.icon className="w-10 h-10 lg:w-12 lg:h-12 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* CTA */}
      <div className="py-16 lg:py-20 bg-white">
        <div className="container px-4 md:px-6 text-center">
          <Link to="/auth">
            <Button 
              size="lg" 
              className="rounded-full px-8 py-6 text-lg font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
            >
              Start for free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <p className="text-sm text-[#9ca3af] mt-4">
            No credit card required • Free forever for personal use
          </p>
        </div>
      </div>
    </section>
  );
}
