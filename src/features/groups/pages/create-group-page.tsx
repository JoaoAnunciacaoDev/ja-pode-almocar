import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent } from "react";

import { createGroup } from "@/features/groups/api/groups-api";
import { AppShell } from "@/shared/components/app-shell";
import { inputClassName } from "@/shared/components/form-styles";

export function CreateGroupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: ({ name, institution }: { name: string; institution: string }) => createGroup(name, institution),
    onSuccess: async (groupId) => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      await navigate({ to: "/grupos/$groupId", params: { groupId } });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    createMutation.mutate({ name: String(data.get("name")), institution: String(data.get("institution")) });
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8 lg:py-12">
        <Link to="/grupos" className="text-sm font-bold text-[var(--tomato)]">← Voltar para meus grupos</Link>
        <div className="mt-6"><p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--tomato)]">Novo grupo</p><h1 className="mt-2 font-serif text-4xl font-bold">Quem vai comer junto?</h1><p className="mt-3 text-black/50">Dê um nome ao grupo. Você será o proprietário e poderá configurar horários e convites.</p></div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-[28px] border border-black/8 bg-white p-6 shadow-[0_18px_60px_rgba(42,35,28,.07)] sm:p-8">
          <label className="block text-sm font-bold">Nome do grupo<input className={inputClassName} name="name" placeholder="Ex.: Galera da Computação" maxLength={100} required /></label>
          <label className="block text-sm font-bold">Universidade ou campus<input className={inputClassName} name="institution" placeholder="Ex.: UEFS" maxLength={120} required /></label>
          {createMutation.error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{createMutation.error.message}</p>}
          <button disabled={createMutation.isPending} className="w-full rounded-2xl bg-[var(--ink)] px-5 py-3.5 text-sm font-bold text-white disabled:opacity-40">{createMutation.isPending ? "Criando…" : "Criar grupo"}</button>
        </form>
      </div>
    </AppShell>
  );
}
