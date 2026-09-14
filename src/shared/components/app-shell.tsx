import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { GroupSwitcher } from "@/features/groups/components/group-switcher";
import { requireSupabaseClient } from "@/shared/utils/supabase-client";

export function AppShell({ children, groupSlug }: { children: ReactNode; groupSlug?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = String(user?.user_metadata.name || user?.email || "Usuário");
  const initials = displayName.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  async function signOut() {
    await requireSupabaseClient().auth.signOut();
    await navigate({ to: "/entrar", search: { invite: undefined } });
  }

  return (
    <main className="min-h-screen bg-[var(--sand)] text-[var(--ink)]">
      <header className="border-b border-black/8 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to={groupSlug ? "/g/$groupSlug/hoje" : "/grupos"} params={groupSlug ? { groupSlug } : {}} className="flex items-center gap-3 font-bold tracking-tight">
            <span className="grid size-10 place-items-center rounded-2xl bg-[var(--tomato)] text-xl shadow-[0_8px_24px_rgba(220,80,52,.22)]">🍽️</span>
            <span>Já pode almoçar?</span>
          </Link>
          <div className="flex items-center gap-3">
            {groupSlug && <GroupSwitcher groupSlug={groupSlug} />}
            <Link to="/grupos" className="hidden rounded-full px-3 py-2 text-sm font-bold text-black/55 hover:bg-black/5 md:block">Meus grupos</Link>
            {groupSlug && <Link to="/g/$groupSlug/configuracoes" params={{ groupSlug }} aria-label="Configurar grupo" className="grid size-9 place-items-center rounded-full text-sm font-bold text-[var(--tomato)] hover:bg-[var(--blush)] lg:flex lg:w-auto lg:px-3">
              <span className="lg:hidden">⚙️</span><span className="hidden lg:inline">Configurar grupo</span>
            </Link>}
            <details className="group relative">
              <summary title={displayName} aria-label="Abrir menu do perfil" className="grid size-10 list-none cursor-pointer place-items-center rounded-full bg-[var(--ink)] text-sm font-bold text-white transition hover:bg-[var(--tomato)] focus:outline-none focus:ring-4 focus:ring-[var(--tomato)]/15 [&::-webkit-details-marker]:hidden">{initials}</summary>
              <div className="absolute right-0 z-20 mt-3 w-64 overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_18px_60px_rgba(42,35,28,.16)]">
                <div className="border-b border-black/7 px-4 py-3">
                  <p className="truncate text-sm font-extrabold">{displayName}</p>
                  <p className="mt-0.5 truncate text-xs text-black/40">{user?.email}</p>
                </div>
                <Link to="/configuracoes/perfil" className="flex items-center gap-3 px-4 py-3 text-sm font-bold transition hover:bg-[var(--cream)]"><span aria-hidden="true">👤</span> Configurações do perfil</Link>
                <Link to="/configuracoes/notificacoes" className="flex items-center gap-3 px-4 py-3 text-sm font-bold transition hover:bg-[var(--cream)]"><span aria-hidden="true">🔔</span> Configurações de notificações</Link>
                <button type="button" onClick={signOut} className="flex w-full items-center gap-3 border-t border-black/7 px-4 py-3 text-left text-sm font-bold text-[var(--tomato-dark)] transition hover:bg-[var(--blush)]"><span aria-hidden="true">↪</span> Sair da conta</button>
              </div>
            </details>
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}
