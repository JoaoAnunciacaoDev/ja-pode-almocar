import { useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

import { AuthContext } from "@/features/auth/model/auth-context";
import { requireSupabaseClient } from "@/shared/utils/supabase-client";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = requireSupabaseClient();
    void client.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}
