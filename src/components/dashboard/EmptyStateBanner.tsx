import { Upload, FileSpreadsheet, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface EmptyStateBannerProps {
  hasData: boolean;
}

export function EmptyStateBanner({ hasData }: EmptyStateBannerProps) {
  const navigate = useNavigate();

  if (hasData) {
    return null;
  }

  return (
    <Card className="mb-8 border-dashed border-2 border-primary/30 bg-primary/5 animate-fade-in">
      <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-primary/10">
            <FileSpreadsheet className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">¡Bienvenido a fint!</h3>
            <p className="text-muted-foreground text-sm">
              Comienza subiendo tu primer archivo de movimientos bancarios para ver tus finanzas.
            </p>
          </div>
        </div>
        <Button 
          onClick={() => navigate('/profile')}
          className="gap-2 whitespace-nowrap"
        >
          <Upload className="w-4 h-4" />
          Cargar archivo
          <ArrowRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
