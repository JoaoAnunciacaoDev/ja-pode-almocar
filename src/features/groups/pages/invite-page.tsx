import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { loadDemoGroups } from "@/features/groups/model/demo-groups";

export function InvitePage({ code }: { code: string }) {
  const [joined, setJoined] = useState(false);
  const group = loadDemoGroups().find((item) => item.inviteCode === code.toUpperCase());

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--sand)] px-5 py-10">
      <section className="w-full max-w-lg rounded-[32px] border border-black/8 bg-white p-7 text-center shadow-[0_24px_80px_rgba(42,35,28,.1)] sm:p-10">
        <span className="mx-auto grid size-16 place-items-center rounded-[22px] bg-[var(--blush)] text-3xl">🍽️</span>
        {group ? <><p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-[var(--tomato)]">Você recebeu um convite</p><h1 className="mt-2 font-serif text-3xl font-bold">{group.name}</h1><p className="mt-3 text-sm text-black/50">{group.institution} · {group.members.length} integrantes</p>{joined ? <div className="mt-8 rounded-2xl bg-[var(--sage)] p-5 text-white"><p className="font-bold">✓ Você entrou no grupo</p><Link to="/" className="mt-4 inline-block rounded-xl bg-white px-4 py-2 text-sm font-bold text-[var(--sage)]">Ver agenda</Link></div> : <button type="button" onClick={() => setJoined(true)} className="mt-8 w-full rounded-2xl bg-[var(--ink)] px-5 py-3.5 text-sm font-bold text-white">Entrar no grupo</button>}</> : <><h1 className="mt-7 font-serif text-3xl font-bold">Convite inválido</h1><p className="mt-3 text-sm text-black/50">Este link pode ter expirado ou sido revogado.</p><Link to="/grupos" className="mt-7 inline-block font-bold text-[var(--tomato)]">Ir para meus grupos</Link></>}
      </section>
    </main>
  );
}
