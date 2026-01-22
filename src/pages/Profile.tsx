import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/Header";
import { MonthlyUploadsOrganizer } from "@/components/profile/MonthlyUploadsOrganizer";
import { InvestmentUploadsOrganizer } from "@/components/profile/InvestmentUploadsOrganizer";
import { ProfileInfoCard } from "@/components/profile/ProfileInfoCard";
import { PreferencesForm } from "@/components/settings/PreferencesForm";
import { CategoriesEditor } from "@/components/settings/CategoriesEditor";
import { DeleteAccountDialog } from "@/components/profile/DeleteAccountDialog";
import { FileText, TrendingUp } from "lucide-react";

export default function Profile() {
  const { t } = useTranslation('profile');
  const { t: tc } = useTranslation('common');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-4 md:px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            {t('title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <ProfileInfoCard />

            <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
              <PreferencesForm />
            </div>

            <div className="animate-slide-up" style={{ animationDelay: '150ms' }}>
              <CategoriesEditor />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="text-base font-medium">{t('uploads.title')}</h3>
              </div>
              <MonthlyUploadsOrganizer />
            </div>

            <div className="animate-slide-up" style={{ animationDelay: '250ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="text-base font-medium">{t('uploads.investmentUploads')}</h3>
              </div>
              <InvestmentUploadsOrganizer />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t mt-12">
        <div className="container px-4 md:px-6 py-8 space-y-8">
          <div className="max-w-xs mx-auto">
            <DeleteAccountDialog />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            fint
          </p>
        </div>
      </footer>
    </div>
  );
}
