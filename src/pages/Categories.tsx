import { useEffect } from "react";
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
      <main className="w-full bg-card min-h-screen pb-20 md:pb-0">
        <CategoriesEditor />
      </main>
      <MobileBottomNav />
    </div>
  );
}
