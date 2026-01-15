import { Header } from "@/components/layout/Header";
import { MonthlyUploadsOrganizer } from "@/components/profile/MonthlyUploadsOrganizer";
import { InvestmentUploadsOrganizer } from "@/components/profile/InvestmentUploadsOrganizer";
import { ProfileInfoCard } from "@/components/profile/ProfileInfoCard";
import { PreferencesForm } from "@/components/settings/PreferencesForm";
import { CategoriesEditor } from "@/components/settings/CategoriesEditor";
import { FileText, TrendingUp } from "lucide-react";

export default function Profile() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-4 md:px-6 py-8">
        {/* Page Title */}
        <div className="mb-8 animate-fade-in">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            Profile
          </h2>
          <p className="text-muted-foreground mt-1">
            Your account info and uploaded files
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: User Info + Preferences + Categories */}
          <div className="space-y-6">
            <ProfileInfoCard />

            {/* Preferences */}
            <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
              <PreferencesForm />
            </div>

            {/* Categories */}
            <div className="animate-slide-up" style={{ animationDelay: '150ms' }}>
              <CategoriesEditor />
            </div>
          </div>

          {/* Right Column: Uploads */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bank Statements Section */}
            <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="text-base font-medium">Bank Statements</h3>
              </div>
              <MonthlyUploadsOrganizer />
            </div>

            {/* Investments Section */}
            <div className="animate-slide-up" style={{ animationDelay: '250ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="text-base font-medium">Investments & Savings</h3>
              </div>
              <InvestmentUploadsOrganizer />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container px-4 md:px-6 py-6">
          <p className="text-sm text-muted-foreground text-center">
            fint • Personal finance control
          </p>
        </div>
      </footer>
    </div>
  );
}
