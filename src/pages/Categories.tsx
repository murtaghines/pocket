import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { CategoriesEditor } from "@/components/settings/CategoriesEditor";

export default function Categories() {
  const { t } = useTranslation("common");

  useEffect(() => {
    document.body.classList.add("dashboard-theme");
    return () => {
      document.body.classList.remove("dashboard-theme");
    };
  }, []);

  return (
    <div className="min-h-screen bg-background dashboard-theme">
      <MobileNav />
      <AppHeader title={t("navigation.categories", "Categories")} showSelectors={false} />
      <main className="w-full bg-card min-h-screen">
        <CategoriesEditor />
      </main>
    </div>
  );
}
