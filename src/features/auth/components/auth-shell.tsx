import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteFooter } from "@/shared/components/site-footer";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ eyebrow, title, description, children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--sand)]"><main className="grid flex-1 lg:grid-cols-[1fr_1.05fr]">
      <section className="hidden overflow-hidden bg-[var(--sage)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="flex items-center gap-3 font-bold"><span className="grid size-11 place-items-center rounded-2xl bg-[var(--tomato)] text-xl">🍽️</span>Já pode almoçar?</Link>
        <div className="max-w-lg"><p className="text-6xl">🥘</p><h2 className="mt-7 font-serif text-5xl font-bold leading-tight">Menos mensagens.<br />Mais almoços juntos.</h2><p className="mt-5 max-w-md leading-7 text-white/65">Organize os horários do bandejão e descubra rapidamente quem vai em cada refeição.</p></div>
        <p className="text-sm text-white/45">Agenda compartilhada para a vida universitária.</p>
      </section>
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-10 flex items-center gap-3 font-bold lg:hidden"><span className="grid size-10 place-items-center rounded-2xl bg-[var(--tomato)]">🍽️</span>Já pode almoçar?</Link>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--tomato)]">{eyebrow}</p>
          <h1 className="mt-2 font-serif text-4xl font-bold">{title}</h1>
          <p className="mt-3 leading-6 text-black/50">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main><SiteFooter /></div>
  );
}
