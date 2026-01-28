import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  restoreSessionFromSessionStorage,
  clearSessionOnUnload,
  getRememberPreference,
  clearAuthStorage,
} from "@/lib/sessionStorage";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from sessionStorage if user didn't check "remember me"
    restoreSessionFromSessionStorage();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes (single subscription for entire app)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Clear session on browser close if "remember me" was not checked
    const handleUnload = () => {
      if (!getRememberPreference()) {
        clearSessionOnUnload();
      }
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  const signOut = async () => {
    // Clear local state immediately, even if API call fails (e.g., session expired)
    try {
      // Try a full sign out first (revokes refresh token when possible).
      await supabase.auth.signOut();
    } catch {
      try {
        // Fallback: local scope avoids backend 403s when the session is already gone.
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // Ignore errors - session may already be gone
      }
    } finally {
      // Ensure no session can be restored from either storage.
      clearAuthStorage();
    }
    setUser(null);
    setSession(null);
    setLoading(false);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, session, loading, signOut }),
    [user, session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}
