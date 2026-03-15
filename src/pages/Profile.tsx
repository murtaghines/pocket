import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProfileInfoCard } from "@/components/profile/ProfileInfoCard";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { PreferencesForm } from "@/components/settings/PreferencesForm";
import { CategoriesEditor } from "@/components/settings/CategoriesEditor";
import { AccountsManager } from "@/components/settings/AccountsManager";
import { DeleteAccountDialog } from "@/components/profile/DeleteAccountDialog";
import { User, Globe, Tags, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { t } = useTranslation('profile');
  const { t: tc } = useTranslation('common');
  const { t: ts } = useTranslation('settings');
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    await signOut();
    toast({
      title: tc('navigation.logoutSuccess'),
    });
    navigate("/auth", { replace: true });
  };

  return (
    <DashboardLayout>
      <div 
        className={`transition-opacity duration-300 ${
          isLoggingOut ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <main className="max-w-[1400px] mx-auto">
          <div className="bg-card rounded-xl md:rounded-2xl p-4 md:p-8" style={{ boxShadow: 'var(--shadow-section)' }}>
            {/* Profile Header */}
            <div className="mb-8">
              <ProfileHeader />
            </div>

            {/* Settings content */}
            <div className="space-y-6">
              {/* Personal Info & Regional Settings - same row, equal height */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="animate-slide-up flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-4 h-4 text-primary" />
                    <h3 className="text-base font-medium text-foreground">{t('personalInfo.title')}</h3>
                  </div>
                  <ProfileInfoCard onLogout={handleLogout} className="flex-1" />
                </div>

                <div className="animate-slide-up flex flex-col" style={{ animationDelay: '100ms' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-4 h-4 text-primary" />
                    <h3 className="text-base font-medium text-foreground">{ts('regional.title')}</h3>
                  </div>
                  <PreferencesForm className="flex-1" />
                </div>
              </div>

              {/* Categories - full width */}
              <div className="animate-slide-up" style={{ animationDelay: '150ms' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Tags className="w-4 h-4 text-primary" />
                  <h3 className="text-base font-medium text-foreground">{ts('categories.title')}</h3>
                </div>
                <CategoriesEditor />
              </div>

              {/* Accounts */}
              <div className="animate-slide-up" style={{ animationDelay: '175ms' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4 text-primary" />
                  <h3 className="text-base font-medium text-foreground">{t('accounts.title', 'Accounts')}</h3>
                </div>
                <AccountsManager />
              </div>

              {/* Delete Account */}
              <div className="animate-slide-up pt-8 border-t" style={{ animationDelay: '200ms' }}>
                <div className="max-w-xs mx-auto">
                  <DeleteAccountDialog />
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="mt-12 relative z-10">
          <div className="container px-4 md:px-6 py-6">
            <p className="text-sm text-muted-foreground text-center">
              pocket
            </p>
          </div>
        </footer>
      </div>
    </DashboardLayout>
  );
}
