import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-20 lg:py-32 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
      
      <div className="container px-4 md:px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Start taking control
            <br />
            of your finances today
          </h2>
          
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Sign up for free and discover how wallet can help you make better financial decisions.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="rounded-full px-8 py-6 text-lg font-medium shadow-glow w-full sm:w-auto">
                Create free account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/auth?mode=login">
              <Button variant="outline" size="lg" className="rounded-full px-8 py-6 text-lg font-medium w-full sm:w-auto">
                I already have an account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
