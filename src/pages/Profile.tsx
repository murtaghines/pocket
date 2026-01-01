import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonthlyUploadsOrganizer } from "@/components/profile/MonthlyUploadsOrganizer";
import { InvestmentUploadsOrganizer } from "@/components/profile/InvestmentUploadsOrganizer";
import { useAuth } from "@/hooks/useAuth";
import { User, Mail, Calendar, LogOut, FileText, TrendingUp } from "lucide-react";

export default function Profile() {
  const { user, signOut } = useAuth();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-4 md:px-6 py-8">
        {/* Page Title */}
        <div className="mb-8 animate-fade-in">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            Mi Perfil
          </h2>
          <p className="text-muted-foreground mt-1">
            Información de tu cuenta y archivos subidos
          </p>
        </div>

        {/* User Info Card */}
        <Card className="mb-8 animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Información de Usuario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Mail className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>
            {user?.created_at && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Miembro desde</p>
                  <p className="font-medium">{formatDate(user.created_at)}</p>
                </div>
              </div>
            )}
            <div className="pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={signOut}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upload Sections */}
        <div className="space-y-8">
          {/* Bank Statements Section */}
          <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Extractos Bancarios</h3>
            </div>
            <MonthlyUploadsOrganizer />
          </div>

          {/* Investments Section */}
          <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Inversiones y Ahorro</h3>
            </div>
            <InvestmentUploadsOrganizer />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container px-4 md:px-6 py-6">
          <p className="text-sm text-muted-foreground text-center">
            FinanceFlow • Control financiero personal
          </p>
        </div>
      </footer>
    </div>
  );
}