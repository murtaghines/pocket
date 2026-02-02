import { Upload, PieChart, TrendingUp, FileSpreadsheet, Brain, Target, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "01",
    title: "Upload your statements",
    description: "Simply drag and drop your bank statements in Excel or PDF format. We support most major banks and financial institutions worldwide.",
    icon: Upload,
    features: ["Excel & PDF support", "Multi-bank compatible", "Secure encryption"],
  },
  {
    number: "02",
    title: "AI-powered analysis",
    description: "Our intelligent system automatically categorizes every transaction, detects patterns, and generates personalized insights tailored to your spending habits.",
    icon: Brain,
    features: ["Smart categorization", "Pattern detection", "Personalized insights"],
  },
  {
    number: "03",
    title: "Take control",
    description: "Get crystal-clear visibility into your finances. Track expenses, monitor savings goals, and make informed decisions with intuitive visualizations.",
    icon: Target,
    features: ["Visual dashboards", "Goal tracking", "Trend analysis"],
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-white">
      <div className="container px-4 md:px-6">
        {/* Section header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-full px-4 py-1.5 text-sm text-primary font-medium mb-6">
            <FileSpreadsheet className="w-4 h-4" />
            Simple 3-step process
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-[#0a0a0a] tracking-tight">
            From messy data to
            <br />
            <span className="text-[#9ca3af]">total financial clarity</span>
          </h2>
          
          <p className="text-lg md:text-xl text-[#6b7280] max-w-2xl mx-auto">
            Define your path and start improving your finances in minutes. No spreadsheet skills required.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 mb-16">
          {steps.map((step, index) => (
            <div 
              key={step.number}
              className="group relative"
            >
              {/* Connection line for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-px bg-gradient-to-r from-primary/30 to-transparent" />
              )}
              
              {/* Card */}
              <div className="relative bg-gradient-to-b from-[#fafafa] to-white border border-[#e5e7eb] rounded-2xl p-8 h-full transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1">
                {/* Step number */}
                <div className="flex items-center justify-between mb-6">
                  <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    Step {step.number}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25 group-hover:scale-110 transition-transform duration-300">
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                
                {/* Content */}
                <h3 className="text-xl md:text-2xl font-bold mb-3 text-[#0a0a0a]">
                  {step.title}
                </h3>
                <p className="text-[#6b7280] mb-6 leading-relaxed">
                  {step.description}
                </p>
                
                {/* Features list */}
                <ul className="space-y-2">
                  {step.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[#6b7280]">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
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
