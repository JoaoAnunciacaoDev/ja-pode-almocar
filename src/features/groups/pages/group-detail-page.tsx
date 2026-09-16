import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, Search } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { fetchActiveGroupInvite, fetchGroupBySlug } from "@/features/groups/api/groups-api";
import { GroupInvitePanel } from "@/features/groups/components/group-invite-panel";
import { GroupMembersPanel } from "@/features/groups/components/group-members-panel";
import { AppShell } from "@/shared/components/app-shell";
import { useGroupRealtime } from "@/shared/hooks/use-group-realtime";

export function GroupDetailPage({ groupSlug }: { groupSlug: string }) {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);
  const groupQuery = useQuery({ queryKey: ["groups", "slug", groupSlug], queryFn: () => fetchGroupBySlug(groupSlug) });
  const group = groupQuery.data;
  useGroupRealtime(group?.id);
  const isOwner = group?.ownerId === user?.id;
  const inviteQuery = useQuery({
    queryKey: ["groups", group?.id, "invite"],
    queryFn: () => fetchActiveGroupInvite(group!.id),
    enabled: isOwner,
  });

  if (groupQuery.isLoading) return <AppShell><div className="mx-auto max-w-3xl px-5 py-16 text-center text-sm text-black/45">Carregando grupo…</div></AppShell>;
  if (!group || groupQuery.error) {
    return <AppShell><div className="mx-auto max-w-3xl px-5 py-16 text-center"><Search aria-hidden="true" className="mx-auto size-10 text-[var(--tomato)]" /><h1 className="mt-5 font-serif text-3xl font-bold">Grupo não encontrado</h1><p className="mt-3 text-sm text-black/45">{groupQuery.error?.message}</p><Link to="/grupos" className="mt-6 inline-block font-bold text-[var(--tomato)]">Voltar para meus grupos</Link></div></AppShell>;
  }

  return (
    <AppShell groupSlug={group.slug}>
      <div className="mx-auto min-w-0 max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
        <Link to="/grupos" className="text-sm font-bold text-[var(--tomato)]">← Meus grupos</Link>
        <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="min-w-0"><p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--tomato)]">Grupo</p><h1 className="mt-2 break-words font-serif text-4xl font-bold">{group.name}</h1><p className="mt-2 break-words text-black/45">{group.institution || "Instituição não informada"}</p></div>
          <div className="flex flex-wrap gap-3"><Link to="/g/$groupSlug/rotinas" params={{ groupSlug: group.slug }} className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold">Minhas rotinas</Link>{isOwner && <Link to="/g/$groupSlug/configuracoes" params={{ groupSlug: group.slug }} className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold">Configurar</Link>}<Link to="/g/$groupSlug/hoje" params={{ groupSlug: group.slug }} className="rounded-2xl bg-[var(--ink)] px-4 py-3 text-sm font-bold text-white">Ver agenda</Link></div>
        </div>

        {feedback && <button type="button" onClick={() => setFeedback(null)} className="mt-6 flex w-full items-center justify-between rounded-2xl bg-[var(--sage)] px-4 py-3 text-left text-sm font-semibold text-white"><span className="flex items-center gap-2"><Check aria-hidden="true" className="size-4" />{feedback}</span><span>×</span></button>}

        <div className={`mt-8 grid min-w-0 gap-6 ${isOwner ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]" : ""}`}>
          <GroupMembersPanel group={group} currentUserId={user!.id} onFeedback={setFeedback} />
          {isOwner && <GroupInvitePanel groupId={group.id} groupName={group.name} inviteCode={inviteQuery.data} loading={inviteQuery.isLoading} error={inviteQuery.error} onFeedback={setFeedback} />}
        </div>
      </div>
    </AppShell>
  );
}
