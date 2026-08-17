import { useEffect, lazy, Suspense } from "react";
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
import { PeriodSelectionProvider } from "@/hooks/usePeriodSelection";
import { SUPPORTED_LANGUAGES } from "@/i18n/config";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Investments = lazy(() => import("./pages/Investments"));
const Account = lazy(() => import("./pages/Account"));
const MyData = lazy(() => import("./pages/MyData"));
const Planning = lazy(() => import("./pages/Planning"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
        <PeriodSelectionProvider>
          <BrowserRouter>
            <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
            <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            {/* History is now the Dashboard's "history" tab */}
            <Route path="/history" element={<Navigate to="/dashboard?tab=history" replace />} />
            {/* Backwards-compatible redirect from the previous /total route */}
            <Route path="/total" element={<Navigate to="/dashboard?tab=history" replace />} />
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
            <Route path="/planning/planned" element={<Navigate to="/planning?tab=planned" replace />} />
            <Route path="/planning/budgets" element={<Navigate to="/planning?tab=budgets" replace />} />
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
            {/* Categories is now the Data section's "categories" tab */}
            <Route path="/categories" element={<Navigate to="/my-data?tab=categories" replace />} />
            <Route path="/auth" element={
              <PublicRoute>
                <Auth />
              </PublicRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </PeriodSelectionProvider>
      </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
