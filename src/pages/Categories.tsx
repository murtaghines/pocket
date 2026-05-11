import { useEffect } from "react";
import { Tags } from "lucide-react";
import { DataRail } from "@/components/layout/DataRail";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { CategoriesEditor } from "@/components/settings/CategoriesEditor";

export default function Categories() {
  useEffect(() => {
    document.body.classList.add("dashboard-theme");
    return () => {
      document.body.classList.remove("dashboard-theme");
    };
  }, []);

  return (
    <div className="min-h-screen bg-background dashboard-theme md:pl-24">
      <DataRail />
      <main className="w-full min-h-screen pb-20 md:pb-0 px-4 md:px-8 py-6 md:py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Tags className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Categories & Rules</h1>
              <p className="text-sm text-muted-foreground">
                Manage standard and custom categories, plus the rules that classify your transactions.
              </p>
            </div>
          </div>

          <div className="bg-card rounded-xl p-5 md:p-6">
            <CategoriesEditor />
          </div>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
