import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import pocketIcon from "@/assets/pocket-icon.png";

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden bg-white">
      {/* Decorative yellow cloud - top right */}
      <div className="absolute -top-16 -right-16 w-64 h-64 opacity-15 pointer-events-none">
        <img src={pocketIcon} alt="" className="w-full h-full object-contain" />
      </div>
      
      <div className="container px-4 md:px-6 relative z-10">
        {/* Announcement badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#FDB813]/10 border border-[#FDB813]/30 rounded-full px-4 py-2 text-sm">
            <span className="bg-[#FDB813] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              NEW
            </span>
            <span className="text-[#0F4264]">
              Your personal AI-powered financial assistant
            </span>
            <ArrowRight className="w-4 h-4 text-[#0F4264]/50" />
          </div>
        </div>

        {/* Main headline */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-[#0F4264]">
            Take control of your finances
            <br />
            <span className="text-primary">without the hassle</span>
          </h1>
          
          <p className="text-lg md:text-xl text-[#6b7280] max-w-2xl mx-auto mb-10">
            pocket helps you organize your expenses, investments, and savings in one place. 
            Upload your bank statements and get instant insights.
          </p>

          {/* CTA Button */}
          <Link to="/auth">
            <Button size="lg" className="rounded-full px-8 py-6 text-lg font-medium shadow-lg">
              Get started for free
            </Button>
          </Link>
        </div>

        {/* Hero image / App preview */}
        <div className="mt-16 lg:mt-24 relative">
          <div className="max-w-5xl mx-auto">
            {/* Decorative cloud behind preview */}
            <div className="absolute -left-20 -bottom-10 w-48 h-48 opacity-10 pointer-events-none">
              <img src={pocketIcon} alt="" className="w-full h-full object-contain" />
            </div>
            
            {/* Dashboard preview mockup */}
            <div className="relative bg-white border border-[#e5e5e5] rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-1">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-[#f5f5f5] rounded-t-xl">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="bg-white rounded-lg px-4 py-1 text-xs text-[#6b7280]">
                      app.pocket.com
                    </div>
                  </div>
                </div>
                
                {/* Dashboard content placeholder */}
                <div className="bg-[#f8f9fa] p-3 sm:p-6 md:p-8">
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                    <div className="bg-white border border-[#e5e5e5] rounded-xl p-2 sm:p-4">
                      <div className="text-[10px] sm:text-xs text-[#6b7280] mb-1">Income</div>
                      <div className="text-sm sm:text-2xl font-bold text-success">€4,250</div>
                    </div>
                    <div className="bg-white border border-[#e5e5e5] rounded-xl p-2 sm:p-4">
                      <div className="text-[10px] sm:text-xs text-[#6b7280] mb-1">Expenses</div>
                      <div className="text-sm sm:text-2xl font-bold text-destructive">€2,180</div>
                    </div>
                    <div className="bg-white border border-[#e5e5e5] rounded-xl p-2 sm:p-4">
                      <div className="text-[10px] sm:text-xs text-[#6b7280] mb-1">Balance</div>
                      <div className="text-sm sm:text-2xl font-bold text-primary">€2,070</div>
                    </div>
                  </div>

                  {/* Chart placeholder */}
                  <div className="bg-white border border-[#e5e5e5] rounded-xl p-3 sm:p-6 h-32 sm:h-48 flex items-end justify-around gap-1 sm:gap-2">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((height, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-primary/60 to-primary rounded-t"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
