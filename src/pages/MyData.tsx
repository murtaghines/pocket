import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MonthlyUploadsOrganizer } from "@/components/profile/MonthlyUploadsOrganizer";
import { InvestmentUploadsOrganizer } from "@/components/profile/InvestmentUploadsOrganizer";
import { FileText, TrendingUp } from "lucide-react";

export default function MyData() {
  const { t } = useTranslation('profile');
  const [searchParams, setSearchParams] = useSearchParams();

  const highlightSection = searchParams.get('section');
  const highlightMonth = searchParams.get('month');

  useEffect(() => {
    if (highlightSection && highlightMonth) {
      const timer = setTimeout(() => {
        const elementId = highlightSection === 'bank' 
          ? `upload-bank-${highlightMonth}` 
          : `upload-investment-${highlightMonth}`;
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 2000);
        }
        setSearchParams({});
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlightSection, highlightMonth, setSearchParams]);

  return (
    <DashboardLayout>
      <main className="max-w-[1400px] mx-auto space-y-4">
        {/* Bank Statements - Full width */}
        <div className="bg-card rounded-xl md:rounded-2xl p-4 md:p-8" style={{ boxShadow: 'var(--shadow-section)' }}>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xl font-bold tracking-tight">
              {t('uploads.bankStatements', 'Bank Statements')}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            {t('uploads.uploadBankStatements')}
          </p>
          <MonthlyUploadsOrganizer />
        </div>

        {/* Investment Uploads - Full width */}
        <div className="bg-card rounded-xl md:rounded-2xl p-4 md:p-8" style={{ boxShadow: 'var(--shadow-section)' }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xl font-bold tracking-tight">
              {t('uploads.investmentUploads')}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            {t('uploads.uploadStatements')}
          </p>
          <InvestmentUploadsOrganizer />
        </div>
      </main>

      <footer className="mt-12 relative z-10">
        <div className="container px-4 md:px-6 py-6">
          <p className="text-sm text-muted-foreground text-center">
            pocket
          </p>
        </div>
      </footer>
    </DashboardLayout>
  );
}
