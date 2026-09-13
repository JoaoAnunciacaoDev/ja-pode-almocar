import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { loadDemoGroups } from "@/features/groups/model/demo-groups";
import { AppShell } from "@/shared/components/app-shell";

export function GroupsPage() {
  const [groups] = useState(loadDemoGroups);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--tomato)]">Sua comunidade</p><h1 className="mt-2 font-serif text-4xl font-bold">Meus grupos</h1><p className="mt-3 text-black/50">Escolha um grupo para ver a agenda ou gerenciar seus integrantes.</p></div>
          <Link to="/grupos/novo" className="rounded-2xl bg-[var(--ink)] px-5 py-3 text-center text-sm font-bold text-white">+ Criar grupo</Link>
        </div>

        {groups.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Link key={group.id} to="/grupos/$groupId" params={{ groupId: group.id }} className="group rounded-[28px] border border-black/8 bg-white p-6 shadow-[0_18px_60px_rgba(42,35,28,.07)] transition hover:-translate-y-1 hover:border-[var(--tomato)]/30">
                <div className="flex items-start justify-between"><span className="grid size-12 place-items-center rounded-2xl bg-[var(--blush)] text-2xl">👥</span><span className="text-xl text-black/25 transition group-hover:translate-x-1 group-hover:text-[var(--tomato)]">→</span></div>
                <h2 className="mt-6 text-xl font-extrabold">{group.name}</h2><p className="mt-2 line-clamp-1 text-sm text-black/45">{group.institution}</p>
                <div className="mt-6 flex items-center justify-between border-t border-black/7 pt-4"><span className="text-xs font-bold text-black/45">{group.members.length} integrantes</span><span className="rounded-full bg-[var(--lemon)] px-2.5 py-1 text-[10px] font-extrabold uppercase">Proprietário</span></div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[28px] border border-dashed border-black/15 bg-white/50 p-12 text-center"><p className="text-4xl">👋</p><h2 className="mt-4 text-xl font-bold">Nenhum grupo ainda</h2><p className="mt-2 text-sm text-black/45">Crie o primeiro grupo e convide seus amigos.</p></div>
        )}
      </div>
    </AppShell>
  );
}
