import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { regenerateGroupInvite, revokeGroupInvite } from "@/features/groups/api/groups-api";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";

export function GroupInvitePanel({ groupId, groupName, inviteCode, loading, error, onFeedback }: {
  groupId: string;
  groupName: string;
  inviteCode: string | null | undefined;
  loading: boolean;
  error?: Error | null;
  onFeedback: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [confirmation, setConfirmation] = useState<"regenerate" | "revoke" | null>(null);
  const queryKey = ["groups", groupId, "invite"];
  const inviteUrl = inviteCode ? `${window.location.origin}/convite/${inviteCode}` : "";
  const regenerateMutation = useMutation({
    mutationFn: () => regenerateGroupInvite(groupId),
    onSuccess: (code) => {
      queryClient.setQueryData(queryKey, code);
      onFeedback(inviteCode ? "Novo link de convite gerado. O anterior não funciona mais." : "Link de convite gerado.");
    },
  });
  const revokeMutation = useMutation({
    mutationFn: () => revokeGroupInvite(groupId),
    onSuccess: () => {
      queryClient.setQueryData(queryKey, null);
      onFeedback("Convite revogado. O link anterior não pode mais ser usado.");
    },
  });

  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    onFeedback("Link copiado para a área de transferência.");
  }

  async function shareInvite() {
    if (!inviteUrl) return;
    if (navigator.share) {
      await navigator.share({ title: `Entre no grupo ${groupName}`, text: "Vamos combinar nossos horários do bandejão!", url: inviteUrl });
      onFeedback("Convite compartilhado.");
      return;
    }
    await copyInvite();
  }

  const mutationError = regenerateMutation.error || revokeMutation.error;
  const pending = regenerateMutation.isPending || revokeMutation.isPending;

  return (
    <><aside className="rounded-[28px] bg-[var(--sage)] p-6 text-white shadow-[0_18px_50px_rgba(49,91,72,.18)]">
      <p className="text-3xl">✉️</p><h2 className="mt-4 text-2xl font-bold">Convidar pessoas</h2><p className="mt-2 text-sm leading-6 text-white/65">Compartilhe o link com quem deve entrar no grupo. Apenas um convite fica ativo por vez.</p>
      <div className="mt-5 rounded-2xl bg-white/10 p-3"><p className="truncate font-mono text-xs text-white/75">{loading ? "Carregando convite…" : inviteUrl || "Nenhum convite ativo"}</p></div>
      {(error || mutationError) && <p className="mt-3 text-xs text-red-100">{error?.message || mutationError?.message}</p>}
      {inviteUrl ? <>
        <div className="mt-3 grid grid-cols-2 gap-2"><button disabled={pending} type="button" onClick={copyInvite} className="rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-[var(--sage)] disabled:opacity-40">Copiar link</button><button disabled={pending} type="button" onClick={shareInvite} className="rounded-xl border border-white/25 px-3 py-2.5 text-xs font-bold disabled:opacity-40">Compartilhar</button></div>
        <div className="mt-2 grid grid-cols-2 gap-2"><button disabled={pending} type="button" onClick={() => setConfirmation("regenerate")} className="rounded-xl border border-white/25 px-3 py-2.5 text-xs font-bold disabled:opacity-40">Gerar novo</button><button disabled={pending} type="button" onClick={() => setConfirmation("revoke")} className="rounded-xl bg-white/10 px-3 py-2.5 text-xs font-bold text-red-100 disabled:opacity-40">Revogar</button></div>
      </> : <button disabled={pending || loading} type="button" onClick={() => regenerateMutation.mutate()} className="mt-3 w-full rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-[var(--sage)] disabled:opacity-40">{regenerateMutation.isPending ? "Gerando…" : "Gerar convite"}</button>}
    </aside><ConfirmDialog open={confirmation !== null} title={confirmation === "regenerate" ? "Gerar um novo convite?" : "Revogar este convite?"} description={confirmation === "regenerate" ? "O link atual deixará de funcionar assim que o novo convite for criado." : "O link deixará de funcionar imediatamente e ninguém poderá mais usá-lo."} confirmLabel={confirmation === "regenerate" ? "Gerar novo link" : "Revogar convite"} pending={pending} tone={confirmation === "revoke" ? "danger" : "default"} onCancel={() => setConfirmation(null)} onConfirm={() => { const action = confirmation; setConfirmation(null); if (action === "regenerate") regenerateMutation.mutate(); else if (action === "revoke") revokeMutation.mutate(); }} /></>
  );
}
