import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { fetchGroupBySlug, getOrCreateInvite } from "@/features/groups/api/groups-api";
import { AppShell } from "@/shared/components/app-shell";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function GroupDetailPage({ groupSlug }: { groupSlug: string }) {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);
  const groupQuery = useQuery({ queryKey: ["groups", "slug", groupSlug], queryFn: () => fetchGroupBySlug(groupSlug) });
  const group = groupQuery.data;
  const isOwner = group?.ownerId === user?.id;
  const inviteQuery = useQuery({
    queryKey: ["groups", group?.id, "invite"],
    queryFn: () => getOrCreateInvite(group!.id),
    enabled: isOwner,
  });

  if (groupQuery.isLoading) return <AppShell><div className="mx-auto max-w-3xl px-5 py-16 text-center text-sm text-black/45">Carregando grupo…</div></AppShell>;
  if (!group || groupQuery.error) {
    return <AppShell><div className="mx-auto max-w-3xl px-5 py-16 text-center"><p className="text-4xl">🔍</p><h1 className="mt-5 font-serif text-3xl font-bold">Grupo não encontrado</h1><p className="mt-3 text-sm text-black/45">{groupQuery.error?.message}</p><Link to="/grupos" className="mt-6 inline-block font-bold text-[var(--tomato)]">Voltar para meus grupos</Link></div></AppShell>;
  }

  const inviteUrl = inviteQuery.data ? `${window.location.origin}/convite/${inviteQuery.data}` : "";

  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setFeedback("Link copiado para a área de transferência.");
  }

  async function shareInvite() {
    if (!inviteUrl) return;
    if (navigator.share) {
      await navigator.share({ title: `Entre no grupo ${group?.name}`, text: "Vamos combinar nossos horários do bandejão!", url: inviteUrl });
      setFeedback("Convite compartilhado.");
      return;
    }
    await copyInvite();
  }

  return (
    <AppShell groupSlug={group.slug}>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
        <Link to="/grupos" className="text-sm font-bold text-[var(--tomato)]">← Meus grupos</Link>
        <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--tomato)]">Grupo</p><h1 className="mt-2 font-serif text-4xl font-bold">{group.name}</h1><p className="mt-2 text-black/45">{group.institution || "Instituição não informada"}</p></div>
          <div className="flex flex-wrap gap-3"><Link to="/g/$groupSlug/rotinas" params={{ groupSlug: group.slug }} className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold">Minhas rotinas</Link>{isOwner && <Link to="/g/$groupSlug/configuracoes" params={{ groupSlug: group.slug }} className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold">Configurar</Link>}<Link to="/g/$groupSlug/hoje" params={{ groupSlug: group.slug }} className="rounded-2xl bg-[var(--ink)] px-4 py-3 text-sm font-bold text-white">Ver agenda</Link></div>
        </div>

        {feedback && <button type="button" onClick={() => setFeedback(null)} className="mt-6 flex w-full items-center justify-between rounded-2xl bg-[var(--sage)] px-4 py-3 text-left text-sm font-semibold text-white"><span>✓ {feedback}</span><span>×</span></button>}

        <div className={`mt-8 grid gap-6 ${isOwner ? "lg:grid-cols-[1fr_380px]" : ""}`}>
          <section className="rounded-[28px] border border-black/8 bg-white p-6 shadow-[0_18px_60px_rgba(42,35,28,.07)]">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-black/40">Participantes</p><h2 className="mt-1 text-xl font-bold">{group.members.length} {group.members.length === 1 ? "integrante" : "integrantes"}</h2></div>
            <ul className="mt-5 divide-y divide-black/7">
              {group.members.map((member) => <li key={member.id} className="flex items-center justify-between py-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-[var(--peach)] text-xs font-extrabold text-[var(--tomato-dark)]">{initials(member.name)}</span><div><p className="text-sm font-bold">{member.name}</p><p className="text-xs text-black/40">{member.role === "OWNER" ? "Proprietário" : "Integrante"}</p></div></div>{member.role === "OWNER" && <span title="Proprietário">👑</span>}</li>)}
            </ul>
          </section>

          {isOwner && <aside className="rounded-[28px] bg-[var(--sage)] p-6 text-white shadow-[0_18px_50px_rgba(49,91,72,.18)]">
            <p className="text-3xl">✉️</p><h2 className="mt-4 text-2xl font-bold">Convidar pessoas</h2><p className="mt-2 text-sm leading-6 text-white/65">Compartilhe este link. O convite e a entrada no grupo já são validados pelo backend.</p>
            <div className="mt-5 rounded-2xl bg-white/10 p-3"><p className="truncate font-mono text-xs text-white/75">{inviteQuery.isLoading ? "Gerando convite…" : inviteUrl}</p></div>
            {inviteQuery.error && <p className="mt-3 text-xs text-red-100">{inviteQuery.error.message}</p>}
            <div className="mt-3 grid grid-cols-2 gap-2"><button disabled={!inviteUrl} type="button" onClick={copyInvite} className="rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-[var(--sage)] disabled:opacity-40">Copiar link</button><button disabled={!inviteUrl} type="button" onClick={shareInvite} className="rounded-xl border border-white/25 px-3 py-2.5 text-xs font-bold disabled:opacity-40">Compartilhar</button></div>
          </aside>}
        </div>
      </div>
    </AppShell>
  );
}
