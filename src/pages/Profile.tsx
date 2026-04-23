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
import { User, Globe, Tags, Trash2, Landmark } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

function SectionHeader({ icon: Icon, title, delay = "0ms" }: { icon: React.ElementType; title: string; delay?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
    </div>
  );
}

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
        <main className="max-w-[1400px] mx-auto space-y-6">
          {/* Profile Header */}
          <div className="bg-card rounded-xl p-5 md:p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
            <ProfileHeader />
          </div>

          {/* Personal Info & Regional Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl p-5 md:p-6">
              <SectionHeader icon={User} title={t('personalInfo.title')} />
              <div className="mt-4">
                <ProfileInfoCard onLogout={handleLogout} />
              </div>
            </div>

            <div className="bg-card rounded-xl p-5 md:p-6">
              <SectionHeader icon={Globe} title={ts('regional.title')} />
              <div className="mt-4">
                <PreferencesForm />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="bg-card rounded-xl p-5 md:p-6">
            <SectionHeader icon={Tags} title={ts('categories.title')} />
            <div className="mt-4">
              <CategoriesEditor />
            </div>
          </div>

          {/* Banking Accounts */}
          <div className="bg-card rounded-xl p-5 md:p-6">
            <SectionHeader icon={Landmark} title={t('accounts.title', { defaultValue: 'Banking Accounts' })} />
            <p className="text-xs text-muted-foreground mt-2 mb-4">
              {t('accounts.managerDescription', { defaultValue: 'Manage your bank accounts and cards. These appear when uploading files.' })}
            </p>
            <AccountsManager className="!shadow-none !p-0 !border-0 !bg-transparent" />
          </div>

          {/* Delete Account */}
          <div className="bg-card rounded-xl p-5 md:p-6">
            <SectionHeader icon={Trash2} title={t('account.title')} />
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-4">
                {t('account.deleteWarning')}
              </p>
              <div className="max-w-xs">
                <DeleteAccountDialog />
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
