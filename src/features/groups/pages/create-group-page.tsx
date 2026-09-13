import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { createDemoGroup, loadDemoGroups, saveDemoGroups } from "@/features/groups/model/demo-groups";
import { AppShell } from "@/shared/components/app-shell";
import { inputClassName } from "@/shared/components/form-styles";

export function CreateGroupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const data = new FormData(event.currentTarget);
    const group = createDemoGroup(String(data.get("name")), String(data.get("institution")));
    saveDemoGroups([...loadDemoGroups(), group]);
    await navigate({ to: "/grupos/$groupId", params: { groupId: group.id } });
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8 lg:py-12">
        <Link to="/grupos" className="text-sm font-bold text-[var(--tomato)]">← Voltar para meus grupos</Link>
        <div className="mt-6"><p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--tomato)]">Novo grupo</p><h1 className="mt-2 font-serif text-4xl font-bold">Quem vai comer junto?</h1><p className="mt-3 text-black/50">Dê um nome ao grupo. Você será o proprietário e poderá configurar horários e convites.</p></div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-[28px] border border-black/8 bg-white p-6 shadow-[0_18px_60px_rgba(42,35,28,.07)] sm:p-8">
          <label className="block text-sm font-bold">Nome do grupo<input className={inputClassName} name="name" placeholder="Ex.: Galera da Computação" maxLength={100} required /></label>
          <label className="block text-sm font-bold">Universidade ou campus<input className={inputClassName} name="institution" placeholder="Ex.: UEFS" maxLength={120} required /></label>
          <button disabled={loading} className="w-full rounded-2xl bg-[var(--ink)] px-5 py-3.5 text-sm font-bold text-white disabled:opacity-40">{loading ? "Criando…" : "Criar grupo"}</button>
        </form>
      </div>
    </AppShell>
  );
}
