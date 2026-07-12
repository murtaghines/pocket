import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { NetworkStatusBanner } from "@/components/layout/NetworkStatusBanner";
import { LanguagePreferenceSync } from "@/components/layout/LanguagePreferenceSync";
import { MonthSelectionProvider } from "@/hooks/useMonthSelection";
import { SUPPORTED_LANGUAGES } from "@/i18n/config";
import Index from "./pages/Index";
import History from "./pages/History";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Investments from "./pages/Investments";
import Account from "./pages/Account";
import MyData from "./pages/MyData";
import Categories from "./pages/Categories";
import NotFound from "./pages/NotFound";
import ComingSoon from "./pages/ComingSoon";
import Planning from "./pages/Planning";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { i18n } = useTranslation();

  // For unauthenticated pages (login / sign up), always follow the browser language.
  useEffect(() => {
    if (loading || user) return;

    const browserLang = navigator.language?.split("-")[0] || "en";
    const supportedBrowserLang =
      SUPPORTED_LANGUAGES.find((l) => l.code === browserLang)?.code || "en";

    const currentLang = i18n.language?.split("-")[0] || "en";
    if (currentLang !== supportedBrowserLang) {
      i18n.changeLanguage(supportedBrowserLang);
    }
    localStorage.setItem("i18nextLng", supportedBrowserLang);
  }, [i18n, loading, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Allow the password recovery screen even if a session exists (Supabase
  // auto-logs the user in when they click the recovery link).
  const isResetFlow =
    typeof window !== "undefined" &&
    (window.location.search.includes("reset=true") ||
      window.location.hash.includes("type=recovery"));

  if (user && !isResetFlow) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
      <TooltipProvider>
        <NetworkStatusBanner />
        <LanguagePreferenceSync />
        <Toaster />
        <Sonner />
        <MonthSelectionProvider>
          <BrowserRouter>
            <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/history" element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            } />
            {/* Backwards-compatible redirect from the previous /total route */}
            <Route path="/total" element={<Navigate to="/history" replace />} />
            <Route path="/calendar" element={
              <ProtectedRoute>
                <ComingSoon title="Calendar" subtitle="A monthly view of your activity" />
              </ProtectedRoute>
            } />
            <Route path="/planning" element={
              <ProtectedRoute>
                <Planning />
              </ProtectedRoute>
            } />
            <Route path="/planning/planned" element={<Navigate to="/planning" replace />} />
            <Route path="/planning/budgets" element={<Navigate to="/planning" replace />} />
            <Route path="/investments" element={
              <ProtectedRoute>
                <Investments />
              </ProtectedRoute>
            } />
            <Route path="/account" element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            } />
            {/* Backwards-compatible redirect from the old /profile route */}
            <Route path="/profile" element={<Navigate to="/account" replace />} />
            <Route path="/my-data" element={
              <ProtectedRoute>
                <MyData />
              </ProtectedRoute>
            } />
            <Route path="/categories" element={
              <ProtectedRoute>
                <Categories />
              </ProtectedRoute>
            } />
            <Route path="/auth" element={
              <PublicRoute>
                <Auth />
              </PublicRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </MonthSelectionProvider>
      </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
