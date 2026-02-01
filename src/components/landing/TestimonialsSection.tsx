import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "Finally I can see all my expenses organized. I used to use Excel and wasted hours every month.",
    name: "Maria Garcia",
    role: "Entrepreneur",
    avatar: "M",
  },
  {
    quote: "The automatic categorization is incredible. It detects even the smallest expenses correctly.",
    name: "Carlos Rodriguez",
    role: "Freelancer",
    avatar: "C",
  },
  {
    quote: "Being able to see my investments alongside my expenses gives me a complete view of my finances.",
    name: "Ana Martinez",
    role: "Individual Investor",
    avatar: "A",
  },
  {
    quote: "Multi-currency support is perfect for me since I work with international clients.",
    name: "Pablo Lopez",
    role: "Consultant",
    avatar: "P",
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 lg:py-32">
      <div className="container px-4 md:px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold">
            Our users
            <br />
            <span className="text-muted-foreground">share their experience</span>
          </h2>
        </div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-card border border-border/50 rounded-2xl p-8 hover:border-border/70 transition-colors"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-lg mb-8 leading-relaxed">
                "{testimonial.quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">
                    {testimonial.avatar}
                  </span>
                </div>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
