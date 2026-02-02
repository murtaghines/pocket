import { Upload, Brain, Target, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "1",
    title: "Upload your statements.",
    description: "Simply drag and drop your bank statements in Excel or PDF format.",
    cta: "Upload files",
    icon: Upload,
  },
  {
    number: "2",
    title: "AI-powered analysis.",
    description: "Our intelligent system automatically categorizes every transaction and generates personalized insights.",
    cta: "See how it works",
    icon: Brain,
  },
  {
    number: "3",
    title: "Take control.",
    description: "Get crystal-clear visibility into your finances with intuitive visualizations.",
    cta: "Start for free",
    icon: Target,
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-white">
      {/* Section header */}
      <div className="py-20 lg:py-28 border-b border-[#e5e5e5]">
        <div className="container px-4 md:px-6 lg:px-16">
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

      {/* Steps - Autonoma style 50/50 layout */}
      {steps.map((step, index) => (
        <div 
          key={step.number}
          className="border-b border-[#e5e5e5]"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[400px] lg:min-h-[500px]">
            {/* Left side - Content (white background) */}
            <div className="bg-white flex items-center px-8 lg:px-16 xl:px-24 py-16">
              <div className="max-w-md">
                <span className="text-sm font-medium text-[#0a0a0a] mb-6 block">
                  {step.number}
                </span>
                <h3 className="text-2xl lg:text-3xl font-bold text-[#0a0a0a] mb-4">
                  {step.title}
                </h3>
                <p className="text-base text-[#6b7280] mb-6 leading-relaxed">
                  {step.description}
                </p>
                <Link 
                  to="/auth" 
                  className="text-primary font-medium inline-flex items-center gap-2 hover:gap-3 transition-all duration-200"
                >
                  {step.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            
            {/* Right side - Visual (gray background) */}
            <div className="bg-[#f5f5f5] flex items-center justify-center p-8 lg:p-12">
              <div className="bg-[#1a1a1a] rounded-xl w-full max-w-lg aspect-[4/3] flex items-center justify-center">
                <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <step.icon className="w-8 h-8 lg:w-10 lg:h-10 text-primary" />
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
