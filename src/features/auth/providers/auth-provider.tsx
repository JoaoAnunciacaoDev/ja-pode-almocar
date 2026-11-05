import { useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

import { AuthContext } from "@/features/auth/model/auth-context";
import { requireSupabaseClient } from "@/shared/utils/supabase-client";

function recordAccess() {
  const client = requireSupabaseClient();
  void client.rpc("record_user_access").then(() => {}, () => {});
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = requireSupabaseClient();
    void client.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
      if (data.user) {
        recordAccess();
      }
    });

    const { data } = client.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED")) {
        recordAccess();
      }
    });

    function handleFocus() {
      recordAccess();
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}
