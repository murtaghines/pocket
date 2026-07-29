import { useEffect } from "react";
import { TopNav } from "@/components/layout/TopNav";
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
    <div className="min-h-screen bg-background dashboard-theme">
      <header className="hidden md:flex sticky top-0 z-30 h-[60px] items-center justify-center px-[30px] bg-card/85 backdrop-blur-[10px]">
        <TopNav />
      </header>
      <main className="w-full bg-card min-h-screen pb-20 md:pb-0">
        <CategoriesEditor />
      </main>
      <MobileBottomNav />
    </div>
  );
}
