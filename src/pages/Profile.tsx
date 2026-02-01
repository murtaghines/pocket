import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { MonthlyUploadsOrganizer } from "@/components/profile/MonthlyUploadsOrganizer";
import { InvestmentUploadsOrganizer } from "@/components/profile/InvestmentUploadsOrganizer";
import { ProfileInfoCard } from "@/components/profile/ProfileInfoCard";
import { PreferencesForm } from "@/components/settings/PreferencesForm";
import { CategoriesEditor } from "@/components/settings/CategoriesEditor";
import { DeleteAccountDialog } from "@/components/profile/DeleteAccountDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, TrendingUp, User, Globe, Tags, Settings, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { t } = useTranslation('profile');
  const { t: tc } = useTranslation('common');
  const { t: ts } = useTranslation('settings');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Sync tab with URL params
  const currentTab = searchParams.get('tab') || 'data';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

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
        className={`pb-20 md:pb-0 transition-opacity duration-300 ${
          isLoggingOut ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <MobileBottomNav />
        
        <div className="container px-4 md:px-6 py-8">
          <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
            {/* Header with title and tabs on the same row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in">
              <h2 className="font-display text-3xl font-bold tracking-tight">
                {t('title')}
              </h2>
              
              {/* Hide tabs on mobile - controlled by bottom nav */}
              <TabsList className="hidden md:inline-flex bg-muted p-1.5 rounded-xl shadow-sm">
                <TabsTrigger 
                  value="data" 
                  className="gap-2 px-5 py-2.5 rounded-lg font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
                >
                  <Upload className="w-4 h-4" />
                  {t('tabs.data')}
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="gap-2 px-5 py-2.5 rounded-lg font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
                >
                  <Settings className="w-4 h-4" />
                  {t('tabs.settings')}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* My Data Tab - First */}
            <TabsContent value="data" className="animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="animate-slide-up">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-4 h-4 text-primary" />
                    <h3 className="text-base font-medium">{t('uploads.title')}</h3>
                  </div>
                  <MonthlyUploadsOrganizer />
                </div>

                <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <h3 className="text-base font-medium">{t('uploads.investmentUploads')}</h3>
                  </div>
                  <InvestmentUploadsOrganizer />
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="animate-fade-in space-y-6">
              {/* Personal Info & Regional Settings - same row, equal height */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="animate-slide-up flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-4 h-4 text-primary" />
                    <h3 className="text-base font-medium">{t('personalInfo.title')}</h3>
                  </div>
                  <ProfileInfoCard onLogout={handleLogout} className="flex-1" />
                </div>

                <div className="animate-slide-up flex flex-col" style={{ animationDelay: '100ms' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-4 h-4 text-primary" />
                    <h3 className="text-base font-medium">{ts('regional.title')}</h3>
                  </div>
                  <PreferencesForm className="flex-1" />
                </div>
              </div>

              {/* Categories - full width */}
              <div className="animate-slide-up" style={{ animationDelay: '150ms' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Tags className="w-4 h-4 text-primary" />
                  <h3 className="text-base font-medium">{ts('categories.title')}</h3>
                </div>
                <CategoriesEditor />
              </div>

              {/* Delete Account - Only in Settings tab */}
              <div className="animate-slide-up pt-8 border-t" style={{ animationDelay: '200ms' }}>
                <div className="max-w-xs mx-auto">
                  <DeleteAccountDialog />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <footer className="border-t mt-12">
          <div className="container px-4 md:px-6 py-6">
            <p className="text-sm text-muted-foreground text-center">
              wallet
            </p>
          </div>
        </footer>
      </div>
    </DashboardLayout>
  );
}
