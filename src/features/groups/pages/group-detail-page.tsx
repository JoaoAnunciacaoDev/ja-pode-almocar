import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { loadDemoGroups } from "@/features/groups/model/demo-groups";
import { AppShell } from "@/shared/components/app-shell";

export function GroupDetailPage({ groupId }: { groupId: string }) {
  const [group] = useState(() => loadDemoGroups().find((item) => item.id === groupId));
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!group) {
    return <AppShell><div className="mx-auto max-w-3xl px-5 py-16 text-center"><p className="text-4xl">🔍</p><h1 className="mt-5 font-serif text-3xl font-bold">Grupo não encontrado</h1><Link to="/grupos" className="mt-6 inline-block font-bold text-[var(--tomato)]">Voltar para meus grupos</Link></div></AppShell>;
  }

  const inviteUrl = `${window.location.origin}/convite/${group.inviteCode}`;

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
    setFeedback("Link copiado para a área de transferência.");
  }

  async function shareInvite() {
    if (navigator.share) {
      await navigator.share({ title: `Entre no grupo ${group?.name}`, text: "Vamos combinar nossos horários do bandejão!", url: inviteUrl });
      setFeedback("Convite compartilhado.");
      return;
    }
    await copyInvite();
  }

  function sendByEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setFeedback(`Convite simulado para ${String(data.get("email"))}.`);
    event.currentTarget.reset();
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
        <Link to="/grupos" className="text-sm font-bold text-[var(--tomato)]">← Meus grupos</Link>
        <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--tomato)]">Grupo</p><h1 className="mt-2 font-serif text-4xl font-bold">{group.name}</h1><p className="mt-2 text-black/45">{group.institution}</p></div>
          <div className="flex gap-3"><Link to="/grupo/configuracoes" className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold">Configurar</Link><Link to="/" className="rounded-2xl bg-[var(--ink)] px-4 py-3 text-sm font-bold text-white">Ver agenda</Link></div>
        </div>

        {feedback && <button type="button" onClick={() => setFeedback(null)} className="mt-6 flex w-full items-center justify-between rounded-2xl bg-[var(--sage)] px-4 py-3 text-left text-sm font-semibold text-white"><span>✓ {feedback}</span><span>×</span></button>}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="rounded-[28px] border border-black/8 bg-white p-6 shadow-[0_18px_60px_rgba(42,35,28,.07)]">
            <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-black/40">Participantes</p><h2 className="mt-1 text-xl font-bold">{group.members.length} integrantes</h2></div></div>
            <ul className="mt-5 divide-y divide-black/7">
              {group.members.map((member) => <li key={member.id} className="flex items-center justify-between py-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-[var(--peach)] text-xs font-extrabold text-[var(--tomato-dark)]">{member.initials}</span><div><p className="text-sm font-bold">{member.name}</p><p className="text-xs text-black/40">{member.role === "OWNER" ? "Proprietário" : "Integrante"}</p></div></div>{member.role === "OWNER" && <span title="Proprietário">👑</span>}</li>)}
            </ul>
          </section>

          <aside className="rounded-[28px] bg-[var(--sage)] p-6 text-white shadow-[0_18px_50px_rgba(49,91,72,.18)]">
            <p className="text-3xl">✉️</p><h2 className="mt-4 text-2xl font-bold">Convidar pessoas</h2><p className="mt-2 text-sm leading-6 text-white/65">Compartilhe o link ou simule o envio de um convite por e-mail.</p>
            <div className="mt-5 rounded-2xl bg-white/10 p-3"><p className="truncate font-mono text-xs text-white/75">{inviteUrl}</p></div>
            <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={copyInvite} className="rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-[var(--sage)]">Copiar link</button><button type="button" onClick={shareInvite} className="rounded-xl border border-white/25 px-3 py-2.5 text-xs font-bold">Compartilhar</button></div>
            <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-white/35"><span className="h-px flex-1 bg-white/15" />ou<span className="h-px flex-1 bg-white/15" /></div>
            <form onSubmit={sendByEmail} className="space-y-3"><input type="email" name="email" required placeholder="amigo@universidade.edu.br" className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/40" /><button className="w-full rounded-xl bg-[var(--tomato)] px-3 py-3 text-sm font-bold">Enviar convite</button></form>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
