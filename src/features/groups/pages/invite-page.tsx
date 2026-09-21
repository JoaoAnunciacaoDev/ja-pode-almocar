import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Utensils } from "lucide-react";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { acceptInvite, fetchInvitePreview } from "@/features/groups/api/groups-api";

export function InvitePage({ code }: { code: string }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inviteQuery = useQuery({ queryKey: ["invite", code], queryFn: () => fetchInvitePreview(code), enabled: !loading && Boolean(user) });
  const group = inviteQuery.data;
  const acceptMutation = useMutation({
    mutationFn: () => acceptInvite(code),
    onSuccess: async (acceptedGroup) => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      await navigate({ to: "/g/$groupSlug", params: { groupSlug: acceptedGroup.slug } });
    },
  });

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--sand)] px-5 py-10">
      <section className="w-full max-w-lg rounded-[32px] border border-black/8 bg-white p-7 text-center shadow-[0_24px_80px_rgba(42,35,28,.1)] sm:p-10">
        <span className="mx-auto grid size-16 place-items-center rounded-[22px] bg-[var(--blush)] text-[var(--tomato-dark)]"><Utensils aria-hidden="true" className="size-8" /></span>
        {loading ? <p className="mt-7 text-sm text-black/45">Verificando sessão…</p> : !user ? <><h1 className="mt-7 font-serif text-3xl font-bold">Convite recebido</h1><p className="mt-3 text-sm text-black/50">Entre na sua conta para ver e aceitar este convite.</p><Link to="/entrar" search={{ invite: code }} className="mt-8 inline-block w-full rounded-2xl bg-[var(--ink)] px-5 py-3.5 text-sm font-bold text-white">Entrar ou criar conta</Link></> : inviteQuery.isLoading ? <p className="mt-7 text-sm text-black/45">Verificando convite…</p> : group ? <><p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-[var(--tomato)]">Você recebeu um convite</p><h1 className="mt-2 font-serif text-3xl font-bold">{group.groupName}</h1>{acceptMutation.error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{acceptMutation.error.message}</p>}<button disabled={acceptMutation.isPending} type="button" onClick={() => acceptMutation.mutate()} className="mt-8 w-full rounded-2xl bg-[var(--ink)] px-5 py-3.5 text-sm font-bold text-white disabled:opacity-40">{acceptMutation.isPending ? "Entrando…" : "Entrar no grupo"}</button></> : <><h1 className="mt-7 font-serif text-3xl font-bold">Convite inválido</h1><p className="mt-3 text-sm text-black/50">{inviteQuery.error?.message || "Este link pode ter expirado ou sido revogado."}</p><Link to="/grupos" className="mt-7 inline-block font-bold text-[var(--tomato)]">Ir para meus grupos</Link></>}
      </section>
    </main>
  );
}
