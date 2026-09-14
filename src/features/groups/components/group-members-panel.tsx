import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { deleteGroup, leaveGroup, removeGroupMember, transferGroupOwnership, type GroupDetails } from "@/features/groups/api/groups-api";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";

type Confirmation = { title: string; description: string; confirmLabel: string; action: () => void };

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function GroupMembersPanel({ group, currentUserId, onFeedback }: { group: GroupDetails; currentUserId: string; onFeedback: (message: string) => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isOwner = group.ownerId === currentUserId;
  const members = group.members.filter((member) => member.role === "MEMBER");
  const [newOwnerId, setNewOwnerId] = useState(members[0]?.id ?? "");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const selectedNewOwnerId = members.some((member) => member.id === newOwnerId) ? newOwnerId : members[0]?.id ?? "";

  async function refreshGroup() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["groups"] }),
      queryClient.invalidateQueries({ queryKey: ["groups", "slug", group.slug] }),
    ]);
  }

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeGroupMember(group.id, userId),
    onSuccess: async () => { await refreshGroup(); onFeedback("Integrante removido do grupo."); },
  });
  const transferMutation = useMutation({
    mutationFn: () => transferGroupOwnership(group.id, selectedNewOwnerId),
    onSuccess: async () => { await refreshGroup(); onFeedback("Propriedade transferida. Você agora é integrante do grupo."); },
  });
  const leaveMutation = useMutation({
    mutationFn: () => leaveGroup(group.id),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["groups"] }); await navigate({ to: "/grupos" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteGroup(group.id),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["groups"] }); await navigate({ to: "/grupos" }); },
  });
  const error = removeMutation.error || transferMutation.error || leaveMutation.error || deleteMutation.error;
  const pending = removeMutation.isPending || transferMutation.isPending || leaveMutation.isPending || deleteMutation.isPending;

  return <div className="space-y-6">
    <section className="rounded-[28px] border border-black/8 bg-white p-6 shadow-[0_18px_60px_rgba(42,35,28,.07)]">
      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-black/40">Participantes</p><h2 className="mt-1 text-xl font-bold">{group.members.length} {group.members.length === 1 ? "integrante" : "integrantes"}</h2></div>
      <ul className="mt-5 divide-y divide-black/7">
        {group.members.map((member) => <li key={member.id} className="flex items-center justify-between gap-3 py-4"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--peach)] text-xs font-extrabold text-[var(--tomato-dark)]">{initials(member.name)}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{member.name}</p><p className="text-xs text-black/40">{member.role === "OWNER" ? "Proprietário" : "Integrante"}</p></div></div>{member.role === "OWNER" ? <span title="Proprietário">👑</span> : isOwner && <button disabled={pending} type="button" onClick={() => setConfirmation({ title: `Remover ${member.name}?`, description: "Os horários e rotinas dessa pessoa neste grupo também serão apagados.", confirmLabel: "Remover integrante", action: () => removeMutation.mutate(member.id) })} className="shrink-0 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-40">Remover</button>}</li>)}
      </ul>
    </section>

    <section className="rounded-[28px] border border-red-200 bg-white p-6">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">Gestão do grupo</p>
      {isOwner ? <>
        <div className="mt-4"><h2 className="font-extrabold">Transferir propriedade</h2><p className="mt-1 text-sm leading-5 text-black/45">A pessoa escolhida passa a controlar integrantes, convites e configurações. Você permanece como integrante.</p>{members.length ? <div className="mt-3 flex flex-col gap-2 sm:flex-row"><select value={selectedNewOwnerId} onChange={(event) => setNewOwnerId(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm">{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><button disabled={pending || !selectedNewOwnerId} type="button" onClick={() => { const member = members.find((item) => item.id === selectedNewOwnerId); if (member) setConfirmation({ title: `Transferir para ${member.name}?`, description: "Essa pessoa passará a controlar integrantes, convites e configurações. Você permanecerá no grupo como integrante.", confirmLabel: "Transferir propriedade", action: () => transferMutation.mutate() }); }} className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-bold disabled:opacity-40">Transferir</button></div> : <p className="mt-3 text-sm text-black/40">Convide outro integrante antes de transferir.</p>}</div>
        <div className="mt-6 border-t border-red-100 pt-5"><h2 className="font-extrabold text-red-700">Excluir grupo</h2><p className="mt-1 text-sm leading-5 text-black/45">Apaga permanentemente integrantes, convites, rotinas e horários deste grupo.</p><button disabled={pending} type="button" onClick={() => setConfirmation({ title: `Excluir “${group.name}”?`, description: "Integrantes, convites, rotinas e horários serão apagados permanentemente. Esta ação não pode ser desfeita.", confirmLabel: "Excluir grupo", action: () => deleteMutation.mutate() })} className="mt-3 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">Excluir grupo</button></div>
      </> : <div className="mt-4"><h2 className="font-extrabold">Sair do grupo</h2><p className="mt-1 text-sm leading-5 text-black/45">Sua participação, seus horários e suas rotinas neste grupo serão apagados.</p><button disabled={pending} type="button" onClick={() => setConfirmation({ title: `Sair de “${group.name}”?`, description: "Sua participação, seus horários e suas rotinas neste grupo serão apagados.", confirmLabel: "Sair do grupo", action: () => leaveMutation.mutate() })} className="mt-3 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">Sair do grupo</button></div>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error.message}</p>}
    </section>
    <ConfirmDialog open={Boolean(confirmation)} title={confirmation?.title ?? ""} description={confirmation?.description ?? ""} confirmLabel={confirmation?.confirmLabel ?? "Confirmar"} pending={pending} tone="danger" onCancel={() => setConfirmation(null)} onConfirm={() => { const action = confirmation?.action; setConfirmation(null); action?.(); }} />
  </div>;
}
