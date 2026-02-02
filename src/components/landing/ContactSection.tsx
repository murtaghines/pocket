import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ContactSection() {
  return (
    <section id="contact" className="py-24 lg:py-32 bg-primary">
      <div className="container px-4 md:px-6">
        <div className="max-w-3xl">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Let us help you take
            <br />
            control of your finances.
          </h2>
          
          <p className="text-lg md:text-xl text-white/80 mb-10 max-w-xl">
            Start organizing your expenses, investments, and savings in one place. It's simpler and faster than you thought.
          </p>

          <Button 
            variant="outline"
            size="lg"
            className="rounded-full px-8 py-6 text-lg font-medium bg-white text-primary hover:bg-white/90 hover:text-primary border-white"
            onClick={() => window.location.href = '/auth'}
          >
            Get in touch
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}
