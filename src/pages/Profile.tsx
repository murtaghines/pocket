import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadsManager } from "@/components/dashboard/UploadsManager";
import { useAuth } from "@/hooks/useAuth";
import { User, Mail, Calendar } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();

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
          </CardContent>
        </Card>

        {/* Uploads Manager */}
        <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <UploadsManager />
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