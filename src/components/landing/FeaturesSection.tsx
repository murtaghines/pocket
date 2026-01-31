import { FileSpreadsheet, Shield, Zap, PiggyBank, BarChart3, Globe } from "lucide-react";

const features = [
  {
    label: "AUTOMATIZADO",
    icon: FileSpreadsheet,
    title: "Importación inteligente",
    titleSecondLine: "de extractos",
    description: "Sube tus archivos Excel o PDF y nuestro sistema extrae y categoriza automáticamente todas tus transacciones.",
    color: "from-green-500/20 to-green-500/5",
    iconBg: "bg-green-500/10",
    iconColor: "text-green-500",
  },
  {
    label: "SEGURO",
    icon: Shield,
    title: "Privacidad",
    titleSecondLine: "garantizada",
    description: "Tus datos financieros están encriptados y protegidos. Nunca compartimos tu información con terceros.",
    color: "from-red-500/20 to-red-500/5",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
  },
  {
    label: "INTELIGENTE",
    icon: Zap,
    title: "Categorización",
    titleSecondLine: "automática",
    description: "La IA aprende de tus patrones y categoriza automáticamente tus gastos con precisión.",
    color: "from-primary/20 to-primary/5",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    label: "INVERSIONES",
    icon: PiggyBank,
    title: "Tracking de",
    titleSecondLine: "inversiones",
    description: "Conecta tus cuentas de inversión y visualiza todo tu patrimonio en un solo dashboard.",
    color: "from-yellow-500/20 to-yellow-500/5",
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-500",
  },
  {
    label: "ANALYTICS",
    icon: BarChart3,
    title: "Reportes",
    titleSecondLine: "detallados",
    description: "Gráficos interactivos y reportes mensuales que te ayudan a entender tus hábitos financieros.",
    color: "from-purple-500/20 to-purple-500/5",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
  },
  {
    label: "MULTI-MONEDA",
    icon: Globe,
    title: "Soporte",
    titleSecondLine: "internacional",
    description: "Trabaja con múltiples monedas y bancos de diferentes países. Conversión automática de divisas.",
    color: "from-cyan-500/20 to-cyan-500/5",
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-500",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 lg:py-32 bg-card/30">
      <div className="container px-4 md:px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="text-sm text-muted-foreground tracking-wider uppercase mb-4 block">
            Características
          </span>
          <h2 className="text-3xl md:text-5xl font-bold">
            Todo lo que necesitas para
            <br />
            <span className="text-muted-foreground">gestionar tu dinero</span>
          </h2>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div 
              key={feature.title}
              className="group bg-card border border-border/50 rounded-2xl p-6 hover:border-border transition-all duration-300 relative overflow-hidden"
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              
              <div className="relative z-10">
                {/* Label */}
                <span className="text-xs text-muted-foreground tracking-wider">
                  {feature.label}
                </span>

                {/* Icon */}
                <div className="mt-8 mb-6">
                  <div className={`w-16 h-16 rounded-2xl ${feature.iconBg} flex items-center justify-center`}>
                    <feature.icon className={`w-8 h-8 ${feature.iconColor}`} />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold mb-1">
                  {feature.title}
                </h3>
                <h3 className="text-xl font-bold text-muted-foreground mb-4">
                  {feature.titleSecondLine}
                </h3>

                {/* Description */}
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
