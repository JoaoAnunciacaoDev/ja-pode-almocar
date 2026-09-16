import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Hand, Users } from "lucide-react";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { fetchGroups } from "@/features/groups/api/groups-api";
import { AppShell } from "@/shared/components/app-shell";

export function GroupsPage() {
  const { user } = useAuth();
  const groupsQuery = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });
  const groups = groupsQuery.data ?? [];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--tomato)]">Sua comunidade</p><h1 className="mt-2 font-serif text-4xl font-bold">Meus grupos</h1><p className="mt-3 text-black/50">Escolha um grupo para ver a agenda ou gerenciar seus integrantes.</p></div>
          <Link to="/grupos/novo" className="rounded-2xl bg-[var(--ink)] px-5 py-3 text-center text-sm font-bold text-white">+ Criar grupo</Link>
        </div>

        {groupsQuery.isLoading && <div className="mt-8 rounded-[28px] bg-white p-10 text-center text-sm text-black/45">Carregando seus grupos…</div>}
        {groupsQuery.error && <div className="mt-8 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{groupsQuery.error.message}</div>}
        {!groupsQuery.isLoading && !groupsQuery.error && (groups.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Link key={group.id} to="/g/$groupSlug" params={{ groupSlug: group.slug }} className="group rounded-[28px] border border-black/8 bg-white p-6 shadow-[0_18px_60px_rgba(42,35,28,.07)] transition hover:-translate-y-1 hover:border-[var(--tomato)]/30">
                <div className="flex items-start justify-between"><span className="grid size-12 place-items-center rounded-2xl bg-[var(--blush)] text-[var(--tomato-dark)]"><Users aria-hidden="true" className="size-6" /></span><ArrowRight aria-hidden="true" className="size-5 text-black/25 transition group-hover:translate-x-1 group-hover:text-[var(--tomato)]" /></div>
                <h2 className="mt-6 text-xl font-extrabold">{group.name}</h2><p className="mt-2 line-clamp-1 text-sm text-black/45">{group.institution || "Instituição não informada"}</p>
                <div className="mt-6 flex items-center justify-between border-t border-black/7 pt-4"><span className="text-xs font-bold text-black/45">{group.memberCount} {group.memberCount === 1 ? "integrante" : "integrantes"}</span>{group.ownerId === user?.id && <span className="rounded-full bg-[var(--lemon)] px-2.5 py-1 text-[10px] font-extrabold uppercase">Proprietário</span>}</div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[28px] border border-dashed border-black/15 bg-white/50 p-12 text-center"><Hand aria-hidden="true" className="mx-auto size-10 text-[var(--tomato)]" /><h2 className="mt-4 text-xl font-bold">Nenhum grupo ainda</h2><p className="mt-2 text-sm text-black/45">Crie o primeiro grupo e convide seus amigos.</p></div>
        ))}
      </div>
    </AppShell>
  );
}
