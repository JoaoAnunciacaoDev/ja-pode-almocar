import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <main className="grid min-h-screen place-items-center bg-[var(--sand)]"><p className="font-bold text-black/45">Carregando…</p></main>;
  if (!user) return <Navigate to="/entrar" replace />;
  return children;
}
