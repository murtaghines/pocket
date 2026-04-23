import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { UnifiedUploadsTable } from "@/components/profile/UnifiedUploadsTable";
import { InvestmentUploadsOrganizer } from "@/components/profile/InvestmentUploadsOrganizer";
import { FileText, TrendingUp } from "lucide-react";

export default function MyData() {
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
      <main className="max-w-[1400px] mx-auto">
        <div className="space-y-4">
            {/* Bank Statements */}
            <div className="bg-card rounded-xl md:rounded-2xl p-4 md:p-8" style={{ boxShadow: 'var(--shadow-section)' }}>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
                  Upload your bank statements, credit card bills, or expense reports
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Accepted formats: Excel (.xlsx, .xls), CSV, PDF
              </p>
              <UnifiedUploadsTable />
            </div>

            {/* Investment Uploads */}
            <div className="bg-card rounded-xl md:rounded-2xl p-4 md:p-8" style={{ boxShadow: 'var(--shadow-section)' }}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
                  Upload your investment statements or portfolio reports
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Accepted formats: Excel (.xlsx, .xls), CSV, PDF
              </p>
              <InvestmentUploadsOrganizer />
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
    </DashboardLayout>
  );
}
