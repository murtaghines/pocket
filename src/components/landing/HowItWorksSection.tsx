import { Upload, Brain, Target, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import pocketIcon from "@/assets/pocket-icon.png";

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
      <div className="py-20 lg:py-28 border-b border-[#e5e5e5] relative overflow-hidden">
        {/* Decorative cloud */}
        <div className="absolute -top-10 -right-10 w-48 h-48 opacity-8 pointer-events-none">
          <img src={pocketIcon} alt="" className="w-full h-full object-contain" />
        </div>
        <div className="container px-4 md:px-6 lg:px-16 relative z-10">
          <div className="max-w-3xl">
            <p className="text-sm text-[#6b7280] uppercase tracking-wider mb-4">
              How it works
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0F4264] leading-tight">
              From messy data to
              <br />
              <span className="text-[#9ca3af]">total financial clarity.</span>
            </h2>
          </div>
        </div>
      </div>

      {/* Steps - 50/50 layout */}
      {steps.map((step, index) => (
        <div 
          key={step.number}
          className="border-b border-[#e5e5e5]"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[400px] lg:min-h-[500px]">
            {/* Left side - Content */}
            <div className="bg-white flex items-center px-8 lg:px-16 xl:px-24 py-16">
              <div className="max-w-md">
                <span className="text-sm font-medium text-[#0F4264] mb-6 block">
                  {step.number}
                </span>
                <h3 className="text-2xl lg:text-3xl font-bold text-[#0F4264] mb-4">
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
            
            {/* Right side - Visual */}
            <div className="bg-[#f5f5f5] flex items-center justify-center p-8 lg:p-12 relative overflow-hidden">
              {/* Subtle cloud decoration */}
              {index === 0 && (
                <div className="absolute -bottom-8 -left-8 w-32 h-32 opacity-10 pointer-events-none">
                  <img src={pocketIcon} alt="" className="w-full h-full object-contain" />
                </div>
              )}
              <div className="bg-[#0F4264] rounded-xl w-full max-w-lg aspect-[4/3] flex items-center justify-center">
                <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-white/10 flex items-center justify-center">
                  <step.icon className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
