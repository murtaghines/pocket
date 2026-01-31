import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "Finalmente puedo ver todos mis gastos organizados. Antes usaba Excel y perdía horas cada mes.",
    name: "María García",
    role: "Emprendedora",
    avatar: "M",
  },
  {
    quote: "La categorización automática es increíble. Detecta hasta los gastos más pequeños correctamente.",
    name: "Carlos Rodríguez",
    role: "Freelancer",
    avatar: "C",
  },
  {
    quote: "Poder ver mis inversiones junto con mis gastos me da una visión completa de mis finanzas.",
    name: "Ana Martínez",
    role: "Inversora particular",
    avatar: "A",
  },
  {
    quote: "El soporte multi-moneda es perfecto para mí que trabajo con clientes internacionales.",
    name: "Pablo López",
    role: "Consultor",
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
            Nuestros usuarios
            <br />
            <span className="text-muted-foreground">cuentan su experiencia</span>
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
